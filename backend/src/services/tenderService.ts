/**
 * Tender (michraz) queries over `michrazim_active` and `michrazim`.
 */

import { query, count } from '../config/database.js';
import { pageOffset } from '../lib/pagination.js';

export type TenderListResult = { rows: Record<string, unknown>[]; total: number };

/** Active tenders, newest first, paginated. */
export async function getActivePaginated(page: number, limit: number): Promise<TenderListResult> {
  const offset = pageOffset(page, limit);
  const [rows, total] = await Promise.all([
    query(
      `SELECT * FROM michrazim_active ORDER BY last_seen_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    count(`SELECT count(*)::int AS count FROM michrazim_active`),
  ]);
  return { rows, total };
}

/** Search active tenders by city / tender id / name (in the `raw` JSONB). */
export async function searchActiveTenders(
  searchTerm: string,
  page: number,
  limit: number
): Promise<TenderListResult> {
  const offset = pageOffset(page, limit);
  const like = `%${searchTerm}%`;
  const where = `raw->>'Shchuna' ILIKE $1 OR raw->>'MichrazID' ILIKE $1 OR raw->>'MichrazName' ILIKE $1`;
  const [rows, total] = await Promise.all([
    query(
      `SELECT * FROM michrazim_active WHERE ${where}
       ORDER BY last_seen_at DESC LIMIT $2 OFFSET $3`,
      [like, limit, offset]
    ),
    count(`SELECT count(*)::int AS count FROM michrazim_active WHERE ${where}`, [like]),
  ]);
  return { rows, total };
}

/** Search the full `michrazim` table by title / area / several `raw` fields. */
export async function searchAllTenders(
  searchTerm: string,
  page: number,
  limit: number
): Promise<TenderListResult> {
  const offset = pageOffset(page, limit);
  const like = `%${searchTerm}%`;
  const where =
    `title ILIKE $1 OR area ILIKE $1 OR raw->>'MichrazName' ILIKE $1 ` +
    `OR raw->>'Shchuna' ILIKE $1 OR raw->>'KodYeshuv' ILIKE $1 ` +
    `OR raw->>'KodMerchav' ILIKE $1 OR raw->>'MichrazID' ILIKE $1`;
  const [rows, total] = await Promise.all([
    query(
      `SELECT * FROM michrazim WHERE ${where}
       ORDER BY publication_date DESC LIMIT $2 OFFSET $3`,
      [like, limit, offset]
    ),
    count(`SELECT count(*)::int AS count FROM michrazim WHERE ${where}`, [like]),
  ]);
  return { rows, total };
}

/** A few sample rows from `michrazim` (debug helper used by the dashboard). */
export async function getSampleTenders(limit: number): Promise<Record<string, unknown>[]> {
  return query(
    `SELECT * FROM michrazim ORDER BY publication_date DESC LIMIT $1`,
    [limit]
  );
}
