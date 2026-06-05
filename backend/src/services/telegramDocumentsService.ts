/**
 * Telegram documents (telegram_documents) queries.
 */

import { query, queryOne, count } from '../config/database.js';
import { pageOffset } from '../lib/pagination.js';

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

export type TelegramListResult = { rows: Record<string, unknown>[]; total: number };

const SORT_COLUMNS = new Set([
  'created_at',
  'total_area_sqm',
  'deposit_amount',
  'submission_deadline',
  'location_city',
]);
function safeSort(sortBy: string): string {
  return SORT_COLUMNS.has(sortBy) ? sortBy : 'created_at';
}
function safeOrder(sortOrder: string): 'ASC' | 'DESC' {
  return sortOrder === 'asc' ? 'ASC' : 'DESC';
}

// Columns the create form is allowed to write.
const INSERTABLE_COLUMNS = [
  'image_url',
  'location_city',
  'location_address',
  'property_type',
  'document_type',
  'contact_name',
  'contact_phone',
  'contact_email',
  'court_file_number',
  'parcel_number',
  'block_number',
  'total_area_sqm',
  'building_area_sqm',
  'deposit_amount',
  'deposit_currency',
  'submission_deadline',
  'processing_status',
] as const;

export async function getAllTelegramDocuments(): Promise<Record<string, unknown>[]> {
  return query(`SELECT * FROM telegram_documents ORDER BY created_at DESC`);
}

export async function searchTelegramDocuments(
  searchTerm: string,
  page: number,
  pageSize: number,
  sortBy: string,
  sortOrder: string
): Promise<TelegramListResult> {
  const like = `%${searchTerm}%`;
  const where =
    `location_city ILIKE $1 OR location_address ILIKE $1 OR document_type ILIKE $1 ` +
    `OR court_file_number ILIKE $1 OR parcel_number ILIKE $1 OR block_number ILIKE $1 ` +
    `OR contact_name ILIKE $1 OR contact_phone ILIKE $1`;
  const orderBy = `ORDER BY ${safeSort(sortBy)} ${safeOrder(sortOrder)}`;
  const offset = pageOffset(page, pageSize);

  const [rows, total] = await Promise.all([
    query(
      `SELECT * FROM telegram_documents WHERE ${where} ${orderBy} LIMIT $2 OFFSET $3`,
      [like, pageSize, offset]
    ),
    count(`SELECT count(*)::int AS count FROM telegram_documents WHERE ${where}`, [like]),
  ]);
  return { rows, total };
}

export async function getFilteredTelegramDocuments(
  filters: TelegramFilters,
  page: number,
  pageSize: number,
  sortBy: string,
  sortOrder: string
): Promise<TelegramListResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    conditions.push(clause.replace('$$', `$${params.length}`));
  };

  if (filters.document_type) add('document_type = $$', filters.document_type);
  if (filters.location_city) add('location_city ILIKE $$', `%${filters.location_city}%`);
  if (filters.property_type) add('property_type = $$', filters.property_type);
  if (filters.processing_status) add('processing_status = $$', filters.processing_status);
  if (filters.min_total_area != null) add('total_area_sqm >= $$', filters.min_total_area);
  if (filters.max_total_area != null) add('total_area_sqm <= $$', filters.max_total_area);
  if (filters.min_deposit != null) add('deposit_amount >= $$', filters.min_deposit);
  if (filters.max_deposit != null) add('deposit_amount <= $$', filters.max_deposit);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = `ORDER BY ${safeSort(sortBy)} ${safeOrder(sortOrder)}`;
  const offset = pageOffset(page, pageSize);

  const [rows, total] = await Promise.all([
    query(
      `SELECT * FROM telegram_documents ${where} ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    ),
    count(`SELECT count(*)::int AS count FROM telegram_documents ${where}`, params),
  ]);
  return { rows, total };
}

export async function createTelegramDocument(
  doc: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const params: unknown[] = [];

  for (const col of INSERTABLE_COLUMNS) {
    if (doc[col] !== undefined) {
      columns.push(col);
      params.push(doc[col]);
      placeholders.push(`$${params.length}`);
    }
  }

  if (!columns.length) {
    throw new Error('No valid fields to insert');
  }

  return queryOne(
    `INSERT INTO telegram_documents (${columns.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING *`,
    params
  );
}
