import { apiGet, toQuery, type Paginated } from "./client";
import type { Michraz, MichrazActive } from "@/lib/types/db";

export type { Michraz, MichrazActive } from "@/lib/types/db";

/**
 * Tender queries, served by the backend (`/api/tenders`).
 * API shape matches the legacy frontend query helpers for easier migration.
 */
export const tenderQueries = {
  getActivePaginated(page = 1, limit = 60): Promise<Paginated<MichrazActive>> {
    return apiGet(`/api/tenders/active${toQuery({ page, limit })}`);
  },

  searchActiveTenders(query: string, page = 1, limit = 60): Promise<Paginated<MichrazActive>> {
    return apiGet(`/api/tenders/active/search${toQuery({ q: query, page, limit })}`);
  },

  searchAllTenders(query: string, page = 1, limit = 20): Promise<Paginated<Michraz>> {
    return apiGet(`/api/tenders/search${toQuery({ q: query, page, limit })}`);
  },

  getSampleTenders(limit = 5): Promise<Michraz[]> {
    return apiGet(`/api/tenders/sample${toQuery({ limit })}`);
  },
};
