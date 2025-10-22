import { supabase } from './supabase'
import type { Property, Project, Deal, GovmapPlan, UrbanRenewalLocation } from './supabase'

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
  async getFiltered(filters: {
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
  }) {
    let query = supabase.from('deals').select('*')
    
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
    
    const { data, error } = await query.order('deal_date', { ascending: false })
    
    if (error) throw error
    return data as Deal[]
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
  async search(searchTerm: string) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .or(`address.ilike.%${searchTerm}%,block_parcel_subparcel.ilike.%${searchTerm}%`)
      .order('deal_date', { ascending: false })
    
    if (error) throw error
    return data as Deal[]
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

