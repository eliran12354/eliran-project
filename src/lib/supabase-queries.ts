import { supabase } from './supabase'
import type { Property, Project, Deal, GovmapPlan, UrbanRenewalLocation, UrbanRenewalProject, TelegramDocument, ConstructionProgressRecord, UrbanRenewalCompound, TalarPrep, GovmapGush } from './supabase'

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

// Urban Renewal Mitchamim Rashut queries
export const urbanRenewalMitchamimQueries = {
  // Get all mitchamim
  async getAll() {
    const { data, error } = await supabase
      .from('urban_renewal_mitchamim_rashut')
      .select('*')
      .order('imported_at', { ascending: false })
    
    if (error) throw error
    return data as any[]
  },

  // Get mitchamim with pagination
  async getPaginated(page: number = 1, limit: number = 100) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('urban_renewal_mitchamim_rashut')
      .select('*', { count: 'exact' })
      .order('imported_at', { ascending: false })
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

  // Get mitchamim by city (yeshuv)
  async getByCity(cityName: string) {
    const { data, error } = await supabase
      .from('urban_renewal_mitchamim_rashut')
      .select('*')
      .ilike('yeshuv', `%${cityName}%`)
      .order('imported_at', { ascending: false })
    
    if (error) throw error
    return data as any[]
  },

  // Get mitchamim by status
  async getByStatus(status: string) {
    const { data, error } = await supabase
      .from('urban_renewal_mitchamim_rashut')
      .select('*')
      .eq('status', status)
      .order('imported_at', { ascending: false })
    
    if (error) throw error
    return data as any[]
  },

  // Search mitchamim
  async search(
    query: string,
    page: number = 1,
    pageSize: number = 50,
    sortBy: string = 'imported_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error, count } = await supabase
      .from('urban_renewal_mitchamim_rashut')
      .select('*', { count: 'exact' })
      .or(`shem_mitcham.ilike.%${query}%,yeshuv.ilike.%${query}%,mispar_tochnit.ilike.%${query}%`)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    
    if (error) throw error
    return { data: data as any[], total: count || 0 }
  },

  // Get mitchamim with filters
  async getFiltered(
    filters: {
      yeshuv?: string
      status?: string
      min_units?: number
      max_units?: number
    },
    page: number = 1,
    pageSize: number = 50,
    sortBy: string = 'imported_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    let query = supabase.from('urban_renewal_mitchamim_rashut').select('*', { count: 'exact' })
    
    if (filters.yeshuv) {
      query = query.ilike('yeshuv', `%${filters.yeshuv}%`)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.min_units !== undefined) {
      query = query.gte('yachad_tosafti', filters.min_units)
    }
    if (filters.max_units !== undefined) {
      query = query.lte('yachad_tosafti', filters.max_units)
    }
    
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    
    if (error) throw error
    return { data: data as any[], total: count || 0 }
  },

  // Get mitcham by id
  async getById(id: number) {
    const { data, error } = await supabase
      .from('urban_renewal_mitchamim_rashut')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as any
  },

  // Get mitcham by mispar_mitham
  async getByMisparMitham(misparMitham: number) {
    const { data, error } = await supabase
      .from('urban_renewal_mitchamim_rashut')
      .select('*')
      .eq('mispar_mitham', misparMitham)
      .single()
    
    if (error) throw error
    return data as any
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
  },

  // Update document
  async update(id: number, updates: Partial<TelegramDocument>) {
    const { data, error } = await supabase
      .from('telegram_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as TelegramDocument
  },

  // Delete document
  async delete(id: number) {
    const { error } = await supabase
      .from('telegram_documents')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Create new document
  async create(document: Omit<TelegramDocument, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('telegram_documents')
      .insert(document)
      .select()
      .single()
    
    if (error) throw error
    return data as TelegramDocument
  }
}

// Construction progress queries
export const constructionProgressQueries = {
  async getPaginated(page: number = 1, limit: number = 100) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
      .from('construction_progress')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) throw error

    return {
      data: (data as ConstructionProgressRecord[]) || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  }
}

// Urban Renewal Compounds queries
export const urbanRenewalCompoundQueries = {
  // Get urban renewal compounds as GeoJSON FeatureCollection
  // Uses RPC function to convert PostGIS geometry to GeoJSON
  async getAsGeoJSON() {
    // Try RPC function first (if it exists in database)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_urban_renewal_compounds_geojson')
    
    if (!rpcError && rpcData) {
      return rpcData
    }
    
    // Fallback: Query with ST_AsGeoJSON using RPC
    // Create a simple RPC call that uses ST_AsGeoJSON
    const { data: geoJsonData, error: geoJsonError } = await supabase
      .rpc('get_urban_renewal_geojson')
    
    if (!geoJsonError && geoJsonData) {
      return geoJsonData
    }
    
    // Final fallback: Direct query with ST_AsGeoJSON
    // We need to use a raw SQL query or RPC to convert PostGIS geometry to GeoJSON
    // Since Supabase doesn't automatically convert PostGIS geometry, we'll use a simpler approach
    const { data: compounds, error } = await supabase
      .from('govmap_urban_renewal_compounds')
      .select('object_id, caption, heara, kishur, source, project_name, city_name, city_code, neighborhood_name, status, approval_stage, housing_units, planned_units, executing_body, last_update, remarks, geom')
      .not('geom', 'is', null)
      .limit(1000) // Limit to prevent timeout
    
    if (error) {
      console.error('Error fetching urban renewal compounds:', error)
      throw error
    }
    
    console.log('Fetched compounds:', compounds?.length || 0)
    
    if (!compounds || compounds.length === 0) {
      console.warn('No urban renewal compounds found')
      return {
        type: 'FeatureCollection',
        features: []
      }
    }
    
    // Log first compound to see the structure
    if (compounds.length > 0) {
      console.log('Sample compound geom type:', typeof compounds[0].geom)
      console.log('Sample compound geom:', compounds[0].geom)
    }
    
    // Convert to GeoJSON FeatureCollection
    // Supabase PostGIS returns geometry in a special format - we need to handle it
    const features = compounds
      .map((compound: any, index: number) => {
        try {
          let geometry = compound.geom
          
          // Handle different geometry formats
          if (!geometry) {
            console.warn(`Compound ${compound.object_id} has no geometry`)
            return null
          }
          
          // Supabase PostGIS might return geometry as:
          // 1. GeoJSON object directly
          // 2. String that needs parsing
          // 3. Special PostGIS format
          
          if (typeof geometry === 'object' && geometry !== null) {
            // Check if it's already GeoJSON
            if (geometry.type && geometry.coordinates) {
              // Already valid GeoJSON - check if coordinates are in correct format
              // PostGIS GeoJSON uses [lng, lat] format, which is correct for GeoJSON
            } else if (geometry.geometry) {
              // Wrapped in another object
              geometry = geometry.geometry
            } else if (geometry.coordinates) {
              // Might have coordinates but missing type
              if (!geometry.type) {
                // Try to infer type from coordinates structure
                if (Array.isArray(geometry.coordinates[0])) {
                  if (Array.isArray(geometry.coordinates[0][0])) {
                    geometry.type = 'Polygon'
                  } else {
                    geometry.type = 'LineString'
                  }
                } else {
                  geometry.type = 'Point'
                }
              }
            } else {
              // Unknown object structure
              console.warn(`Compound ${compound.object_id} has unknown geometry format:`, geometry)
              return null
            }
          } else if (typeof geometry === 'string') {
            // Try to parse as JSON
            try {
              const parsed = JSON.parse(geometry)
              if (parsed && parsed.type && parsed.coordinates) {
                geometry = parsed
              } else {
                console.warn(`Compound ${compound.object_id} parsed geometry missing type/coordinates`)
                return null
              }
            } catch (parseErr) {
              console.warn(`Compound ${compound.object_id} geometry is not valid JSON:`, geometry.substring(0, 100))
              return null
            }
          } else {
            // Unknown format
            console.warn(`Compound ${compound.object_id} has unknown geometry type:`, typeof geometry)
            return null
          }
          
          // Final validation
          if (!geometry || !geometry.type || !geometry.coordinates) {
            console.warn(`Compound ${compound.object_id} geometry validation failed`)
            return null
          }
          
          // Log first successful conversion
          if (index === 0) {
            console.log('Successfully converted first compound geometry:', {
              type: geometry.type,
              hasCoordinates: !!geometry.coordinates,
              coordLength: Array.isArray(geometry.coordinates) ? geometry.coordinates.length : 'N/A'
            })
          }
          
          return {
            type: 'Feature',
            properties: {
              object_id: compound.object_id,
              caption: compound.caption,
              heara: compound.heara,
              kishur: compound.kishur,
              source: compound.source,
              project_name: compound.project_name,
              city_name: compound.city_name,
              city_code: compound.city_code,
              neighborhood_name: compound.neighborhood_name,
              status: compound.status,
              approval_stage: compound.approval_stage,
              housing_units: compound.housing_units,
              planned_units: compound.planned_units,
              executing_body: compound.executing_body,
              last_update: compound.last_update,
              remarks: compound.remarks,
            },
            geometry: geometry
          }
        } catch (err) {
          console.error(`Error processing compound ${compound.object_id}:`, err)
          return null
        }
      })
      .filter((f: any) => f !== null)
    
    console.log(`Successfully converted ${features.length} out of ${compounds.length} compounds`)
    
    return {
      type: 'FeatureCollection',
      features: features
    }
  }
}

// Talar Prep (תוכניות בהכנה) queries
export const talarPrepQueries = {
  // Get talar prep plans as GeoJSON FeatureCollection
  async getAsGeoJSON() {
    // Skip RPC function if it times out - use direct query only
    // Try RPC function first (if it exists)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_talar_prep_geojson')
    
    if (rpcError) {
      console.error('Talar prep RPC function error:', rpcError)
      if (rpcError.code === '57014') {
        console.log('Talar prep RPC function timed out - using fallback')
        // Continue to fallback
      } else {
        console.log('Error details:', {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint
        })
      }
    } else if (rpcData) {
      const firstFeature = rpcData?.features?.[0];
      const firstGeom = firstFeature?.geometry;
      let firstCoords: any = null;
      
      if (firstGeom?.type === 'Point') {
        firstCoords = firstGeom.coordinates;
      } else if (firstGeom?.type === 'Polygon') {
        firstCoords = firstGeom.coordinates?.[0]?.[0];
      } else if (firstGeom?.type === 'MultiPolygon') {
        firstCoords = firstGeom.coordinates?.[0]?.[0]?.[0];
      }
      
      console.log('Talar prep RPC function result:', { 
        hasData: !!rpcData, 
        type: rpcData?.type,
        featuresCount: rpcData?.features?.length || 0,
        firstFeatureGeometryType: firstGeom?.type,
        firstCoords: firstCoords,
        isWGS84: firstCoords && Array.isArray(firstCoords) && firstCoords.length >= 2 
          ? (firstCoords[1] >= 29 && firstCoords[1] <= 34 && firstCoords[0] >= 34 && firstCoords[0] <= 36)
          : false
      })
      
      if (rpcData.features && rpcData.features.length > 0) {
        console.log('Talar prep RPC function returned', rpcData.features.length, 'features')
        return rpcData
      } else {
        console.warn('RPC function returned empty features array')
      }
    } else {
      console.warn('RPC function returned no data and no error - function may not exist')
    }
    
    // Fallback: Direct query with smaller limit to prevent timeout
    const { data: plans, error } = await supabase
      .from('govmap_talar_prep')
      .select('id, object_id, geom, centroid, fields, raw_entity, created_at')
      .not('centroid', 'is', null)
      .limit(500)
    
    if (error) {
      console.error('Error fetching talar prep plans:', error)
      throw error
    }
    
    console.log('Fetched talar prep plans:', plans?.length || 0)
    
    if (!plans || plans.length === 0) {
      console.warn('No talar prep plans found in database')
      return {
        type: 'FeatureCollection',
        features: []
      }
    }
    
    // Log first plan to see structure
    if (plans.length > 0) {
      console.log('Sample talar prep plan:', {
        id: plans[0].id,
        object_id: plans[0].object_id,
        geomType: typeof plans[0].geom,
        geomPreview: typeof plans[0].geom === 'string' ? plans[0].geom.substring(0, 200) : plans[0].geom,
        hasCentroid: !!plans[0].centroid,
        hasFields: !!plans[0].fields
      })
    }
    
    // Convert to GeoJSON FeatureCollection
    // geom is stored as text (GeoJSON string or WKT)
    const features = plans
      .map((plan: any, index: number) => {
        try {
          let geometry = plan.geom
          
          if (!geometry) {
            // Try to use centroid if geom is missing
            if (plan.centroid) {
              let centroidCoords: number[] | null = null;
              
              // Check if centroid is directly an array
              if (Array.isArray(plan.centroid)) {
                centroidCoords = plan.centroid.map(v => Number(v)).filter(v => !isNaN(v));
              } else if (plan.centroid.coordinates && Array.isArray(plan.centroid.coordinates)) {
                centroidCoords = plan.centroid.coordinates.map((v: any) => Number(v)).filter((v: number) => !isNaN(v));
              } else if (plan.centroid.lng !== undefined && plan.centroid.lat !== undefined) {
                centroidCoords = [Number(plan.centroid.lng), Number(plan.centroid.lat)];
              } else if (plan.centroid.x !== undefined && plan.centroid.y !== undefined) {
                centroidCoords = [Number(plan.centroid.x), Number(plan.centroid.y)];
              }
              
              if (centroidCoords && centroidCoords.length >= 2 && !isNaN(centroidCoords[0]) && !isNaN(centroidCoords[1])) {
                const [x, y] = centroidCoords;
                
                // Check if coordinates are in Israel Grid format
                if (x > 1000 || y > 1000) {
                  if (index === 0) {
                    console.warn('Plan', plan.id, 'centroid is in Israel Grid format, need RPC function:', centroidCoords)
                  }
                  return null
                }
                
                geometry = {
                  type: 'Point',
                  coordinates: centroidCoords
                }
                if (index === 0) {
                  console.log('Using centroid for plan', plan.id, ':', centroidCoords)
                }
              } else {
                if (index === 0) {
                  console.warn('Plan', plan.id, 'centroid coordinates invalid:', plan.centroid)
                }
                return null
              }
            } else {
              if (index === 0) {
                console.warn('Plan', plan.id, 'has no geometry or centroid')
              }
              return null
            }
          } else if (typeof geometry === 'string') {
            // Check if it's WKT format (starts with POINT, LINESTRING, POLYGON, MULTIPOLYGON, etc.)
            const wktPattern = /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON)\s*[Z]?\s*\(/i
            if (wktPattern.test(geometry.trim())) {
              // It's WKT format - we need to use centroid or create RPC function
              // For now, use centroid if available
              if (plan.centroid) {
                let centroidCoords: number[] | null = null;
                
                // Check if centroid is directly an array (most common case)
                if (Array.isArray(plan.centroid)) {
                  centroidCoords = plan.centroid.map(v => Number(v)).filter(v => !isNaN(v));
                } else if (plan.centroid.coordinates && Array.isArray(plan.centroid.coordinates)) {
                  centroidCoords = plan.centroid.coordinates.map((v: any) => Number(v)).filter((v: number) => !isNaN(v));
                } else if (plan.centroid.lng !== undefined && plan.centroid.lat !== undefined) {
                  centroidCoords = [Number(plan.centroid.lng), Number(plan.centroid.lat)];
                } else if (plan.centroid.x !== undefined && plan.centroid.y !== undefined) {
                  centroidCoords = [Number(plan.centroid.x), Number(plan.centroid.y)];
                } else if (typeof plan.centroid === 'object') {
                  // Try to find any numeric values in object
                  const values = Object.values(plan.centroid).filter(v => typeof v === 'number' && !isNaN(v));
                  if (values.length >= 2) {
                    centroidCoords = [values[0], values[1]];
                  }
                }
                
                if (centroidCoords && centroidCoords.length >= 2 && !isNaN(centroidCoords[0]) && !isNaN(centroidCoords[1])) {
                  const [x, y] = centroidCoords;
                  
                  // If coordinates look like Israel Grid (large numbers), we can't convert without PostGIS
                  // These need RPC function to convert - skip for now
                  if (x > 1000 || y > 1000) {
                    if (index < 3) {
                      console.warn(`Plan ${plan.id}: Centroid coordinates are in Israel Grid format, need RPC function:`, {
                        x, y,
                        centroid: plan.centroid,
                        centroidType: Array.isArray(plan.centroid) ? 'array' : typeof plan.centroid
                      })
                    }
                    // Skip - these coordinates won't work in Leaflet without conversion
                    return null
                  }
                  
                  geometry = {
                    type: 'Point',
                    coordinates: centroidCoords
                  }
                  if (index === 0) {
                    console.log('Using centroid for WKT plan', plan.id, ':', centroidCoords, 'centroid type:', Array.isArray(plan.centroid) ? 'array' : typeof plan.centroid)
                  }
                } else {
                  if (index === 0) {
                    console.warn('Plan', plan.id, 'has WKT but centroid coordinates invalid. Centroid:', plan.centroid, 'type:', typeof plan.centroid)
                  }
                  return null
                }
              } else {
                if (index === 0) {
                  console.warn('Plan', plan.id, 'has WKT format but no centroid - need RPC function to convert')
                }
                return null
              }
            } else {
              // Try to parse as JSON (GeoJSON)
              try {
                const parsed = JSON.parse(geometry)
                if (parsed && parsed.type && parsed.coordinates) {
                  geometry = parsed
                  if (index === 0) {
                    console.log('Parsed geometry for plan', plan.id, ':', {
                      type: parsed.type,
                      hasCoordinates: !!parsed.coordinates,
                      firstCoord: parsed.coordinates?.[0]?.[0]?.[0]
                    })
                  }
                } else {
                  if (index === 0) {
                    console.warn('Parsed geometry missing type/coordinates for plan', plan.id)
                  }
                  return null
                }
              } catch (parseErr) {
                if (index === 0) {
                  console.warn('Failed to parse geometry for plan', plan.id, ':', parseErr)
                }
                return null
              }
            }
          } else if (typeof geometry === 'object' && geometry !== null) {
            // Already an object
            if (!geometry.type || !geometry.coordinates) {
              if (index === 0) {
                console.warn('Geometry object missing type/coordinates for plan', plan.id)
              }
              return null
            }
            if (index === 0) {
              console.log('Using object geometry for plan', plan.id, ':', {
                type: geometry.type,
                hasCoordinates: !!geometry.coordinates
              })
            }
          } else {
            if (index === 0) {
              console.warn('Unknown geometry type for plan', plan.id, ':', typeof geometry)
            }
            return null
          }
          
          // Extract properties from fields and raw_entity
          const properties: any = {
            id: plan.id,
            object_id: plan.object_id,
          }
          
          // Add fields if available
          if (plan.fields && typeof plan.fields === 'object') {
            Object.assign(properties, plan.fields)
          }
          
          // Add raw_entity data if available
          if (plan.raw_entity && typeof plan.raw_entity === 'object') {
            // Merge raw_entity data, but don't overwrite existing properties
            Object.keys(plan.raw_entity).forEach(key => {
              if (!properties.hasOwnProperty(key)) {
                properties[key] = plan.raw_entity[key]
              }
            })
          }
          
          return {
            type: 'Feature',
            properties: properties,
            geometry: geometry
          }
        } catch (err) {
          console.error(`Error processing talar prep plan ${plan.id}:`, err)
          return null
        }
      })
      .filter((f: any) => f !== null)
    
    console.log(`Successfully converted ${features.length} out of ${plans.length} talar prep plans`)
    
    return {
      type: 'FeatureCollection',
      features: features
    }
  }
}

// Helper function to convert Web Mercator (EPSG:3857) coordinates to WGS84 (lat/lng)
const convertWebMercatorToWGS84 = (x: number, y: number): [number, number] => {
  // Web Mercator to WGS84 conversion
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lat, lng];
};

