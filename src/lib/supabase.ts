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

export interface UrbanRenewalLocation {
  id: number
  object_id?: number
  layer_id?: number
  geometry_type?: string
  coordinates?: any
  shape_area?: number
  shape_length?: number
  created_at?: string
  updated_at?: string
}

export interface UrbanRenewalProject {
  id: number
  object_id?: number
  project_number?: string
  project_name?: string
  city_name?: string
  plan_name?: string
  plan_link?: string
  project_type?: string
  project_subtype?: string
  status_code?: number
  authority_status_code?: number
  valid_date?: string
  existing_units?: number
  proposed_units?: number
  additional_units?: number
  notes?: string
  shape_area?: number
  shape_length?: number
  created_at?: string
  updated_at?: string
}

export interface TelegramDocument {
  id: number
  telegram_message_id?: number
  telegram_chat_id?: number
  telegram_date?: string
  image_file_id?: string
  image_url?: string
  raw_ocr_text?: string
  document_type?: string
  location_city?: string
  location_address?: string
  property_type?: string
  property_floors?: number
  property_units?: number
  total_area_sqm?: number
  building_area_sqm?: number
  apartments?: any
  sale_conditions?: string
  submission_deadline?: string
  deposit_amount?: number
  deposit_currency?: string
  contact_name?: string
  contact_title?: string
  contact_address?: string
  contact_phone?: string
  contact_fax?: string
  contact_email?: string
  court_file_number?: string
  parcel_number?: string
  block_number?: string
  extracted_data?: any
  processed_at?: string
  processing_status?: string
  error_message?: string
  created_at?: string
  updated_at?: string
}
