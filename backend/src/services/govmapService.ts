/**
 * Service for GovMap API integration
 */

import { supabase } from '../config/database.js';

interface ParcelSearchResult {
  LAT?: number;
  LNG?: number;
  X?: number;
  Y?: number;
  GUSH?: number;
  HELKA?: number;
  centroid?: [number, number];
  [key: string]: any; // For other fields from API
}

/**
 * Search for parcel by GUSH and HELKA
 * First tries Supabase database, then falls back to GovMap API
 * @param gush - Gush number
 * @param helka - Helka (parcel) number
 * @returns Parcel coordinates and data
 */
export async function searchParcelByGushHelka(
  gush: number,
  helka: number
): Promise<ParcelSearchResult> {
  try {
    // First, try to find the parcel in our Supabase database
    console.log(`Searching for parcel: gush=${gush}, helka=${helka}`);
    
    // Try multiple search strategies across different tables
    let parcelData: any = null;
    
    // Strategy 1: Search in govmap_gushim_parcels_by_search table (primary search table)
    let { data, error: dbError } = await supabase
      .from('govmap_gushim_parcels_by_search')
      .select('id, govmap_object_id, gush_num, gush_suffix, parcel, centroid_geom, raw_entity, legal_area_m2, status_text, note')
      .eq('gush_num', gush)
      .eq('parcel', helka)
      .limit(1)
      .maybeSingle();

    if (!dbError && data) {
      parcelData = data;
      console.log('Found parcel in govmap_gushim_parcels_by_search (direct search):', parcelData.id);
    } else {
      if (dbError) {
        console.log('Direct search in govmap_gushim_parcels_by_search error:', dbError.message);
      } else {
        console.log('No parcel found in govmap_gushim_parcels_by_search with direct search');
      }
      
      // Strategy 2: Search in parcel_ownership_new table (fallback)
      const { data: data2, error: error2 } = await supabase
        .from('parcel_ownership_new')
        .select('id, govmap_object_id, gush_num, parcel, centroid_geom, raw_entity')
        .eq('gush_num', gush)
        .eq('parcel', helka)
        .limit(1)
        .maybeSingle();

      if (!error2 && data2) {
        parcelData = data2;
        console.log('Found parcel in parcel_ownership_new (direct search):', parcelData.id);
      } else {
        // Strategy 3: Search in raw_entity fields in govmap_gushim_parcels_by_search
        const { data: data3, error: error3 } = await supabase
          .from('govmap_gushim_parcels_by_search')
          .select('id, govmap_object_id, gush_num, gush_suffix, parcel, centroid_geom, raw_entity, legal_area_m2, status_text, note')
          .eq('gush_num', gush)
          .limit(100); // Get multiple parcels from same gush
        
        if (!error3 && data3 && data3.length > 0) {
          // Search for the helka in raw_entity fields
          const found = data3.find((p: any) => {
            if (p.parcel === helka) return true;
            // Check in raw_entity fields
            if (p.raw_entity?.fields) {
              const helkaField = p.raw_entity.fields.find((f: any) => 
                f.fieldName === 'חלקה' && f.fieldValue === helka
              );
              if (helkaField) return true;
            }
            return false;
          });
          
          if (found) {
            parcelData = found;
            console.log('Found parcel in govmap_gushim_parcels_by_search (field search):', parcelData.id);
          } else {
            console.log(`No parcel found with helka=${helka} in gush=${gush}. Found ${data3.length} parcels in this gush.`);
          }
        } else if (error3) {
          console.error('Error searching parcels by gush in govmap_gushim_parcels_by_search:', error3);
        }
      }
    }

    if (parcelData) {
      // Extract coordinates from centroid_geom or raw_entity
      let x: number | null = null;
      let y: number | null = null;
      
      if (parcelData.raw_entity?.centroid && Array.isArray(parcelData.raw_entity.centroid)) {
        [x, y] = parcelData.raw_entity.centroid;
      }
      
      if (x !== null && y !== null) {
        // Convert Web Mercator to WGS84
        // Using the same conversion logic as parcelsService
        const lng = (x / 20037508.34) * 180;
        let lat = (y / 20037508.34) * 180;
        lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
        
        return {
          GUSH: gush,
          HELKA: helka,
          X: x,
          Y: y,
          LAT: lat,
          LNG: lng,
          centroid: [x, y],
          ...parcelData
        };
      } else {
        console.log('Parcel found but no coordinates available');
      }
    }
    
    // If not found in database, try to find what parcels exist in this gush
    if (!parcelData) {
      // Try to get a list of available parcels in this gush from both tables
      const [result1, result2] = await Promise.all([
        supabase
          .from('govmap_gushim_parcels_by_search')
          .select('parcel, raw_entity')
          .eq('gush_num', gush)
          .limit(20),
        supabase
          .from('parcel_ownership_new')
          .select('parcel, raw_entity')
          .eq('gush_num', gush)
          .limit(20)
      ]);
      
      let availableHelkas: number[] = [];
      
      // Process results from govmap_gushim_parcels_by_search
      if (!result1.error && result1.data) {
        const helkas1 = result1.data
          .map((p: any) => {
            if (p.parcel) return p.parcel;
            if (p.raw_entity?.fields) {
              const helkaField = p.raw_entity.fields.find((f: any) => f.fieldName === 'חלקה');
              if (helkaField) return helkaField.fieldValue;
            }
            return null;
          })
          .filter((h: any): h is number => h !== null && typeof h === 'number');
        availableHelkas.push(...helkas1);
      }
      
      // Process results from parcel_ownership_new
      if (!result2.error && result2.data) {
        const helkas2 = result2.data
          .map((p: any) => {
            if (p.parcel) return p.parcel;
            if (p.raw_entity?.fields) {
              const helkaField = p.raw_entity.fields.find((f: any) => f.fieldName === 'חלקה');
              if (helkaField) return helkaField.fieldValue;
            }
            return null;
          })
          .filter((h: any): h is number => h !== null && typeof h === 'number');
        availableHelkas.push(...helkas2);
      }
      
      // Remove duplicates and sort
      availableHelkas = [...new Set(availableHelkas)].sort((a, b) => a - b);
      
      let errorMessage = `חלקה לא נמצאה במסד הנתונים. גוש: ${gush}, חלקה: ${helka}.`;
      if (availableHelkas.length > 0) {
        errorMessage += ` חלקות זמינות בגוש זה: ${availableHelkas.slice(0, 10).join(', ')}${availableHelkas.length > 10 ? '...' : ''}`;
      } else {
        errorMessage += ` לא נמצאו חלקות בגוש זה במסד הנתונים.`;
      }
      
      throw new Error(errorMessage);
    }
    
    // If found but no coordinates, also throw error
    throw new Error(`חלקה נמצאה במסד הנתונים אך אין קואורדינטות זמינות. גוש: ${gush}, חלקה: ${helka}.`);
  } catch (error) {
    console.error('Error searching parcel:', error);
    throw error;
  }
}
