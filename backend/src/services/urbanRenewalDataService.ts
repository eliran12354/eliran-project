/**
 * Urban renewal data for the map / hot-areas page:
 *  - `urban_renewal_projects` rows
 *  - `govmap_urban_renewal_compounds` as a GeoJSON FeatureCollection (PostGIS geom)
 *  - `govmap_talar_prep` as a GeoJSON FeatureCollection (text geom / jsonb centroid)
 */

import { query } from '../config/database.js';

type FeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[] };
type GeoFeature = { type: 'Feature'; properties: Record<string, unknown>; geometry: unknown };

/** All urban renewal projects, newest first. */
export async function getAllProjects(): Promise<Record<string, unknown>[]> {
  return query(`SELECT * FROM urban_renewal_projects ORDER BY created_at DESC`);
}

const COMPOUND_PROPERTY_COLUMNS = [
  'object_id',
  'caption',
  'heara',
  'kishur',
  'source',
  'project_name',
  'city_name',
  'city_code',
  'neighborhood_name',
  'status',
  'approval_stage',
  'housing_units',
  'planned_units',
  'executing_body',
  'last_update',
  'remarks',
] as const;

type CompoundRow = Record<string, unknown> & { geometry: string | null };

/** Urban renewal compounds → GeoJSON, geometry transformed to WGS84 via PostGIS. */
export async function getCompoundsGeoJSON(): Promise<FeatureCollection> {
  const rows = await query<CompoundRow>(
    `SELECT ${COMPOUND_PROPERTY_COLUMNS.join(', ')},
            ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry
     FROM govmap_urban_renewal_compounds
     WHERE geom IS NOT NULL
     LIMIT 1000`
  );

  const features: GeoFeature[] = [];
  for (const row of rows) {
    if (!row.geometry) continue;
    let geometry: unknown;
    try {
      geometry = JSON.parse(row.geometry);
    } catch {
      continue;
    }
    const properties: Record<string, unknown> = {};
    for (const col of COMPOUND_PROPERTY_COLUMNS) properties[col] = row[col];
    features.push({ type: 'Feature', properties, geometry });
  }

  return { type: 'FeatureCollection', features };
}

type TalarRow = {
  id: number;
  object_id: number | null;
  geom: string | null;
  centroid: unknown;
  fields: Record<string, unknown> | null;
  raw_entity: Record<string, unknown> | null;
};

const WKT_RE = /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON)\s*Z?\s*\(/i;

/** Pull a [lng, lat] pair out of the various centroid shapes seen in the data. */
function extractCentroidCoords(centroid: unknown): [number, number] | null {
  if (!centroid) return null;
  if (Array.isArray(centroid)) {
    const nums = centroid.map(Number).filter((n) => !Number.isNaN(n));
    return nums.length >= 2 ? [nums[0], nums[1]] : null;
  }
  if (typeof centroid === 'object') {
    const c = centroid as Record<string, unknown>;
    if (Array.isArray(c.coordinates)) {
      const nums = (c.coordinates as unknown[]).map(Number).filter((n) => !Number.isNaN(n));
      return nums.length >= 2 ? [nums[0], nums[1]] : null;
    }
    if (c.lng !== undefined && c.lat !== undefined) return [Number(c.lng), Number(c.lat)];
    if (c.x !== undefined && c.y !== undefined) return [Number(c.x), Number(c.y)];
    const nums = Object.values(c).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    return nums.length >= 2 ? [nums[0], nums[1]] : null;
  }
  return null;
}

function parseTalarGeometry(geom: string | null, centroid: unknown): unknown | null {
  if (typeof geom === 'string' && geom.trim()) {
    const trimmed = geom.trim();
    if (!WKT_RE.test(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && parsed.type && parsed.coordinates) return parsed;
      } catch {
        /* fall through to centroid */
      }
    }
  }

  // Fallback to centroid, but only when it's already in WGS84 range
  // (Israel-Grid / Web-Mercator centroids can't be used without a projection).
  const coords = extractCentroidCoords(centroid);
  if (coords && Math.abs(coords[0]) <= 1000 && Math.abs(coords[1]) <= 1000) {
    return { type: 'Point', coordinates: coords };
  }
  return null;
}

/** Talar-prep plans → GeoJSON FeatureCollection. */
export async function getTalarPrepGeoJSON(): Promise<FeatureCollection> {
  const rows = await query<TalarRow>(
    `SELECT id, object_id, geom, centroid, fields, raw_entity
     FROM govmap_talar_prep
     WHERE centroid IS NOT NULL
     LIMIT 500`
  );

  const features: GeoFeature[] = [];
  for (const row of rows) {
    const geometry = parseTalarGeometry(row.geom, row.centroid);
    if (!geometry) continue;

    const properties: Record<string, unknown> = { id: row.id, object_id: row.object_id };
    if (row.fields && typeof row.fields === 'object') Object.assign(properties, row.fields);
    if (row.raw_entity && typeof row.raw_entity === 'object') {
      for (const [key, value] of Object.entries(row.raw_entity)) {
        if (!(key in properties)) properties[key] = value;
      }
    }

    features.push({ type: 'Feature', properties, geometry });
  }

  return { type: 'FeatureCollection', features };
}
