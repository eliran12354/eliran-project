/**
 * Stable row IDs from dangerous_buildings_active (Postgres).
 */

import { query } from '../config/database.js';

export async function fetchAllDangerousBuildingIds(): Promise<string[]> {
  const rows = await query<{ id: unknown }>(`SELECT id FROM dangerous_buildings_active`);

  const seen = new Set<string>();
  for (const row of rows) {
    const id = row.id;
    if (id != null && String(id).trim() !== '') seen.add(String(id));
  }
  return [...seen];
}
