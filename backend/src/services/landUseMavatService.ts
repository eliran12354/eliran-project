import { query, count } from '../config/database.js';

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

type LandUseMavatGeoRow = Omit<LandUseMavatRaw, 'centroid_geom' | 'geom' | 'raw_entity' | 'scraped_at'> & {
  geometry: string | null;
};

function withinViewport(geometry: any, viewport?: ViewportBounds): boolean {
  if (!viewport) return true;
  const { minLat, maxLat, minLng, maxLng } = viewport;
  if (
    minLat === undefined || maxLat === undefined ||
    minLng === undefined || maxLng === undefined
  ) {
    return true;
  }
  if (!geometry) return false;

  let coords: number[] | null = null;
  if (geometry.type === 'Point') {
    coords = geometry.coordinates;
  } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    const rings = geometry.coordinates;
    if (rings && rings[0] && rings[0][0]) {
      coords = geometry.type === 'Polygon' ? rings[0][0] : rings[0][0][0];
    }
  }

  if (!coords || coords.length < 2) return false;
  const [lng, lat] = coords;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Get land_use_mavat chunk (for progressive loading).
 * Uses PostGIS ST_AsGeoJSON to convert geometry, transformed to WGS84 (SRID 4326).
 */
export async function getLandUseMavatChunk(
  page: number = 1,
  pageSize: number = 500,
  viewport?: ViewportBounds
): Promise<{ features: any[]; hasMore: boolean; page: number; totalLoaded: number }> {
  try {
    const from = (page - 1) * pageSize;

    const rows = await query<LandUseMavatGeoRow>(
      `SELECT id, govmap_object_id, layer_name, mavat_code, mavat_name, pl_id,
              pl_number, pl_name, station_desc, last_update_date, defq, source_code,
              area, len,
              ST_AsGeoJSON(ST_Transform(COALESCE(geom, centroid_geom), 4326)) AS geometry
       FROM land_use_mavat
       WHERE COALESCE(geom, centroid_geom) IS NOT NULL
       ORDER BY id ASC
       LIMIT $1 OFFSET $2`,
      [pageSize, from]
    );

    if (rows.length === 0) {
      return { features: [], hasMore: false, page, totalLoaded: from };
    }

    const features: Array<{ type: 'Feature'; properties: Record<string, unknown>; geometry: any }> = [];
    for (const row of rows) {
      const { geometry, ...properties } = row;
      const parsedGeometry = geometry ? JSON.parse(geometry) : null;
      if (!parsedGeometry) continue;
      if (!withinViewport(parsedGeometry, viewport)) continue;
      features.push({ type: 'Feature', properties, geometry: parsedGeometry });
    }

    const hasMore = rows.length === pageSize;
    return { features, hasMore, page, totalLoaded: from + features.length };
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
    return await count(
      `SELECT count(*)::int AS count FROM land_use_mavat WHERE centroid_geom IS NOT NULL`
    );
  } catch (error) {
    console.error('Error getting land_use_mavat count:', error);
    return 0;
  }
}

