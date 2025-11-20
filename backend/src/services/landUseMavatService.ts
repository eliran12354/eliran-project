import { supabase } from '../config/database.js';

/**
 * Service for land_use_mavat data operations
 */

interface LandUseMavatRaw {
  id: number;
  govmap_object_id: number;
  layer_name: string;
  mavat_code: number | null;
  mavat_name: string | null;
  pl_id: number | null;
  pl_number: string | null;
  pl_name: string | null;
  station_desc: string | null;
  last_update_date: string | null;
  defq: string | null;
  source_code: string | null;
  area: number | null;
  len: number | null;
  centroid_geom: any; // PostGIS geometry
  geom: any; // PostGIS geometry
  raw_entity: any | null;
  scraped_at: string | null;
}

interface ViewportBounds {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

/**
 * Get land_use_mavat chunk (for progressive loading)
 * Uses RPC function to convert PostGIS geometry to GeoJSON
 */
export async function getLandUseMavatChunk(
  page: number = 1,
  pageSize: number = 500,
  viewport?: ViewportBounds
): Promise<{ features: any[]; hasMore: boolean; page: number; totalLoaded: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Try RPC function first (if it exists) - uses PostGIS for accurate geometry conversion
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_land_use_mavat_geojson', {
          page_num: page,
          page_size: pageSize
        });

      if (rpcError) {
        console.log('RPC function error:', rpcError);
        console.log('Error details:', JSON.stringify(rpcError, null, 2));
        // Continue to fallback
      } else if (rpcData) {
        console.log('RPC function returned data:', {
          type: rpcData.type,
          hasFeatures: !!rpcData.features,
          featuresLength: rpcData.features?.length || 0,
          firstFeature: rpcData.features?.[0] || null
        });

        if (rpcData.features && rpcData.features.length > 0) {
          console.log(`RPC function returned ${rpcData.features.length} features`);
          
          // Filter by viewport if provided
          let filteredFeatures = rpcData.features;
          if (viewport) {
            const { minLat, maxLat, minLng, maxLng } = viewport;
            if (
              minLat !== undefined && maxLat !== undefined &&
              minLng !== undefined && maxLng !== undefined
            ) {
              filteredFeatures = rpcData.features.filter((feature: any) => {
                if (!feature.geometry) return false;
                
                // Extract coordinates based on geometry type
                let coords: number[] | null = null;
                if (feature.geometry.type === 'Point') {
                  coords = feature.geometry.coordinates;
                } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                  // Use first coordinate of first ring
                  const rings = feature.geometry.coordinates;
                  if (rings && rings[0] && rings[0][0]) {
                    coords = rings[0][0];
                  }
                }
                
                if (!coords || coords.length < 2) return false;
                
                const [lng, lat] = coords;
                return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
              });
            }
          }

          // Check if there are more features
          const hasMore = rpcData.features.length === pageSize;

          return {
            features: filteredFeatures,
            hasMore,
            page,
            totalLoaded: from + filteredFeatures.length,
          };
        } else {
          console.log('RPC function returned empty features array');
        }
      } else {
        console.log('RPC function returned null/undefined data');
      }
    } catch (rpcErr: any) {
      console.log('RPC function exception:', rpcErr?.message || rpcErr);
      console.log('Exception details:', rpcErr);
    }

    // Fallback: Direct query with PostGIS ST_AsGeoJSON
    // Note: Supabase doesn't automatically convert PostGIS geometry, so we need RPC
    // For now, we'll query centroid_geom and use it as Point geometry
    let query = supabase
      .from('land_use_mavat')
      .select('id, govmap_object_id, layer_name, mavat_code, mavat_name, pl_id, pl_number, pl_name, station_desc, last_update_date, defq, source_code, area, len, centroid_geom')
      .not('centroid_geom', 'is', null)
      .order('id', { ascending: true })
      .range(from, to);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        features: [],
        hasMore: false,
        page,
        totalLoaded: from,
      };
    }

    // Convert to GeoJSON features
    // Since Supabase doesn't automatically convert PostGIS geometry,
    // we need to use an RPC function or handle it differently
    // For now, we'll return empty features and log a warning
    console.warn('Direct query without RPC function - geometry conversion needed');
    console.warn('Please create RPC function get_land_use_mavat_geojson() in database');

    // Return empty for now - RPC function should be created
    return {
      features: [],
      hasMore: false,
      page,
      totalLoaded: from,
    };
  } catch (error) {
    console.error('Error getting land_use_mavat chunk:', error);
    throw error;
  }
}

/**
 * Get land_use_mavat count
 */
export async function getLandUseMavatCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('land_use_mavat')
      .select('id', { count: 'exact', head: true })
      .not('centroid_geom', 'is', null);

    if (error) {
      console.error('Error getting land_use_mavat count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting land_use_mavat count:', error);
    return 0;
  }
}

