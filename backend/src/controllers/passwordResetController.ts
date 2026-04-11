import type { Request, Response } from 'express';
import { config } from '../config/env.js';
import { completePasswordReset, requestPasswordReset } from '../services/passwordResetService.js';

const GENERIC_OK_MESSAGE =
  'If an account exists for this email, you will receive reset instructions shortly.';

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    await requestPasswordReset(email);

    res.json({ success: true, message: GENERIC_OK_MESSAGE });
  } catch (e: unknown) {
    console.error('forgotPassword error:', e);
    const err = e as { message?: string };
    const devHint =
      config.server.nodeEnv === 'development' && err.message
        ? err.message
        : 'Request failed';
    res.status(500).json({ success: false, error: devHint });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, error: 'Token is required' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ success: false, error: 'Password is required' });
      return;
    }

    const result = await completePasswordReset(token, password);
    if (!result.ok) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, message: 'Password updated. You can sign in.' });
  } catch (e: unknown) {
    console.error('resetPassword error:', e);
    const err = e as { message?: string };
    const devHint =
      config.server.nodeEnv === 'development' && err.message
        ? err.message
        : 'Reset failed';
    res.status(500).json({ success: false, error: devHint });
  }
}
