import { apiGet, toQuery } from "./client";
import type { Deal } from "@/lib/types/db";

export type { Deal } from "@/lib/types/db";

export type DealFilters = {
  city_name?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  min_rooms?: number;
  max_rooms?: number;
  date_from?: string;
  date_to?: string;
};

type DealsPage = { data: Deal[]; total: number };

/**
 * Deal queries, served by the backend (`/api/deals`).
 * API shape matches the legacy frontend query helpers for easier migration.
 */
export const dealQueries = {
  /** All deals (used by the UI to derive city / property-type filter options). */
  getAllPaginated(): Promise<Deal[]> {
    return apiGet(`/api/deals/all`);
  },

  getFiltered(
    filters: DealFilters,
    page = 1,
    pageSize = 150,
    sortBy = "deal_date",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<DealsPage> {
    return apiGet(
      `/api/deals${toQuery({ ...filters, page, limit: pageSize, sortBy, sortOrder })}`,
    );
  },

  search(
    searchTerm: string,
    page = 1,
    pageSize = 150,
    sortBy = "deal_date",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<DealsPage> {
    return apiGet(
      `/api/deals/search${toQuery({ q: searchTerm, page, limit: pageSize, sortBy, sortOrder })}`,
    );
  },
};
