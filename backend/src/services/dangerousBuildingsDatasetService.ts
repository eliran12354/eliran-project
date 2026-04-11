/**
 * Stable row IDs from dangerous_buildings_active (Supabase).
 */

import { supabase } from '../config/database.js';

export async function fetchAllDangerousBuildingIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('dangerous_buildings_active')
    .select('id');

  if (error) throw error;

  const seen = new Set<string>();
  for (const row of data ?? []) {
    const id = row && typeof row === 'object' && 'id' in row ? (row as { id: unknown }).id : null;
    if (id != null && String(id).trim() !== '') seen.add(String(id));
  }
  return [...seen];
}
