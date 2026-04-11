import { createHash, randomBytes } from 'crypto';

const TOKEN_BYTES = 32;

/** URL-safe opaque token; store only hashResetToken(plain) in DB. */
export function generateResetTokenPlain(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

export function hashResetToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}