// Helper function to convert ITM (Israel Grid) coordinates to WGS84 (lat/lng)
// Synchronous version - used in client-side conversion
const convertITMToWGS84 = (x: number, y: number): [number, number] | null => {
  try {
    // Manual conversion - ITM to WGS84
    // Based on the official Israeli TM Grid (ITM) parameters
    
    // WGS84 ellipsoid parameters
    const a = 6378137.0; // Semi-major axis
    const f = 1/298.257223563; // Flattening
    const e2 = 2*f - f*f; // First eccentricity squared
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    
    // ITM projection parameters (Israeli Transverse Mercator)
    const k0 = 1.0000067; // Scale factor at central meridian
    const lat0 = 31.734393611111 * Math.PI / 180; // Central latitude in radians
    const lon0 = 35.204516944444 * Math.PI / 180; // Central longitude in radians
    const x0 = 219529.584; // False easting
    const y0 = 626907.39; // False northing
    
    // Convert ITM to WGS84
    const x_adj = x - x0;
    const y_adj = y - y0;
    
    // Calculate latitude
    const M = y_adj / (a * k0);
    const mu = M / (1 - e2/4 - 3*e4/64 - 5*e6/256);
    
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const J1 = 3*e1/2 - 27*e1*e1*e1/32;
    const J2 = 21*e1*e1/16 - 55*e1*e1*e1*e1/32;
    const J3 = 151*e1*e1*e1/96;
    const J4 = 1097*e1*e1*e1*e1/512;
    
    const fp = mu + J1*Math.sin(2*mu) + J2*Math.sin(4*mu) + J3*Math.sin(6*mu) + J4*Math.sin(8*mu);
    
    const e_2 = e2 / (1 - e2);
    const C1 = e_2 * Math.cos(fp) * Math.cos(fp);
    const T1 = Math.tan(fp) * Math.tan(fp);
    const N1 = a / Math.sqrt(1 - e2 * Math.sin(fp) * Math.sin(fp));
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(fp) * Math.sin(fp), 1.5);
    const D = x_adj / (N1 * k0);
    
    const lat_rad = fp - (N1 * Math.tan(fp) / R1) * (D*D/2 - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e_2)*D*D*D*D/24 + (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*e_2 - 3*C1*C1)*D*D*D*D*D*D/720);
    
    const lon_rad = lon0 + (D - (1 + 2*T1 + C1)*D*D*D/6 + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*e_2 + 24*T1*T1)*D*D*D*D*D/120) / Math.cos(fp);
    
    // Convert to degrees
    const lat = lat_rad * 180 / Math.PI;
    const lng = lon_rad * 180 / Math.PI;
    
    // Return [lat, lng] in degrees
    return [lat, lng];
  } catch (err) {
    console.error('Error converting ITM to WGS84:', err);
    return null;
  }
};

