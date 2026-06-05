/**
 * PostGIS service for coordinate transformations and spatial queries
 */

import { queryOne } from '../config/database.js';

/**
 * Convert Web Mercator (EPSG:3857) coordinates to WGS84 (EPSG:4326)
 * using PostGIS ST_Transform. Returns [lat, lng].
 */
export async function convertWebMercatorToWGS84(
  x: number,
  y: number
): Promise<[number, number] | null> {
  try {
    const row = await queryOne<{ lat: number; lng: number }>(
      `SELECT ST_Y(p) AS lat, ST_X(p) AS lng
       FROM (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 3857), 4326) AS p) t`,
      [x, y]
    );
    if (!row) return null;
    return [row.lat, row.lng];
  } catch (err) {
    console.error('Error converting coordinates:', err);
    return null;
  }
}

/**
 * Create a PostGIS geometry point from coordinates and transform it to WGS84.
 */
export async function transformPointToWGS84(
  x: number,
  y: number,
  sourceSrid: number = 3857
): Promise<{ lat: number; lng: number } | null> {
  try {
    return await queryOne<{ lat: number; lng: number }>(
      `SELECT ST_Y(p) AS lat, ST_X(p) AS lng
       FROM (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), $3), 4326) AS p) t`,
      [x, y, sourceSrid]
    );
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

