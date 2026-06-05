/**
 * Persists dataset fingerprints for sync jobs (table: app_data_snapshots).
 */

import { queryOne, execute } from '../config/database.js';

export const URBAN_RENEWAL_SNAPSHOT_KEY = 'urban_renewal_mitchamim';
export const DANGEROUS_BUILDINGS_SNAPSHOT_KEY = 'dangerous_buildings_active';

export async function getKnownIds(snapshotKey: string): Promise<string[] | null> {
  const row = await queryOne<{ known_ids: unknown }>(
    `SELECT known_ids FROM app_data_snapshots WHERE snapshot_key = $1`,
    [snapshotKey]
  );

  if (!row) return null;

  const raw = row.known_ids;
  if (raw == null) return null;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

export async function saveKnownIds(snapshotKey: string, knownIds: string[]): Promise<void> {
  await execute(
    `INSERT INTO app_data_snapshots (snapshot_key, known_ids, updated_at)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (snapshot_key)
     DO UPDATE SET known_ids = EXCLUDED.known_ids, updated_at = EXCLUDED.updated_at`,
    [snapshotKey, JSON.stringify(knownIds), new Date().toISOString()]
  );
}
