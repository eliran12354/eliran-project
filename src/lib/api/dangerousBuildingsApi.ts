import { apiGet } from "./client";

/**
 * Dangerous buildings, served by the backend (`/api/dangerous-buildings`).
 * Returns raw rows; the page maps them to its display shape.
 */
export const dangerousBuildingsQueries = {
  getActive(): Promise<Record<string, any>[]> {
    return apiGet(`/api/dangerous-buildings`);
  },
};