// Govmap Gushim (גושים) queries
export const govmapGushimQueries = {
  // Get gushim as GeoJSON FeatureCollection
  async getAsGeoJSON() {
    // Try RPC function first (if it exists) - uses PostGIS for accurate ITM to WGS84 conversion
    console.log('Attempting to call get_govmap_gushim_geojson RPC function...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_govmap_gushim_geojson')
    
    console.log('RPC call result:', { 
      hasError: !!rpcError, 
      hasData: !!rpcData,
      errorCode: rpcError?.code,
      errorMessage: rpcError?.message
    });
    
    if (rpcError) {
      console.error('Govmap gushim RPC function error:', rpcError)
      if (rpcError.code === 'PGRST202') {
        console.log('RPC function does not exist - run fix_gushim_rpc.sql in Supabase SQL editor to create it')
      } else if (rpcError.code === '57014') {
        console.error('RPC function timed out - try reducing LIMIT in fix_gushim_rpc.sql')
      }
    } else if (rpcData) {
      // Log first feature to debug
      const firstFeature = rpcData?.features?.[0];
      const firstGeom = firstFeature?.geometry;
      const firstCoords = firstGeom?.coordinates;
      
      console.log('Govmap gushim RPC function result:', {
        hasData: !!rpcData,
        type: rpcData?.type,
        featuresCount: rpcData?.features?.length || 0,
        firstFeatureGeometryType: firstGeom?.type,
        firstCoords: firstCoords,
        isWGS84: firstCoords && Array.isArray(firstCoords) && firstCoords.length >= 2
          ? (firstCoords[1] >= 29 && firstCoords[1] <= 34 && firstCoords[0] >= 34 && firstCoords[0] <= 36)
          : false
      });
      
      if (rpcData.features && rpcData.features.length > 0) {
        // Validate coordinates are in Israel bounds
        const validFeatures = rpcData.features.filter((f: any) => {
          const coords = f?.geometry?.coordinates;
          if (!coords || !Array.isArray(coords) || coords.length < 2) return false;
          const [lng, lat] = coords;
          return lat >= 29 && lat <= 34 && lng >= 34 && lng <= 36;
        });
        
        if (validFeatures.length > 0) {
          console.log('Govmap gushim RPC function returned', validFeatures.length, 'valid features (out of', rpcData.features.length, ')')
          return {
            ...rpcData,
            features: validFeatures
          };
        } else {
          console.warn('RPC function returned features but none are in Israel bounds');
          console.warn('First feature coords:', firstCoords);
        }
      } else {
        console.warn('RPC function returned empty features array')
      }
    } else {
      console.warn('RPC function returned no data and no error - function may not exist')
    }
    
    // Fallback: Direct query - skip ITM coordinates (like talar prep does)
    // Only use coordinates that are already in WGS84 format
    console.log('Falling back to direct query - skipping ITM coordinates')
    const { data: gushim, error } = await supabase
      .from('govmap_gushim')
      .select('id, object_id, gush_num, gush_suffix, status_text, centroid')
      .not('centroid', 'is', null)
      .limit(500) // Smaller limit to prevent timeout
    
    if (error) {
      console.error('Error fetching govmap gushim:', error)
      throw error
    }
    
    console.log('Fetched govmap gushim:', gushim?.length || 0)
    
    if (!gushim || gushim.length === 0) {
      console.warn('No govmap gushim found in database')
      return {
        type: 'FeatureCollection',
        features: []
      }
    }
    
    // Convert to GeoJSON FeatureCollection
    // Use only centroid (jsonb) for better performance - convert to Point geometry
    const features = gushim
      .map((gush: any, index: number) => {
        try {
          if (!gush.centroid) {
            return null;
          }

          let centroidCoords: number[] | null = null;
          
          // Handle centroid as jsonb - can be array, object with coordinates, or object with lng/lat or x/y
          if (Array.isArray(gush.centroid)) {
            // Direct array [lng, lat] or [x, y]
            centroidCoords = gush.centroid
              .map((v: any) => Number(v))
              .filter((v: number) => !isNaN(v))
              .slice(0, 2); // Take first 2 valid numbers
          } else if (gush.centroid && typeof gush.centroid === 'object') {
            // Object with coordinates property
            if (Array.isArray(gush.centroid.coordinates)) {
              centroidCoords = gush.centroid.coordinates
                .map((v: any) => Number(v))
                .filter((v: number) => !isNaN(v))
                .slice(0, 2);
            } else if (gush.centroid.lng !== undefined && gush.centroid.lat !== undefined) {
              // Object with lng/lat properties
              centroidCoords = [Number(gush.centroid.lng), Number(gush.centroid.lat)];
            } else if (gush.centroid.x !== undefined && gush.centroid.y !== undefined) {
              // Object with x/y properties
              centroidCoords = [Number(gush.centroid.x), Number(gush.centroid.y)];
            }
          }
          
          // Validate coordinates
          if (!centroidCoords || centroidCoords.length < 2 || 
              isNaN(centroidCoords[0]) || isNaN(centroidCoords[1])) {
            return null;
          }

          let [first, second] = centroidCoords;
          
          // Check if coordinates are large numbers (could be ITM or Web Mercator)
          // ITM: typically 100,000 - 1,100,000
          // Web Mercator: typically millions (e.g., 3,880,796)
          // WGS84 coordinates for Israel: lat ~29-34, lng ~34-36
          let finalX: number;
          let finalY: number;
          
          if (first > 100000 || second > 100000) {
            // Try Web Mercator first (coordinates like 3880796, 3786990 are likely Web Mercator)
            if (first > 1000000 || second > 1000000) {
              // These look like Web Mercator coordinates - convert to WGS84
              const [convertedLat, convertedLng] = convertWebMercatorToWGS84(first, second);
              finalX = convertedLng; // GeoJSON uses [lng, lat]
              finalY = convertedLat;
              
              if (index < 5) {
                console.log(`Gush ${gush.id} converted from Web Mercator [${first}, ${second}] to WGS84 [${finalX}, ${finalY}]`);
              }
            } else {
              // These are likely ITM coordinates - convert to WGS84
              // centroid is stored as [x, y] = [easting, northing] in ITM format
              // Based on geom structure: coordinates are stored as "X Y" = "easting northing"
              // centroid[0] = easting (X), centroid[1] = northing (Y)
              // convertITMToWGS84 takes (x, y) = (easting, northing)
              let converted = convertITMToWGS84(first, second); // [x, y] = [easting, northing] = [centroid[0], centroid[1]]
              
              // If conversion gives coordinates outside Israel bounds, try [y, x] order as fallback
              if (converted) {
                const [lat, lng] = converted;
                if (lat < 29 || lat > 34 || lng < 34 || lng > 36) {
                  // Try [y, x] order (northing, easting) as fallback - in case centroid is stored differently
                  const swappedConverted = convertITMToWGS84(second, first);
                  if (swappedConverted) {
                    const [swappedLat, swappedLng] = swappedConverted;
                    if (swappedLat >= 29 && swappedLat <= 34 && swappedLng >= 34 && swappedLng <= 36) {
                      converted = swappedConverted;
                      if (index < 5) {
                        console.log(`Gush ${gush.id} ITM coordinates - tried [${first}, ${second}] (easting,northing) then [${second}, ${first}] (northing,easting) - [${second}, ${first}] worked`);
                      }
                    }
                  }
                }
              } else {
                // If first conversion failed, try [y, x] order
                converted = convertITMToWGS84(second, first);
              }
              
              if (!converted) {
                if (index < 5) {
                  console.warn(`Gush ${gush.id} failed ITM conversion for [${first}, ${second}]`);
                }
                return null;
              }
              
              const [lat, lng] = converted;
              finalX = lng; // GeoJSON uses [lng, lat]
              finalY = lat;
              
              if (index < 5) {
                console.log(`Gush ${gush.id} converted from ITM [${centroidCoords[0]}, ${centroidCoords[1]}] to WGS84 [${finalX}, ${finalY}]`);
              }
            }
            
            // Validate converted coordinates are in Israel bounds
            if (finalY < 29 || finalY > 34 || finalX < 34 || finalX > 36) {
              if (index < 5) {
                console.warn(`Gush ${gush.id} converted coordinates outside Israel bounds: [${finalX}, ${finalY}] - skipping`);
              }
              return null;
            }
          } else {
            // Not ITM - use coordinates as-is, but validate they're in Israel bounds
            finalX = first;
            finalY = second;
            
            // Validate coordinates are in valid Israel WGS84 bounds
            // Israel: lat 29-34, lng 34-36 (rough bounds)
            // Also check swapped order in case centroid is stored as [lat, lng]
            if (finalY < 29 || finalY > 34 || finalX < 34 || finalX > 36) {
              // Try swapping coordinates - maybe they're stored as [lat, lng] (only for non-ITM)
              if (finalX >= 29 && finalX <= 34 && finalY >= 34 && finalY <= 36) {
                // Coordinates are swapped - correct them
                const tempX = finalX;
                finalX = finalY;
                finalY = tempX;
                if (index < 5) {
                  console.log(`Gush ${gush.id} coordinates were swapped: [${centroidCoords[0]}, ${centroidCoords[1]}] -> [${finalX}, ${finalY}]`);
                }
              } else {
                // Coordinates outside typical Israel bounds
                if (index < 10) {
                  console.warn(`Gush ${gush.id} centroid outside typical Israel bounds: [${finalX}, ${finalY}] - skipping`);
                }
                return null;
              }
            }
          }
          
          // Final validation
          if (finalY < 29 || finalY > 34 || finalX < 34 || finalX > 36) {
            if (index < 10) {
              console.warn(`Gush ${gush.id} centroid failed final validation: [${finalX}, ${finalY}] - skipping`);
            }
            return null;
          }
          
          // Create Point geometry from centroid (WGS84: [lng, lat])
          const geometry = {
            type: 'Point' as const,
            coordinates: [finalX, finalY] as [number, number] // [lng, lat] for GeoJSON
          };
          
          // Extract properties
          const properties: any = {
            id: gush.id,
            object_id: gush.object_id,
            gush_num: gush.gush_num,
            gush_suffix: gush.gush_suffix,
            status_text: gush.status_text,
          };
          
          return {
            type: 'Feature' as const,
            properties: properties,
            geometry: geometry
          };
        } catch (err) {
          console.error(`Error processing gush ${gush.id}:`, err);
          return null;
        }
      })
      .filter((f: any) => f !== null)
    
    console.log(`Successfully converted ${features.length} out of ${gushim.length} gushim`)
    
    return {
      type: 'FeatureCollection',
      features: features
    }
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

