import { supabase } from './supabase'

// Types for tenders
export interface Michraz {
  pk: number
  michraz_id: number
  tender_id: number
  tender_number: string
  title: string
  status: string
  area: string
  publication_date: string
  deadline_date: string
  source_endpoint: string
  fetched_at: string
  raw: any
}

export interface MichrazActive {
  pk: number
  michraz_id: number
  active_since: string
  last_seen_at: string
  source_endpoint: string
  raw: any
}

export interface Michraz {
  pk: number
  michraz_id: number
  tender_id: number
  tender_number: string
  title: string
  status: string
  area: string
  publication_date: string
  deadline_date: string
  source_endpoint: string
  fetched_at: string
  raw: any
}

export interface TabaPlan {
  pk: number
  plan_id: number
  id: number
  plan_number: string
  plan_name: string
  status: string
  area: string
  publication_date: string
  from_date: string
  to_date: string
  source_endpoint: string
  fetched_at: string
  raw: any
}

// Tender queries
export const tenderQueries = {
  // Get all active tenders from michrazim_active table only
  async getActive() {
    const { data, error } = await supabase
      .from('michrazim_active')
      .select('*')
      .order('last_seen_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get active tenders with pagination
  async getActivePaginated(page: number = 1, limit: number = 60) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('michrazim_active')
      .select('*', { count: 'exact' })
      .order('last_seen_at', { ascending: false })
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

  // Get tenders by area (from raw JSONB data)
  async getByArea(area: string) {
    const { data, error } = await supabase
      .from('michrazim_active')
      .select('*')
      .contains('raw', { area: area })
      .order('last_seen_at', { ascending: false })
    
    if (error) throw error
    return data as MichrazActive[]
  },

  // Get tenders by status (from raw JSONB data)
  async getByStatus(status: string) {
    const { data, error } = await supabase
      .from('michrazim_active')
      .select('*')
      .contains('raw', { status: status })
      .order('last_seen_at', { ascending: false })
    
    if (error) throw error
    return data as MichrazActive[]
  },

  // Get tenders expiring soon (within X days) - check raw JSONB
  async getExpiringSoon(days: number = 7) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('michrazim_active')
      .select('*')
      .lte('raw->>deadline_date', futureDateStr)
      .order('raw->>deadline_date', { ascending: true })
    
    if (error) throw error
    return data as MichrazActive[]
  },

  // Get recent tenders (added to active in last X days)
  async getRecent(days: number = 30) {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('michrazim_active')
      .select('*')
      .gte('active_since', pastDate.toISOString())
      .order('active_since', { ascending: false })
    
    if (error) throw error
    return data as MichrazActive[]
  },

  // Search tenders by title or description (from raw JSONB)
  async search(query: string) {
    const { data, error } = await supabase
      .from('michrazim_active')
      .select('*')
      .or(`raw->>title.ilike.%${query}%,raw->>description.ilike.%${query}%`)
      .order('last_seen_at', { ascending: false })
    
    if (error) throw error
    return data as MichrazActive[]
  },

  // Search from michrazim table (all tenders)
  async searchAllTenders(query: string, page: number = 1, limit: number = 20) {
    try {
      console.log('Searching in michrazim table with query:', query);
      const from = (page - 1) * limit
      const to = from + limit - 1
      
      const { data, error, count } = await supabase
        .from('michrazim')
        .select('*', { count: 'exact' })
        .or(`title.ilike.%${query}%,area.ilike.%${query}%,raw->>MichrazName.ilike.%${query}%,raw->>Shchuna.ilike.%${query}%,raw->>KodYeshuv.ilike.%${query}%,raw->>KodMerchav.ilike.%${query}%,raw->>MichrazID.ilike.%${query}%`)
        .order('publication_date', { ascending: false })
        .range(from, to)
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Search completed. Found:', count, 'results');
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    } catch (error) {
      console.error('Error in searchAllTenders:', error);
      throw error;
    }
  },

  // Get tenders by area from michrazim table
  async getAllTendersByArea(area: string, page: number = 1, limit: number = 20) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('michrazim')
      .select('*', { count: 'exact' })
      .eq('area', area)
      .order('publication_date', { ascending: false })
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

  // Get recent tenders from michrazim table
  async getAllRecentTenders(days: number = 30, page: number = 1, limit: number = 20) {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - days)
    
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('michrazim')
      .select('*', { count: 'exact' })
      .gte('publication_date', pastDate.toISOString())
      .order('publication_date', { ascending: false })
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

  // Get tender by ID
  async getById(michrazId: number) {
    const { data, error } = await supabase
      .from('michrazim_active')
      .select('*')
      .eq('michraz_id', michrazId)
      .single()
    
    if (error) throw error
    return data as MichrazActive
  },

  // Get sample data from michrazim table to debug
  async getSampleTenders(limit: number = 5) {
    try {
      console.log('Getting sample data from michrazim table...');
      const { data, error } = await supabase
        .from('michrazim')
        .select('*')
        .limit(limit)
        .order('publication_date', { ascending: false })
      
      if (error) {
        console.error('Supabase error in getSampleTenders:', error);
        throw error;
      }
      
      console.log('Sample data retrieved:', data?.length || 0, 'items');
      return data as Michraz[]
    } catch (error) {
      console.error('Error in getSampleTenders:', error);
      throw error;
    }
  },

  // Get tender statistics from active tenders
  async getStats() {
    const { data, error } = await supabase
      .from('michrazim_active')
      .select('raw, active_since, last_seen_at')
    
    if (error) throw error
    
    // Process statistics from raw JSONB data
    const stats = {
      total: data.length,
      byStatus: {} as Record<string, number>,
      byArea: {} as Record<string, number>,
      expiringSoon: 0,
      recent: 0
    }
    
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    data.forEach(tender => {
      const raw = tender.raw
      
      // Count by status
      if (raw.status) {
        stats.byStatus[raw.status] = (stats.byStatus[raw.status] || 0) + 1
      }
      
      // Count by area
      if (raw.area) {
        stats.byArea[raw.area] = (stats.byArea[raw.area] || 0) + 1
      }
      
      // Count expiring soon
      if (raw.deadline_date && new Date(raw.deadline_date) <= weekFromNow) {
        stats.expiringSoon++
      }
      
      // Count recent (added to active recently)
      if (tender.active_since && new Date(tender.active_since) >= monthAgo) {
        stats.recent++
      }
    })
    
    return stats
  }
}

// Plans queries
export const plansQueries = {
  // Get all plans with pagination
  async getPlansPaginated(page: number = 1, limit: number = 50) {
    try {
      console.log('Getting plans from taba_plans table...');
      const from = (page - 1) * limit
      const to = from + limit - 1
      
      const { data, error, count } = await supabase
        .from('taba_plans')
        .select('*', { count: 'exact' })
        .order('publication_date', { ascending: false })
        .range(from, to)
      
      if (error) {
        console.error('Supabase error in getPlansPaginated:', error);
        throw error;
      }
      
      console.log('Plans retrieved:', count, 'total,', data?.length || 0, 'in this page');
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    } catch (error) {
      console.error('Error in getPlansPaginated:', error);
      throw error;
    }
  },

  // Search plans
  async searchPlans(query: string, page: number = 1, limit: number = 50) {
    try {
      console.log('Searching plans with query:', query);
      const from = (page - 1) * limit
      const to = from + limit - 1
      
      const { data, error, count } = await supabase
        .from('taba_plans')
        .select('*', { count: 'exact' })
        .or(`plan_name.ilike.%${query}%,area.ilike.%${query}%,plan_number.ilike.%${query}%,raw->>planNumber.ilike.%${query}%,raw->>cityText.ilike.%${query}%,raw->>status.ilike.%${query}%,raw->>mahut.ilike.%${query}%`)
        .order('publication_date', { ascending: false })
        .range(from, to)
      
      if (error) {
        console.error('Supabase error in searchPlans:', error);
        throw error;
      }
      
      console.log('Search completed. Found:', count, 'results');
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    } catch (error) {
      console.error('Error in searchPlans:', error);
      throw error;
    }
  },

  // Get plans by area
  async getPlansByArea(area: string, page: number = 1, limit: number = 50) {
    try {
      console.log('Getting plans by area:', area);
      const from = (page - 1) * limit
      const to = from + limit - 1
      
      const { data, error, count } = await supabase
        .from('taba_plans')
        .select('*', { count: 'exact' })
        .eq('area', area)
        .order('publication_date', { ascending: false })
        .range(from, to)
      
      if (error) {
        console.error('Supabase error in getPlansByArea:', error);
        throw error;
      }
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    } catch (error) {
      console.error('Error in getPlansByArea:', error);
      throw error;
    }
  },

  // Get plan by ID
  async getPlanById(planId: number) {
    try {
      const { data, error } = await supabase
        .from('taba_plans')
        .select('*')
        .eq('plan_id', planId)
        .single()
      
      if (error) {
        console.error('Supabase error in getPlanById:', error);
        throw error;
      }
      
      return data as TabaPlan
    } catch (error) {
      console.error('Error in getPlanById:', error);
      throw error;
    }
  }
}
