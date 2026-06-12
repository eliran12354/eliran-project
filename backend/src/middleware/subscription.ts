import type { Request, Response, NextFunction } from 'express';
import { getBillingStatus } from '../services/chingService.js';

/**
 * Allows admins and users with an active subscription (active/trialing).
 * Must run after requireAuth. Returns 402 so the client can route the
 * user to the subscription page.
 */
export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (user.role === 'admin') {
    next();
    return;
  }
  try {
    const billing = await getBillingStatus(user.sub);
    if (!billing.isActive) {
      res.status(402).json({ success: false, error: 'Active subscription required' });
      return;
    }
    next();
  } catch (err) {
    console.error('requireSubscription error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify subscription' });
  }
}
