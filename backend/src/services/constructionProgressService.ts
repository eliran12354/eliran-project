/**
 * Construction progress (construction_progress) queries.
 */

import { query, count } from '../config/database.js';
import { pageOffset } from '../lib/pagination.js';

export type ConstructionListResult = { rows: Record<string, unknown>[]; total: number };

export async function getConstructionProgressPaginated(
  page: number,
  limit: number
): Promise<ConstructionListResult> {
  const offset = pageOffset(page, limit);
  const [rows, total] = await Promise.all([
    query(`SELECT * FROM construction_progress ORDER BY id ASC LIMIT $1 OFFSET $2`, [limit, offset]),
    count(`SELECT count(*)::int AS count FROM construction_progress`),
  ]);
  return { rows, total };
}
