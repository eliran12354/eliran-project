/** Pagination helpers shared by list endpoints. */

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** Clamp a 1-based page number and compute the SQL OFFSET. */
export function pageOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}

export function buildPaginated<T>(rows: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    data: rows,
    total,
    page: Math.max(1, page),
    limit,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

/** Parse a query-string integer with a fallback and minimum. */
export function parseIntParam(value: unknown, fallback: number, min = 1): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : fallback;
}
