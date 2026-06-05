/**
 * Real-estate deals (deals) queries.
 */

import { query, count } from '../config/database.js';
import { pageOffset } from '../lib/pagination.js';

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

export type DealListResult = { rows: Record<string, unknown>[]; total: number };

// Whitelist of sortable columns — never interpolate raw user input into ORDER BY.
const SORT_COLUMNS = new Set(['deal_date', 'price_nis', 'area_m2']);
function safeSort(sortBy: string): string {
  return SORT_COLUMNS.has(sortBy) ? sortBy : 'deal_date';
}
function safeOrder(sortOrder: string): 'ASC' | 'DESC' {
  return sortOrder === 'asc' ? 'ASC' : 'DESC';
}

/** All deals, newest first. Used by the UI to derive city/type filter options. */
export async function getAllDeals(): Promise<Record<string, unknown>[]> {
  return query(`SELECT * FROM deals ORDER BY deal_date DESC`);
}

export async function getFilteredDeals(
  filters: DealFilters,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: string
): Promise<DealListResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    conditions.push(clause.replace('$$', `$${params.length}`));
  };

  if (filters.city_name) add('city_name = $$', filters.city_name);
  if (filters.property_type) add('property_type = $$', filters.property_type);
  if (filters.min_price != null) add('price_nis >= $$', filters.min_price);
  if (filters.max_price != null) add('price_nis <= $$', filters.max_price);
  if (filters.min_area != null) add('area_m2 >= $$', filters.min_area);
  if (filters.max_area != null) add('area_m2 <= $$', filters.max_area);
  if (filters.min_rooms != null) add('rooms >= $$', filters.min_rooms);
  if (filters.max_rooms != null) add('rooms <= $$', filters.max_rooms);
  if (filters.date_from) add('deal_date >= $$', filters.date_from);
  if (filters.date_to) add('deal_date <= $$', filters.date_to);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = `ORDER BY ${safeSort(sortBy)} ${safeOrder(sortOrder)}`;
  const offset = pageOffset(page, limit);

  const [rows, total] = await Promise.all([
    query(
      `SELECT * FROM deals ${where} ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    count(`SELECT count(*)::int AS count FROM deals ${where}`, params),
  ]);
  return { rows, total };
}

export async function searchDeals(
  searchTerm: string,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: string
): Promise<DealListResult> {
  const like = `%${searchTerm}%`;
  const where = `address ILIKE $1 OR block_parcel_subparcel ILIKE $1`;
  const orderBy = `ORDER BY ${safeSort(sortBy)} ${safeOrder(sortOrder)}`;
  const offset = pageOffset(page, limit);

  const [rows, total] = await Promise.all([
    query(
      `SELECT * FROM deals WHERE ${where} ${orderBy} LIMIT $2 OFFSET $3`,
      [like, limit, offset]
    ),
    count(`SELECT count(*)::int AS count FROM deals WHERE ${where}`, [like]),
  ]);
  return { rows, total };
}
