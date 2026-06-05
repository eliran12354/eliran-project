/**
 * Requires table `public.password_reset_tokens` in PostgreSQL. Create once (e.g. in pgAdmin):
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

import { queryOne, execute } from '../config/database.js';

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
  await execute(
    `DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
}

export async function insertResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  await execute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()]
  );
}

export async function findActiveResetByTokenHash(
  tokenHash: string
): Promise<PasswordResetRow | null> {
  const row = await queryOne<PasswordResetRow>(
    `SELECT id, user_id, token_hash, expires_at, used_at, created_at
     FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL`,
    [tokenHash]
  );

  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) return null;
  return row;
}

export async function markResetTokenUsed(id: string): Promise<void> {
  await execute(
    `UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2`,
    [new Date().toISOString(), id]
  );
}
