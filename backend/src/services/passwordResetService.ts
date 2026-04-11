import { config } from '../config/env.js';
import { hashResetToken, generateResetTokenPlain } from '../lib/resetToken.js';
import { findUserByEmail, updatePasswordForUser } from './authService.js';
import {
  deleteUnusedTokensForUser,
  findActiveResetByTokenHash,
  insertResetToken,
  markResetTokenUsed,
  resetTokenExpiresAt,
} from './passwordResetTokenService.js';
import { sendPasswordResetEmail } from './emailService.js';

const MIN_PASSWORD_LENGTH = 8;

export async function requestPasswordReset(email: string): Promise<void> {
  const normalised = email.toLowerCase().trim();
  const user = await findUserByEmail(normalised);
  if (!user) {
    return;
  }

  await deleteUnusedTokensForUser(user.id);
  const plain = generateResetTokenPlain();
  const tokenHash = hashResetToken(plain);
  const expiresAt = resetTokenExpiresAt();
  await insertResetToken(user.id, tokenHash, expiresAt);

  const resetUrl = `${config.appPublicUrl}/reset-password?token=${encodeURIComponent(plain)}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function completePasswordReset(
  plainToken: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!plainToken || typeof plainToken !== 'string') {
    return { ok: false, error: 'Invalid token' };
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  const tokenHash = hashResetToken(plainToken);
  const row = await findActiveResetByTokenHash(tokenHash);
  if (!row) {
    return { ok: false, error: 'Invalid or expired reset link' };
  }

  await updatePasswordForUser(row.user_id, newPassword);
  await markResetTokenUsed(row.id);
  await deleteUnusedTokensForUser(row.user_id);

  return { ok: true };
}
