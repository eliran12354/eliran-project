import { apiGet, toQuery, type Paginated } from "./client";
import type { MeirimPlan } from "@/lib/types/db";

export type { MeirimPlan } from "@/lib/types/db";

/**
 * Urban plan queries, served by the backend (`/api/plans`).
 * API shape matches the legacy frontend query helpers for easier migration.
 */
export const plansQueries = {
  getPlansPaginated(page = 1, limit = 50): Promise<Paginated<MeirimPlan>> {
    return apiGet(`/api/plans${toQuery({ page, limit })}`);
  },

  searchPlans(query: string, page = 1, limit = 50): Promise<Paginated<MeirimPlan>> {
    return apiGet(`/api/plans/search${toQuery({ q: query, page, limit })}`);
  },
};
