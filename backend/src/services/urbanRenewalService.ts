/**
 * Urban Renewal Mitchamim Service
 * Fetches urban renewal mitchamim from Supabase
 */

import { supabase } from '../config/database.js';

/**
 * Get urban renewal mitchamim by city and street
 * Searches in urban_renewal_mitchamim_rashut table
 */
export async function getUrbanRenewalMitchamim(
  city?: string,
  street?: string
): Promise<any[]> {
  try {
    if (!city) {
      console.log('⚠️ [UrbanRenewalService] No city provided');
      return [];
    }

    console.log(`🏘️ [UrbanRenewalService] Fetching mitchamim for city: ${city}, street: ${street || 'N/A'}...`);

    let query = supabase
      .from('urban_renewal_mitchamim_rashut')
      .select('*');

    // Filter by city (yeshuv)
    if (city) {
      console.log(`🔍 [UrbanRenewalService] Filtering by city (yeshuv): ${city}`);
      query = query.ilike('yeshuv', `%${city}%`);
    }

    // If street is provided, also search in shem_mitcham (name of compound)
    // This helps match addresses that might be mentioned in the compound name
    if (street) {
      console.log(`🔍 [UrbanRenewalService] Also filtering by street (shem_mitcham): ${street}`);
      query = query.or(`shem_mitcham.ilike.%${street}%`);
    }

    const { data: mitchamim, error } = await query.limit(20);

    if (error) {
      console.error('❌ [UrbanRenewalService] Supabase error:', error);
      throw error;
    }

    console.log(`✅ [UrbanRenewalService] Found ${mitchamim?.length || 0} mitchamim`);
    return mitchamim || [];
  } catch (error: any) {
    console.error('❌ [UrbanRenewalService] Error:', error?.message || error);
    throw error;
  }
}
