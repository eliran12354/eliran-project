import { supabase } from './supabase'
import type { Property, Project, Deal, GovmapPlan, UrbanRenewalLocation, UrbanRenewalProject, TelegramDocument } from './supabase'

// Properties queries
export const propertyQueries = {
  // Get all properties
  async getAll() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Property[]
  },

  // Get properties by location (within radius)
  async getByLocation(lat: number, lng: number, radiusKm: number = 10) {
    const { data, error } = await supabase
      .rpc('get_properties_nearby', {
        lat,
        lng,
        radius_km: radiusKm
      })
    
    if (error) throw error
    return data as Property[]
  },

  // Get properties by filters
  async getFiltered(filters: {
    property_type?: string
    min_price?: number
    max_price?: number
    min_area?: number
    max_area?: number
    bedrooms?: number
    status?: string
  }) {
    let query = supabase.from('properties').select('*')
    
    if (filters.property_type) {
      query = query.eq('property_type', filters.property_type)
    }
    if (filters.min_price) {
      query = query.gte('price', filters.min_price)
    }
    if (filters.max_price) {
      query = query.lte('price', filters.max_price)
    }
    if (filters.min_area) {
      query = query.gte('area_sqm', filters.min_area)
    }
    if (filters.max_area) {
      query = query.lte('area_sqm', filters.max_area)
    }
    if (filters.bedrooms) {
      query = query.eq('bedrooms', filters.bedrooms)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Property[]
  },

  // Get featured properties
  async getFeatured() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('is_featured', true)
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(6)
    
    if (error) throw error
    return data as Property[]
  },

  // Get property by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Property
  },

  // Add new property
  async create(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single()
    
    if (error) throw error
    return data as Property
  },

  // Update property
  async update(id: string, updates: Partial<Property>) {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Property
  },

  // Delete property
  async delete(id: string) {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Projects queries
export const projectQueries = {
  // Get all projects
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Project[]
  },

  // Get hot projects
  async getHot() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('is_hot', true)
      .eq('status', 'construction')
      .order('created_at', { ascending: false })
      .limit(6)
    
    if (error) throw error
    return data as Project[]
  },

  // Get projects by location
  async getByLocation(lat: number, lng: number, radiusKm: number = 10) {
    const { data, error } = await supabase
      .rpc('get_projects_nearby', {
        lat,
        lng,
        radius_km: radiusKm
      })
    
    if (error) throw error
    return data as Project[]
  },

  // Get project by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_units(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Add new project
  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single()
    
    if (error) throw error
    return data as Project
  }
}

