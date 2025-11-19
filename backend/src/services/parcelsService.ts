import { supabase } from '../config/database';

/**
 * Service for parcels data operations
 */

interface ParcelRaw {
  id: number;
  govmap_object_id: number;
  gush_num: number;
  gush_suffi: number;
  parcel: number;
  legal_area_m2: number | null;
  ownership_type: string | null;
  remark: string | null;
  doc_url: string | null;
  raw_entity: {
    centroid?: [number, number];
    fields?: Array<{ fieldName: string; fieldValue: any }>;
  } | null;
}

interface ViewportBounds {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

/**
 * Convert Web Mercator coordinates to WGS84
 * Uses manual conversion (PostGIS RPC can be added later for better accuracy)
 */
function convertCoordinates(
  x: number,
  y: number
): { lat: number; lng: number } | null {
  // Use manual conversion directly (no RPC function needed)
  return convertWebMercatorToWGS84Manual(x, y);
}

/**
 * Manual Web Mercator to WGS84 conversion (fallback)
 */
function convertWebMercatorToWGS84Manual(
  x: number,
  y: number
): { lat: number; lng: number } {
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return { lat, lng };
}

/**
 * Get parcels chunk (for progressive loading)
 */
export async function getParcelsChunk(
  page: number = 1,
  pageSize: number = 500,
  viewport?: ViewportBounds
): Promise<{ features: any[]; hasMore: boolean; page: number; totalLoaded: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query with pagination
    let query = supabase
      .from('parcel_ownership_new')
      .select('id, govmap_object_id, gush_num, gush_suffi, parcel, legal_area_m2, ownership_type, remark, doc_url, raw_entity')
      .not('raw_entity->centroid', 'is', null)
      .order('id', { ascending: true })
      .range(from, to);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert coordinates and filter by viewport
    const parcels = data
      .map((parcel: ParcelRaw) => {
        const centroid = parcel.raw_entity?.centroid;
        if (!centroid || !Array.isArray(centroid) || centroid.length < 2) {
          return null;
        }

        const [x, y] = centroid;
        
        // Check if coordinates are Web Mercator (large numbers)
        if (x > 1000000 || y > 1000000) {
          const converted = convertCoordinates(x, y);
          if (!converted) return null;

          // Filter by viewport if provided
          if (viewport) {
            const { minLat, maxLat, minLng, maxLng } = viewport;
            if (
              minLat !== undefined && maxLat !== undefined &&
              minLng !== undefined && maxLng !== undefined
            ) {
              if (
                converted.lat < minLat || converted.lat > maxLat ||
                converted.lng < minLng || converted.lng > maxLng
              ) {
                return null;
              }
            }
          }

          // Extract properties from fields array
          const fields = parcel.raw_entity?.fields || [];
          const gushNum = fields.find((f: any) => f.fieldName === 'גוש')?.fieldValue || parcel.gush_num;
          const gushSuffix = fields.find((f: any) => f.fieldName === 'תת גוש')?.fieldValue || parcel.gush_suffi;
          const parcelNum = fields.find((f: any) => f.fieldName === 'חלקה')?.fieldValue || parcel.parcel;
          const legalArea = fields.find((f: any) => f.fieldName === 'שטח רשום (מ"ר)')?.fieldValue || parcel.legal_area_m2;
          const ownershipType = fields.find((f: any) => f.fieldName === 'סוג בעלות')?.fieldValue || parcel.ownership_type;
          const remark = fields.find((f: any) => f.fieldName === 'הערה')?.fieldValue || parcel.remark;

          return {
            type: 'Feature',
            properties: {
              id: parcel.id,
              object_id: parcel.govmap_object_id,
              gush_num: gushNum,
              gush_suffix: gushSuffix,
              parcel: parcelNum,
              legal_area: legalArea,
              ownership_type: ownershipType,
              remark: remark,
              doc_url: parcel.doc_url,
            },
            geometry: {
              type: 'Point',
              coordinates: [converted.lng, converted.lat], // GeoJSON: [lng, lat]
            },
          };
        }

        return null;
      })
      .filter((p): p is any => p !== null);

    // Check if there are more parcels
    const hasMore = parcels.length === pageSize;

    return {
      features: parcels,
      hasMore,
      page,
      totalLoaded: from + parcels.length,
    };
  } catch (error) {
    console.error('Error getting parcels chunk:', error);
    throw error;
  }
}

