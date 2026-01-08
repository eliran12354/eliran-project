/**
 * Service for GovMap API integration
 */

import { supabase } from '../config/database.js';

/**
 * Interface for GovMap entitiesByPoint request
 */
interface EntitiesByPointRequest {
  x: number; // X coordinate (ITM)
  y: number; // Y coordinate (ITM)
  layers?: number[]; // Layer IDs to query (optional, defaults to layer 16 - deals)
  radius?: number; // Search radius in meters (optional)
}

/**
 * Interface for GovMap entity field
 */
interface GovMapField {
  fieldName: string;
  fieldValue: string | number;
  fieldType: number;
  isVisible: boolean;
}

/**
 * Interface for GovMap entity
 */
interface GovMapEntity {
  objectId: number;
  centroid: [number, number]; // [x, y] in ITM coordinates
  geom?: string; // WKT geometry
  fields: GovMapField[];
}

/**
 * Interface for GovMap layer response
 */
interface GovMapLayerResponse {
  name: string;
  caption: string;
  fieldsMapping: Record<string, string>;
  entities: GovMapEntity[];
}

/**
 * Get entities from GovMap by point (coordinates)
 * Uses the layers-catalog/entitiesByPoint API endpoint
 * 
 * @param x - X coordinate in ITM
 * @param y - Y coordinate in ITM
 * @param layers - Array of layer IDs (default: [16] for real estate deals)
 * @param radius - Search radius in meters (default: 500) - maps to tolerance
 * @returns Array of layer responses with entities
 */
export async function getEntitiesByPoint(
  x: number,
  y: number,
  layers: number[] = [16], // Default to layer 16 (real estate deals)
  radius: number = 500
): Promise<GovMapLayerResponse[]> {
  try {
    const url = 'https://www.govmap.gov.il/api/layers-catalog/entitiesByPoint';
    
    // GovMap API expects:
    // - point: [x, y] array
    // - layers: array of objects with { layerId: string }
    // - tolerance: number (search radius in meters)
    const requestBody = {
      point: [x, y],
      layers: layers.map(id => ({ layerId: id.toString() })),
      tolerance: radius,
    };

    console.log('Calling GovMap entitiesByPoint API:', {
      url,
      body: requestBody,
      coordinates_note: `Y coordinate ${y} seems ${y > 1000000 ? 'like Web Mercator' : y < 500000 ? 'too small for ITM' : 'possibly correct ITM'}`,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorDetails = '';
      try {
        const errorData = await response.text();
        errorDetails = errorData;
      } catch (e) {
        // Ignore if can't parse error
      }
      throw new Error(`GovMap API returned ${response.status}: ${response.statusText}. Details: ${errorDetails}`);
    }

    const data = await response.json();

    // Log the actual response to see what we're getting
    console.log('GovMap API response:', JSON.stringify(data, null, 2));
    console.log('Response type:', typeof data);
    console.log('Is array?', Array.isArray(data));

    if (!data) {
      throw new Error('Empty response from GovMap API');
    }

    // Check if response is an array
    if (Array.isArray(data)) {
      console.log(`✅ Got ${data.length} layer(s) from GovMap API`);
      return data as GovMapLayerResponse[];
    }

    // Maybe it's an object with a data/result property?
    if (typeof data === 'object') {
      if (data.data && Array.isArray(data.data)) {
        console.log(`✅ Got ${data.data.length} layer(s) from GovMap API (in data property)`);
        return data.data as GovMapLayerResponse[];
      }
      if (data.result && Array.isArray(data.result)) {
        console.log(`✅ Got ${data.result.length} layer(s) from GovMap API (in result property)`);
        return data.result as GovMapLayerResponse[];
      }
      if (data.layers && Array.isArray(data.layers)) {
        console.log(`✅ Got ${data.layers.length} layer(s) from GovMap API (in layers property)`);
        return data.layers as GovMapLayerResponse[];
      }
    }

    throw new Error(`Invalid response format from GovMap API. Got: ${typeof data}, Expected: array or object with array property`);
  } catch (error: any) {
    console.error('Error calling GovMap entitiesByPoint API:', error);
    throw new Error(`Failed to fetch entities from GovMap: ${error.message}`);
  }
}

/**
 * Get real estate deals from GovMap by point
 * Convenience function that calls getEntitiesByPoint with layer 16
 * 
 * @param x - X coordinate in ITM
 * @param y - Y coordinate in ITM
 * @param radius - Search radius in meters (default: 500)
 * @returns Array of deal entities
 */
export async function getRealEstateDealsByPoint(
  x: number,
  y: number,
  radius: number = 500
): Promise<GovMapEntity[]> {
  try {
    const layers = await getEntitiesByPoint(x, y, [16], radius);
    
    // Find the deals layer (layer 16)
    const dealsLayer = layers.find(layer => layer.name === 'nadlan');
    
    if (!dealsLayer || !dealsLayer.entities) {
      return [];
    }

    return dealsLayer.entities;
  } catch (error: any) {
    console.error('Error getting real estate deals:', error);
    return [];
  }
}

/**
 * Get multiple layer types from GovMap by point
 * 
 * @param x - X coordinate in ITM
 * @param y - Y coordinate in ITM
 * @param layerIds - Array of layer IDs to query
 * @param radius - Search radius in meters (default: 500)
 * @returns Map of layer name to entities
 */
export async function getMultipleLayersByPoint(
  x: number,
  y: number,
  layerIds: number[],
  radius: number = 500
): Promise<Record<string, GovMapEntity[]>> {
  try {
    const layers = await getEntitiesByPoint(x, y, layerIds, radius);
    
    const result: Record<string, GovMapEntity[]> = {};
    
    for (const layer of layers) {
      result[layer.name] = layer.entities || [];
    }
    
    return result;
  } catch (error: any) {
    console.error('Error getting multiple layers:', error);
    return {};
  }
}

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

/**
 * Geocode address using GovMap search API
 * GET https://ags.govmap.gov.il/govmap/api/search/find
 */
export async function geocodeAddress(searchTerm: string): Promise<Array<{
  text: string;
  coordinates?: [number, number]; // [x, y] in ITM format
  address?: string;
}>> {
  try {
    const url = `https://ags.govmap.gov.il/govmap/api/search/find?term=${encodeURIComponent(searchTerm)}&layers=0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20&maxSuggestions=5`;
    
    console.log(`🔍 Geocoding address: ${searchTerm}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`GovMap geocoding API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !data.suggestions || !Array.isArray(data.suggestions)) {
      console.log('⚠️ No suggestions found in GovMap geocoding response');
      return [];
    }

    console.log(`✅ Found ${data.suggestions.length} geocoding suggestions`);

    return data.suggestions.map((suggestion: any) => ({
      text: suggestion.text || suggestion.label || '',
      coordinates: suggestion.coordinates || suggestion.coords || undefined,
      address: suggestion.address || suggestion.text || undefined,
    }));
  } catch (error: any) {
    console.error('Error geocoding address:', error);
    throw new Error(`Failed to geocode address: ${error.message}`);
  }
}