// Favorites queries
export const favoriteQueries = {
  // Get user favorites
  async getUserFavorites(userId: string) {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        properties(*),
        projects(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Add to favorites
  async add(userId: string, propertyId?: string, projectId?: string) {
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        property_id: propertyId,
        project_id: projectId
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Remove from favorites
  async remove(userId: string, propertyId?: string, projectId?: string) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .eq('project_id', projectId)
    
    if (error) throw error
  }
}

// Deals queries
export const dealQueries = {
  // Get all deals
  async getAll() {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('deal_date', { ascending: false })
      .limit(10000) // Increase limit to get more records
    
    if (error) throw error
    return data as Deal[]
  },

  // Get all deals with pagination (for large datasets)
  async getAllPaginated(pageSize: number = 1000) {
    let allDeals: Deal[] = []
    let from = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('deal_date', { ascending: false })
        .range(from, from + pageSize - 1)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        allDeals = [...allDeals, ...data]
        from += pageSize
        hasMore = data.length === pageSize
      } else {
        hasMore = false
      }
    }
    
    return allDeals
  },

  // Get deals by city
  async getByCity(cityName: string) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('city_name', cityName)
      .order('deal_date', { ascending: false })
    
    if (error) throw error
    return data as Deal[]
  },

  // Get deals with filters
  async getFiltered(
    filters: {
      city_name?: string
      property_type?: string
      min_price?: number
      max_price?: number
      min_area?: number
      max_area?: number
      min_rooms?: number
      max_rooms?: number
      date_from?: string
      date_to?: string
    },
    page: number = 1,
    pageSize: number = 150,
    sortBy: string = 'deal_date',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    let query = supabase.from('deals').select('*', { count: 'exact' })
    
    if (filters.city_name) {
      query = query.eq('city_name', filters.city_name)
    }
    if (filters.property_type) {
      query = query.eq('property_type', filters.property_type)
    }
    if (filters.min_price) {
      query = query.gte('price_nis', filters.min_price)
    }
    if (filters.max_price) {
      query = query.lte('price_nis', filters.max_price)
    }
    if (filters.min_area) {
      query = query.gte('area_m2', filters.min_area)
    }
    if (filters.max_area) {
      query = query.lte('area_m2', filters.max_area)
    }
    if (filters.min_rooms) {
      query = query.gte('rooms', filters.min_rooms)
    }
    if (filters.max_rooms) {
      query = query.lte('rooms', filters.max_rooms)
    }
    if (filters.date_from) {
      query = query.gte('deal_date', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('deal_date', filters.date_to)
    }
    
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    
    if (error) throw error
    return { data: data as Deal[], total: count || 0 }
  },

  // Get recent deals
  async getRecent(limit: number = 10) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('deal_date', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data as Deal[]
  },

  // Get deals statistics by city
  async getCityStats() {
    const { data, error } = await supabase
      .from('deals')
      .select('city_name, price_nis, area_m2, deal_date')
      .not('price_nis', 'is', null)
      .not('area_m2', 'is', null)
    
    if (error) throw error
    return data
  },

  // Search deals by address or block/parcel
  async search(
    searchTerm: string,
    page: number = 1,
    pageSize: number = 150,
    sortBy: string = 'deal_date',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error, count } = await supabase
      .from('deals')
      .select('*', { count: 'exact' })
      .or(`address.ilike.%${searchTerm}%,block_parcel_subparcel.ilike.%${searchTerm}%`)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    
    if (error) throw error
    return { data: data as Deal[], total: count || 0 }
  }
}

// Govmap Plans queries
export const govmapQueries = {
  // Get all govmap plans
  async getAll() {
    const { data, error } = await supabase
      .from('govmap_plans')
      .select('*')
      .order('fetched_at', { ascending: false })
    
    if (error) throw error
    return data as GovmapPlan[]
  },

  // Get govmap plans with pagination
  async getPaginated(page: number = 1, limit: number = 100) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('govmap_plans')
      .select('*', { count: 'exact' })
      .order('fetched_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    
    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  },

  // Get plans by tochnit (plan name)
  async getByTochnit(tochnit: string) {
    const { data, error } = await supabase
      .from('govmap_plans')
      .select('*')
      .ilike('tochnit', `%${tochnit}%`)
      .order('fetched_at', { ascending: false })
    
    if (error) throw error
    return data as GovmapPlan[]
  },

  // Get plans by migrash (neighborhood)
  async getByMigrash(migrash: string) {
    const { data, error } = await supabase
      .from('govmap_plans')
      .select('*')
      .ilike('migrash', `%${migrash}%`)
      .order('fetched_at', { ascending: false })
    
    if (error) throw error
    return data as GovmapPlan[]
  },

  // Get plans by mishasava (settlement code)
  async getByMishasava(mishasava: number) {
    const { data, error } = await supabase
      .from('govmap_plans')
      .select('*')
      .eq('mishasava', mishasava)
      .order('fetched_at', { ascending: false })
    
    if (error) throw error
    return data as GovmapPlan[]
  },

  // Search plans
  async search(query: string) {
    const { data, error } = await supabase
      .from('govmap_plans')
      .select('*')
      .or(`tochnit.ilike.%${query}%,migrash.ilike.%${query}%,raw->>planName.ilike.%${query}%,raw->>cityText.ilike.%${query}%`)
      .order('fetched_at', { ascending: false })
    
    if (error) throw error
    return data as GovmapPlan[]
  },

  // Get plans with coordinates (for mapping)
  async getWithCoordinates() {
    const { data, error } = await supabase
      .from('govmap_plans')
      .select('*')
      .not('coordinates', 'is', null)
      .not('bbox', 'is', null)
      .order('fetched_at', { ascending: false })
    
    if (error) throw error
    return data as GovmapPlan[]
  },

  // Get plan by objectid
  async getByObjectId(objectid: number) {
    const { data, error } = await supabase
      .from('govmap_plans')
      .select('*')
      .eq('objectid', objectid)
      .single()
    
    if (error) throw error
    return data as GovmapPlan
  }
}

