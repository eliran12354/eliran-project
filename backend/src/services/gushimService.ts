import { supabase } from '../config/database';

/**
 * Service for gushim data operations
 */

interface GushRaw {
  id: number;
  object_id: number;
  gush_num: number;
  gush_suffix: number | null;
  status_text: string | null;
  centroid: [number, number] | null;
}

interface ViewportBounds {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

/**
 * Convert Web Mercator coordinates to WGS84
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
 * Convert ITM coordinates to WGS84
 */
function convertITMToWGS84(
  x: number,
  y: number
): { lat: number; lng: number } | null {
  try {
    // Manual conversion - ITM to WGS84
    const a = 6378137.0;
    const f = 1/298.257223563;
    const e2 = 2*f - f*f;
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    const k0 = 1.0000067;
    const lat0 = 31.734393611111 * Math.PI / 180;
    const lon0 = 35.204516944444 * Math.PI / 180;
    const x0 = 219529.584;
    const y0 = 626907.39;
    const x_adj = x - x0;
    const y_adj = y - y0;
    const M = y_adj / (a * k0);
    const mu = M / (1 - e2/4 - 3*e4/64 - 5*e6/256);
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const J1 = 3*e1/2 - 27*e1*e1*e1/32;
    const J2 = 21*e1*e1/16 - 55*e1*e1*e1*e1/32;
    const J3 = 151*e1*e1*e1/96;
    const J4 = 1097*e1*e1*e1*e1/512;
    const fp = mu + J1*Math.sin(2*mu) + J2*Math.sin(4*mu) + J3*Math.sin(6*mu) + J4*Math.sin(8*mu);
    const e_2 = e2 / (1 - e2);
    const C1 = e_2 * Math.cos(fp) * Math.cos(fp);
    const T1 = Math.tan(fp) * Math.tan(fp);
    const N1 = a / Math.sqrt(1 - e2 * Math.sin(fp) * Math.sin(fp));
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(fp) * Math.sin(fp), 1.5);
    const D = x_adj / (N1 * k0);
    const lat_rad = fp - (N1 * Math.tan(fp) / R1) * (D*D/2 - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e_2)*D*D*D*D/24 + (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*e_2 - 3*C1*C1)*D*D*D*D*D*D/720);
    const lon_rad = lon0 + (D - (1 + 2*T1 + C1)*D*D*D/6 + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*e_2 + 24*T1*T1)*D*D*D*D*D/120) / Math.cos(fp);
    const lat = lat_rad * 180 / Math.PI;
    const lng = lon_rad * 180 / Math.PI;
    return { lat, lng };
  } catch (err) {
    console.error('Error converting ITM to WGS84:', err);
    return null;
  }
}

/**
 * Convert coordinates (Web Mercator or ITM) to WGS84
 */
function convertCoordinates(
  x: number,
  y: number
): { lat: number; lng: number } | null {
  // Check if coordinates are Web Mercator (large numbers > 1,000,000)
  if (x > 1000000 || y > 1000000) {
    return convertWebMercatorToWGS84Manual(x, y);
  } else if (x > 100000 || y > 100000) {
    // ITM coordinates
    return convertITMToWGS84(x, y);
  }
  // Already WGS84 or invalid
  return null;
}

/**
 * Get gushim chunk (for progressive loading)
 */
export async function getGushimChunk(
  page: number = 1,
  pageSize: number = 500,
  viewport?: ViewportBounds
): Promise<{ features: any[]; hasMore: boolean; page: number; totalLoaded: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query with pagination
    let query = supabase
      .from('govmap_gushim')
      .select('id, object_id, gush_num, gush_suffix, status_text, centroid')
      .not('centroid', 'is', null)
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

    // Convert coordinates and filter by viewport
    const gushim = data
      .map((gush: GushRaw) => {
        if (!gush.centroid || !Array.isArray(gush.centroid) || gush.centroid.length < 2) {
          return null;
        }

        const [x, y] = gush.centroid;
        const converted = convertCoordinates(x, y);
        
        if (!converted) {
          return null;
        }

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

        // Validate coordinates are in Israel bounds
        if (converted.lat < 29 || converted.lat > 34 || converted.lng < 34 || converted.lng > 36) {
          return null;
        }

        return {
          type: 'Feature',
          properties: {
            id: gush.id,
            object_id: gush.object_id,
            gush_num: gush.gush_num,
            gush_suffix: gush.gush_suffix,
            status_text: gush.status_text,
          },
          geometry: {
            type: 'Point',
            coordinates: [converted.lng, converted.lat], // GeoJSON: [lng, lat]
          },
        };
      })
      .filter((p): p is any => p !== null);

    // Check if there are more gushim
    const hasMore = gushim.length === pageSize;

    return {
      features: gushim,
      hasMore,
      page,
      totalLoaded: from + gushim.length,
    };
  } catch (error) {
    console.error('Error getting gushim chunk:', error);
    throw error;
  }
}

/**
 * Get gushim count
 */
export async function getGushimCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('govmap_gushim')
      .select('id', { count: 'exact', head: true })
      .not('centroid', 'is', null);

    if (error) {
      console.error('Error getting gushim count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting gushim count:', error);
    return 0;
  }
}

