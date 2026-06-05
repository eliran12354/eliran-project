import { apiGet, apiPost, toQuery } from "./client";
import type { TelegramDocument } from "@/lib/types/db";

export type { TelegramDocument } from "@/lib/types/db";

export type TelegramFilters = {
  document_type?: string;
  location_city?: string;
  property_type?: string;
  processing_status?: string;
  min_total_area?: number;
  max_total_area?: number;
  min_deposit?: number;
  max_deposit?: number;
};

type TelegramPage = { data: TelegramDocument[]; total: number };

/**
 * Telegram document queries, served by the backend (`/api/telegram-documents`).
 * API shape matches the legacy frontend query helpers for easier migration.
 */
export const telegramDocumentQueries = {
  getAll(): Promise<TelegramDocument[]> {
    return apiGet(`/api/telegram-documents/all`);
  },

  search(
    query: string,
    page = 1,
    pageSize = 50,
    sortBy = "created_at",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<TelegramPage> {
    return apiGet(
      `/api/telegram-documents/search${toQuery({ q: query, page, limit: pageSize, sortBy, sortOrder })}`,
    );
  },

  getFiltered(
    filters: TelegramFilters,
    page = 1,
    pageSize = 50,
    sortBy = "created_at",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<TelegramPage> {
    return apiGet(
      `/api/telegram-documents${toQuery({ ...filters, page, limit: pageSize, sortBy, sortOrder })}`,
    );
  },

  create(
    document: Omit<TelegramDocument, "id" | "created_at" | "updated_at">,
  ): Promise<TelegramDocument> {
    return apiPost(`/api/telegram-documents`, document, { auth: true });
  },
};
