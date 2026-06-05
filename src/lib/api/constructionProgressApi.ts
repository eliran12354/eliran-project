import { apiGet, toQuery, type Paginated } from "./client";
import type { ConstructionProgressRecord } from "@/lib/types/db";

export type { ConstructionProgressRecord } from "@/lib/types/db";

/**
 * Construction progress queries, served by the backend (`/api/construction-progress`).
 * API shape matches the legacy frontend query helpers for easier migration.
 */
export const constructionProgressQueries = {
  getPaginated(page = 1, limit = 100): Promise<Paginated<ConstructionProgressRecord>> {
    return apiGet(`/api/construction-progress${toQuery({ page, limit })}`);
  },
};
