/**
 * PostGIS service for coordinate transformations and spatial queries
 */

/**
 * Convert Web Mercator (EPSG:3857) coordinates to WGS84 (EPSG:4326)
 * This is done using PostGIS ST_Transform function
 */
export async function convertWebMercatorToWGS84(
  supabase: any,
  x: number,
  y: number
): Promise<[number, number] | null> {
  try {
    // Use PostGIS to transform coordinates
    const { data, error } = await supabase.rpc('transform_coordinates', {
      x: x,
      y: y,
      from_srid: 3857, // Web Mercator
      to_srid: 4326,   // WGS84
    });

    if (error) {
      console.error('PostGIS transform error:', error);
      return null;
    }

    if (data && data.length === 2) {
      return [data[1], data[0]]; // [lat, lng]
    }

    return null;
  } catch (err) {
    console.error('Error converting coordinates:', err);
    return null;
  }
}

/**
 * Create a PostGIS geometry point from coordinates
 * and transform it to WGS84
 */
export async function transformPointToWGS84(
  supabase: any,
  x: number,
  y: number,
  sourceSrid: number = 3857
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Use PostGIS ST_Transform to convert coordinates
    const { data, error } = await supabase.rpc('transform_point', {
      x: x,
      y: y,
      from_srid: sourceSrid,
      to_srid: 4326,
    });

    if (error) {
      console.error('PostGIS transform error:', error);
      return null;
    }

    if (data) {
      return { lat: data.lat, lng: data.lng };
    }

    return null;
  } catch (err) {
    console.error('Error transforming point:', err);
    return null;
  }
}

/**
 * Check if a point is within a bounding box (viewport)
 */
export function isPointInViewport(
  lat: number,
  lng: number,
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): boolean {
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

