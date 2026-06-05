import pg from 'pg';
import type { QueryResultRow } from 'pg';
import { config } from './env.js';

const { Pool, types } = pg;

// Match typical JSON API behaviour: node-postgres returns numeric/bigint as strings by default,
// which would silently change API payloads. Parse them back to numbers.
const PG_TYPE_NUMERIC = 1700;
const PG_TYPE_INT8 = 20;
types.setTypeParser(PG_TYPE_NUMERIC, (value) => (value === null ? null : Number(value)));
types.setTypeParser(PG_TYPE_INT8, (value) => (value === null ? null : Number(value)));

// `date` columns (no time component) are consumed as plain 'YYYY-MM-DD' strings in
// several services. Keep them as-is instead of letting pg build a timezone-shifted Date.
const PG_TYPE_DATE = 1082;
types.setTypeParser(PG_TYPE_DATE, (value) => value);

export const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
  max: config.database.poolMax,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client:', err);
});

/** Run a query and return all rows. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(text, params as unknown[] | undefined);
  return result.rows;
}

/** Run a query and return the first row, or null when there are none. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run a write query (INSERT/UPDATE/DELETE) and return the affected row count. */
export async function execute(text: string, params?: unknown[]): Promise<number> {
  const result = await pool.query(text, params as unknown[] | undefined);
  return result.rowCount ?? 0;
}

/** Run a `SELECT count(*) ...` query and return the count as a number. */
export async function count(text: string, params?: unknown[]): Promise<number> {
  const row = await queryOne<{ count: number | string }>(text, params);
  if (!row) return 0;
  return typeof row.count === 'number' ? row.count : Number(row.count);
}
