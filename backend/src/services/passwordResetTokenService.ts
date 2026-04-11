/**
 * Requires table `public.password_reset_tokens` in Supabase. Run once in SQL editor:
 *
 * create table if not exists public.password_reset_tokens (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid not null references public.users(id) on delete cascade,
 *   token_hash text not null,
 *   expires_at timestamptz not null,
 *   used_at timestamptz null,
 *   created_at timestamptz not null default now()
 * );
 * create unique index if not exists password_reset_tokens_token_hash_key
 *   on public.password_reset_tokens (token_hash);
 * create index if not exists password_reset_tokens_user_id_idx
 *   on public.password_reset_tokens (user_id);
 */

import { supabase } from '../config/database.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export type PasswordResetRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export function resetTokenExpiresAt(): Date {
  return new Date(Date.now() + RESET_TOKEN_TTL_MS);
}

export async function deleteUnusedTokensForUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('password_reset_tokens')
    .delete()
    .eq('user_id', userId)
    .is('used_at', null);

  if (error) throw error;
}

export async function insertResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  const { error } = await supabase.from('password_reset_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;
}

export async function findActiveResetByTokenHash(
  tokenHash: string
): Promise<PasswordResetRow | null> {
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, token_hash, expires_at, used_at, created_at')
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as PasswordResetRow;
  if (new Date(row.expires_at) <= new Date()) return null;
  return row;
}

export async function markResetTokenUsed(id: string): Promise<void> {
  const { error } = await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
