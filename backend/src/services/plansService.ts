/**
 * Urban plans (meirim_plans) queries.
 */

import { query, count } from '../config/database.js';
import { pageOffset } from '../lib/pagination.js';

export type PlanListResult = { rows: Record<string, unknown>[]; total: number };

export async function getPlansPaginated(page: number, limit: number): Promise<PlanListResult> {
  const offset = pageOffset(page, limit);
  const [rows, total] = await Promise.all([
    query(`SELECT * FROM meirim_plans ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]),
    count(`SELECT count(*)::int AS count FROM meirim_plans`),
  ]);
  return { rows, total };
}

export async function searchPlans(
  searchTerm: string,
  page: number,
  limit: number
): Promise<PlanListResult> {
  const offset = pageOffset(page, limit);
  const like = `%${searchTerm}%`;
  const where =
    `plan_name ILIKE $1 OR plan_display_name ILIKE $1 OR county_name ILIKE $1 ` +
    `OR plan_number ILIKE $1 OR object_id::text ILIKE $1 OR mp_id::text ILIKE $1 ` +
    `OR meirim_id::text ILIKE $1`;
  const [rows, total] = await Promise.all([
    query(
      `SELECT * FROM meirim_plans WHERE ${where}
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [like, limit, offset]
    ),
    count(`SELECT count(*)::int AS count FROM meirim_plans WHERE ${where}`, [like]),
  ]);
  return { rows, total };
}
