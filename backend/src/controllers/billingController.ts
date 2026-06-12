import type { Request, Response } from 'express';
import * as chingService from '../services/chingService.js';

/**
 * POST /api/billing/checkout – create a hosted checkout session for the
 * monthly subscription and return its URL for client-side redirect.
 */
export async function createCheckout(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const url = await chingService.createSubscriptionCheckout(userId);
    res.json({ success: true, data: { url } });
  } catch (err: unknown) {
    console.error('Billing createCheckout error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/billing/portal – create a hosted billing-portal session
 * (manage cards, cancel subscription, download invoices).
 */
export async function createPortal(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const url = await chingService.createBillingPortalSession(userId);
    res.json({ success: true, data: { url } });
  } catch (err: unknown) {
    console.error('Billing createPortal error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create billing portal session',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/billing/status – the user's subscription state as synced from webhooks.
 */
export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const status = await chingService.getBillingStatus(userId);
    res.json({ success: true, data: status });
  } catch (err: unknown) {
    console.error('Billing getStatus error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load billing status',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/billing/webhook – CHING webhook receiver.
 * Mounted with express.raw() so the HMAC runs over the exact bytes sent.
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.header('Ching-Signature');
  if (!chingService.verifyWebhookSignature(req.body as Buffer, signature)) {
    res.status(400).json({ success: false, error: 'Invalid signature' });
    return;
  }

  let event: chingService.ChingWebhookEvent;
  try {
    event = JSON.parse((req.body as Buffer).toString('utf8'));
  } catch {
    res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    return;
  }

  try {
    await chingService.processWebhookEvent(event);
    res.json({ received: true });
  } catch (err: unknown) {
    // Non-2xx makes CHING retry the delivery later.
    console.error('Billing webhook processing error:', event.type, err);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
}
