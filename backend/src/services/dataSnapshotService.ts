/**
 * Persists dataset fingerprints for sync jobs (Supabase: app_data_snapshots).
 */

import { supabase } from '../config/database.js';

export const URBAN_RENEWAL_SNAPSHOT_KEY = 'urban_renewal_mitchamim';
export const DANGEROUS_BUILDINGS_SNAPSHOT_KEY = 'dangerous_buildings_active';

export async function getKnownIds(snapshotKey: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('app_data_snapshots')
    .select('known_ids')
    .eq('snapshot_key', snapshotKey)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const raw = data.known_ids;
  if (raw == null) return null;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

export async function saveKnownIds(snapshotKey: string, knownIds: string[]): Promise<void> {
  const { error } = await supabase.from('app_data_snapshots').upsert(
    {
      snapshot_key: snapshotKey,
      known_ids: knownIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'snapshot_key' }
  );

  if (error) throw error;
}
