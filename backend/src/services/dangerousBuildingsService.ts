/**
 * Dangerous buildings (dangerous_buildings_active) queries.
 */

import { query } from '../config/database.js';

/** All active dangerous-building records. */
export async function getActiveDangerousBuildings(): Promise<Record<string, unknown>[]> {
  return query(`SELECT * FROM dangerous_buildings_active`);
}