/**
 * Get parcels from database (all at once - for backward compatibility)
 */
export async function getParcels(
  viewport?: ViewportBounds,
  limit: number = 1000
): Promise<any[]> {
  try {
    // Build query
    let query = supabase
      .from('parcel_ownership_new')
      .select('id, govmap_object_id, gush_num, gush_suffi, parcel, legal_area_m2, ownership_type, remark, doc_url, raw_entity')
      .not('raw_entity->centroid', 'is', null)
      .limit(limit);

    // Apply viewport filter if provided (will filter after coordinate conversion)
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert coordinates and filter by viewport
    const parcels = data
      .map((parcel: ParcelRaw) => {
        const centroid = parcel.raw_entity?.centroid;
        if (!centroid || !Array.isArray(centroid) || centroid.length < 2) {
          return null;
        }

        const [x, y] = centroid;
        
        // Check if coordinates are Web Mercator (large numbers)
        if (x > 1000000 || y > 1000000) {
          const converted = convertCoordinates(x, y);
          if (!converted) return null;

          // Filter by viewport if provided
          if (viewport) {
            const { minLat, maxLat, minLng, maxLng } = viewport;
            if (
              minLat !== undefined && maxLat !== undefined &&
              minLng !== undefined && maxLng !== undefined
            ) {
              if (
                converted.lat < minLat || converted.lat > maxLat ||
                converted.lng < minLng || converted.lng > maxLng
              ) {
                return null;
              }
            }
          }

          // Extract properties from fields array
          const fields = parcel.raw_entity?.fields || [];
          const gushNum = fields.find((f: any) => f.fieldName === 'גוש')?.fieldValue || parcel.gush_num;
          const gushSuffix = fields.find((f: any) => f.fieldName === 'תת גוש')?.fieldValue || parcel.gush_suffi;
          const parcelNum = fields.find((f: any) => f.fieldName === 'חלקה')?.fieldValue || parcel.parcel;
          const legalArea = fields.find((f: any) => f.fieldName === 'שטח רשום (מ"ר)')?.fieldValue || parcel.legal_area_m2;
          const ownershipType = fields.find((f: any) => f.fieldName === 'סוג בעלות')?.fieldValue || parcel.ownership_type;
          const remark = fields.find((f: any) => f.fieldName === 'הערה')?.fieldValue || parcel.remark;

          return {
            type: 'Feature',
            properties: {
              id: parcel.id,
              object_id: parcel.govmap_object_id,
              gush_num: gushNum,
              gush_suffix: gushSuffix,
              parcel: parcelNum,
              legal_area: legalArea,
              ownership_type: ownershipType,
              remark: remark,
              doc_url: parcel.doc_url,
            },
            geometry: {
              type: 'Point',
              coordinates: [converted.lng, converted.lat], // GeoJSON: [lng, lat]
            },
          };
        }

        return null;
      })
      .filter((p): p is any => p !== null);

    return parcels;
  } catch (error) {
    console.error('Error getting parcels:', error);
    throw error;
  }
}

/**
 * Get parcels count
 */
export async function getParcelsCount(): Promise<number> {
  try {
    // Use a simpler query - just count all rows
    // We'll filter by centroid existence in the actual data query
    const { count, error } = await supabase
      .from('parcel_ownership_new')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting parcels count:', error);
      // Return 0 instead of throwing to prevent API errors
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting parcels count:', error);
    // Return 0 instead of throwing to prevent API errors
    return 0;
  }
}

