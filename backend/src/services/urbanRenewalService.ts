/**
 * Urban Renewal Mitchamim Service
 * Fetches urban renewal mitchamim from PostgreSQL
 */

import { query } from '../config/database.js';

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

    const conditions: string[] = ['yeshuv ILIKE $1'];
    const params: unknown[] = [`%${city}%`];
    console.log(`🔍 [UrbanRenewalService] Filtering by city (yeshuv): ${city}`);

    if (street) {
      console.log(`🔍 [UrbanRenewalService] Also filtering by street (shem_mitcham): ${street}`);
      params.push(`%${street}%`);
      conditions.push(`shem_mitcham ILIKE $${params.length}`);
    }

    const mitchamim = await query<any>(
      `SELECT * FROM urban_renewal_mitchamim_rashut
       WHERE ${conditions.join(' AND ')}
       LIMIT 20`,
      params
    );

    console.log(`✅ [UrbanRenewalService] Found ${mitchamim.length} mitchamim`);
    return mitchamim;
  } catch (error: any) {
    console.error('❌ [UrbanRenewalService] Error:', error?.message || error);
    throw error;
  }
}
