import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://blbnnsfozxzklzxqkhsa.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsYm5uc2Zvenh6a2x6eHFraHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwODY3MjcsImV4cCI6MjA3NDY2MjcyN30.fFZrwGkekGvMXoqkf0EWTp8dFwoKfGC1gmisATdqH64'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our real estate app
export interface Property {
  id: string
  title: string
  description: string
  price: number
  location: string
  latitude: number
  longitude: number
  property_type: 'apartment' | 'house' | 'commercial' | 'land'
  bedrooms?: number
  bathrooms?: number
  area_sqm: number
  images: string[]
  features: string[]
  status: 'available' | 'sold' | 'rented' | 'pending'
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string
  developer: string
  location: string
  latitude: number
  longitude: number
  total_units: number
  available_units: number
  price_from: number
  price_to: number
  completion_date: string
  images: string[]
  features: string[]
  status: 'planning' | 'construction' | 'completed' | 'sold_out'
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  city_id?: number
  city_name: string
  serial_no?: number
  address?: string
  area_m2?: number
  deal_date?: string
  price_nis?: number
  block_parcel_subparcel?: string
  property_type?: string
  rooms?: number
  floor?: string
  trend?: string
  source_url?: string
  raw?: any
  created_at: string
}

export interface GovmapPlan {
  pk: number
  objectid: number
  tochnit?: string
  migrash?: string
  mishasava?: number
  kodyeud?: number
  shape_area?: number
  shape_length?: number
  coordinates?: any
  bbox?: any
  fetched_at?: string
  raw: any
}
