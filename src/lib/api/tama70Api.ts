import type { FeatureCollection } from "geojson";
import { apiGet } from "./client";

/**
 * TAMA/70 plans GeoJSON, served by the backend (`/api/tama70`).
 * Geometry already transformed to WGS84 server-side.
 */
export const tama70Queries = {
  getAsGeoJSON(): Promise<FeatureCollection> {
    return apiGet(`/api/tama70/geojson`);
  },
};
