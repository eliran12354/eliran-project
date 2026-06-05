/**
 * TAMA/70 (metro) plans (tama70_plans) → GeoJSON FeatureCollection.
 * Geometry is converted to WGS84 (SRID 4326) by PostGIS.
 */

import { query } from '../config/database.js';

type FeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[] };
type GeoFeature = { type: 'Feature'; properties: Record<string, unknown>; geometry: unknown };

type Tama70Row = {
  id: number;
  govmap_object_id: number | null;
  plan_number: string | null;
  plan_name: string | null;
  last_update_raw: string | null;
  link_url: string | null;
  geometry: string | null;
};

export async function getTama70GeoJSON(): Promise<FeatureCollection> {
  const rows = await query<Tama70Row>(
    `SELECT id, govmap_object_id, plan_number, plan_name, last_update_raw, link_url,
            ST_AsGeoJSON(ST_Transform(COALESCE(centroid_geom, geom), 4326)) AS geometry
     FROM tama70_plans
     WHERE COALESCE(centroid_geom, geom) IS NOT NULL
     ORDER BY id ASC`
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
    features.push({
      type: 'Feature',
      properties: {
        id: row.id,
        object_id: row.govmap_object_id,
        plan_number: row.plan_number,
        plan_name: row.plan_name,
        last_update: row.last_update_raw,
        link_url: row.link_url,
      },
      geometry,
    });
  }

  return { type: 'FeatureCollection', features };
}
