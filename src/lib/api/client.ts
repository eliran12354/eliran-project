/**
 * Shared HTTP client for the backend API.
 *
 * The backend talks to PostgreSQL and exposes REST endpoints. Responses use a consistent
 * envelope: `{ success: true, data }` on success, or `{ success: false, error }`
 * with a non-2xx status on failure.
 */

import { getToken } from "./authApi";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = { signal?: AbortSignal; auth?: boolean };

async function request<T>(path: string, init: RequestInit, options?: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };

  if (options?.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal: options?.signal });

  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!res.ok || json.success === false) {
    throw new ApiError(json.error || json.message || `שגיאה (${res.status})`, res.status);
  }

  return (json.data ?? (json as unknown as T)) as T;
}

/** Build a query string from a params object, skipping null/undefined values. */
export function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>(path, { method: "GET" }, options);
}

export function apiPost<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(
    path,
    { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined },
    options,
  );
}

/** Standard shape for paginated list responses used by list endpoints. */
export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