// Urban Renewal Locations queries
export const urbanRenewalQueries = {
  // Get all urban renewal locations
  async getAll() {
    const { data, error } = await supabase
      .from('urban_renewal_locations')
      .select('*')
      .order('id', { ascending: true })
    
    if (error) throw error
    return data as UrbanRenewalLocation[]
  },

  // Get urban renewal locations with pagination
  async getPaginated(page: number = 1, limit: number = 100) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('urban_renewal_locations')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(from, to)
    
    if (error) throw error
    
    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  },

  // Get locations by object_id
  async getByObjectId(object_id: number) {
    const { data, error } = await supabase
      .from('urban_renewal_locations')
      .select('*')
      .eq('object_id', object_id)
      .order('id', { ascending: true })
    
    if (error) throw error
    return data as UrbanRenewalLocation[]
  },

  // Get locations by layer_id
  async getByLayerId(layer_id: number) {
    const { data, error } = await supabase
      .from('urban_renewal_locations')
      .select('*')
      .eq('layer_id', layer_id)
      .order('id', { ascending: true })
    
    if (error) throw error
    return data as UrbanRenewalLocation[]
  },

  // Get locations with coordinates (for mapping)
  async getWithCoordinates() {
    const { data, error } = await supabase
      .from('urban_renewal_locations')
      .select('*')
      .not('coordinates', 'is', null)
      .order('id', { ascending: true })
    
    if (error) throw error
    return data as UrbanRenewalLocation[]
  },

  // Get location by id
  async getById(id: number) {
    const { data, error } = await supabase
      .from('urban_renewal_locations')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as UrbanRenewalLocation
  }
}

