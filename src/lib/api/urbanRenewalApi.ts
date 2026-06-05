import type { FeatureCollection } from "geojson";
import { apiGet } from "./client";
import type { UrbanRenewalProject } from "@/lib/types/db";

export type { UrbanRenewalProject } from "@/lib/types/db";

/**
 * Urban renewal data, served by the backend (`/api/urban-renewal-data`).
 * API shape matches the legacy frontend query helpers for easier migration.
 */
export const urbanRenewalProjectQueries = {
  getAll(): Promise<UrbanRenewalProject[]> {
    return apiGet(`/api/urban-renewal-data/projects`);
  },
};

export const urbanRenewalCompoundQueries = {
  getAsGeoJSON(): Promise<FeatureCollection> {
    return apiGet(`/api/urban-renewal-data/compounds-geojson`);
  },
};

export const talarPrepQueries = {
  getAsGeoJSON(): Promise<FeatureCollection> {
    return apiGet(`/api/urban-renewal-data/talar-prep-geojson`);
  },
};