// Urban Renewal Projects queries
export const urbanRenewalProjectQueries = {
  // Get all urban renewal projects
  async getAll() {
    const { data, error } = await supabase
      .from('urban_renewal_projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as UrbanRenewalProject[]
  },

  // Get urban renewal projects with pagination
  async getPaginated(page: number = 1, limit: number = 100) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('urban_renewal_projects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    
    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  },

  // Get projects by city
  async getByCity(cityName: string) {
    const { data, error } = await supabase
      .from('urban_renewal_projects')
      .select('*')
      .ilike('city_name', `%${cityName}%`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as UrbanRenewalProject[]
  },

  // Get projects by type
  async getByType(projectType: string) {
    const { data, error } = await supabase
      .from('urban_renewal_projects')
      .select('*')
      .ilike('project_type', `%${projectType}%`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as UrbanRenewalProject[]
  },

  // Get projects by status
  async getByStatus(statusCode: number) {
    const { data, error } = await supabase
      .from('urban_renewal_projects')
      .select('*')
      .eq('status_code', statusCode)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as UrbanRenewalProject[]
  },

  // Search projects
  async search(
    query: string,
    page: number = 1,
    pageSize: number = 50,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error, count } = await supabase
      .from('urban_renewal_projects')
      .select('*', { count: 'exact' })
      .or(`project_name.ilike.%${query}%,city_name.ilike.%${query}%,plan_name.ilike.%${query}%,project_number.ilike.%${query}%`)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    
    if (error) throw error
    return { data: data as UrbanRenewalProject[], total: count || 0 }
  },

  // Get projects with filters
  async getFiltered(
    filters: {
      city_name?: string
      project_type?: string
      project_subtype?: string
      status_code?: number
      min_units?: number
      max_units?: number
    },
    page: number = 1,
    pageSize: number = 50,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    let query = supabase.from('urban_renewal_projects').select('*', { count: 'exact' })
    
    if (filters.city_name) {
      query = query.ilike('city_name', `%${filters.city_name}%`)
    }
    if (filters.project_type) {
      query = query.ilike('project_type', `%${filters.project_type}%`)
    }
    if (filters.project_subtype) {
      query = query.ilike('project_subtype', `%${filters.project_subtype}%`)
    }
    if (filters.status_code) {
      query = query.eq('status_code', filters.status_code)
    }
    if (filters.min_units) {
      query = query.gte('proposed_units', filters.min_units)
    }
    if (filters.max_units) {
      query = query.lte('proposed_units', filters.max_units)
    }
    
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    
    if (error) throw error
    return { data: data as UrbanRenewalProject[], total: count || 0 }
  },

  // Get project by id
  async getById(id: number) {
    const { data, error } = await supabase
      .from('urban_renewal_projects')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as UrbanRenewalProject
  },

  // Get project by object_id
  async getByObjectId(objectId: number) {
    const { data, error } = await supabase
      .from('urban_renewal_projects')
      .select('*')
      .eq('object_id', objectId)
      .single()
    
    if (error) throw error
    return data as UrbanRenewalProject
  }
}

// Telegram Documents queries
export const telegramDocumentQueries = {
  // Get all telegram documents
  async getAll() {
    const { data, error } = await supabase
      .from('telegram_documents')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as TelegramDocument[]
  },

  // Get telegram documents with pagination
  async getPaginated(page: number = 1, pageSize: number = 50) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error, count } = await supabase
      .from('telegram_documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    
    return {
      data: data as TelegramDocument[],
      total: count || 0
    }
  },

  // Search documents
  async search(
    query: string,
    page: number = 1,
    pageSize: number = 50,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error, count } = await supabase
      .from('telegram_documents')
      .select('*', { count: 'exact' })
      .or(`location_city.ilike.%${query}%,location_address.ilike.%${query}%,document_type.ilike.%${query}%,court_file_number.ilike.%${query}%,parcel_number.ilike.%${query}%,block_number.ilike.%${query}%,contact_name.ilike.%${query}%,contact_phone.ilike.%${query}%`)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    
    if (error) throw error
    return { data: data as TelegramDocument[], total: count || 0 }
  },

  // Get documents with filters
  async getFiltered(
    filters: {
      document_type?: string
      location_city?: string
      property_type?: string
      processing_status?: string
      min_total_area?: number
      max_total_area?: number
      min_deposit?: number
      max_deposit?: number
    },
    page: number = 1,
    pageSize: number = 50,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    let query = supabase.from('telegram_documents').select('*', { count: 'exact' })
    
    if (filters.document_type) {
      query = query.eq('document_type', filters.document_type)
    }
    if (filters.location_city) {
      query = query.ilike('location_city', `%${filters.location_city}%`)
    }
    if (filters.property_type) {
      query = query.eq('property_type', filters.property_type)
    }
    if (filters.processing_status) {
      query = query.eq('processing_status', filters.processing_status)
    }
    if (filters.min_total_area) {
      query = query.gte('total_area_sqm', filters.min_total_area)
    }
    if (filters.max_total_area) {
      query = query.lte('total_area_sqm', filters.max_total_area)
    }
    if (filters.min_deposit) {
      query = query.gte('deposit_amount', filters.min_deposit)
    }
    if (filters.max_deposit) {
      query = query.lte('deposit_amount', filters.max_deposit)
    }
    
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    
    if (error) throw error
    return { data: data as TelegramDocument[], total: count || 0 }
  },

  // Get document by id
  async getById(id: number) {
    const { data, error } = await supabase
      .from('telegram_documents')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as TelegramDocument
  }
}

// Search queries
export const searchQueries = {
  // Save search history
  async saveSearch(userId: string, searchData: any) {
    const { data, error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        ...searchData
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get user search history
  async getUserHistory(userId: string) {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    return data
  }
}

