import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { queryOne, execute } from '../config/database.js';

/**
 * CHING payments integration (https://app.ching.co.il).
 *
 * Each user is linked to a single CHING customer (users.ching_customer_id).
 * Subscription state is synced exclusively from webhooks — the success_url
 * redirect is never trusted for entitlement.
 *
 * Requires (run manually, documented in database.md):
 *   users.ching_customer_id / ching_subscription_id / subscription_status /
 *   subscription_current_period_end, plus the billing_webhook_events table.
 */

const ACTIVE_STATUSES = ['active', 'trialing'];

export interface BillingStatus {
  status: string | null;
  isActive: boolean;
  currentPeriodEnd: string | null;
}

interface ChingEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { message?: string; code?: string };
}

export interface ChingWebhookEvent {
  id: string;
  type: string;
  data: {
    id?: string;
    customer?: string;
    status?: string;
    current_period_end?: string;
    [key: string]: unknown;
  };
}

interface UserBillingRow {
  id: string;
  email: string;
  ching_customer_id: string | null;
  ching_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
}

async function chingRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!config.ching.apiKey) {
    throw new Error('CHING_API_KEY is not configured');
  }
  const res = await fetch(`${config.ching.apiBase}/ching/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.ching.apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as ChingEnvelope<T>;
  if (!res.ok || body.success === false) {
    throw new Error(body.error?.message || `CHING request failed (${res.status})`);
  }
  return (body.data ?? body) as T;
}

async function getUserBilling(userId: string): Promise<UserBillingRow> {
  const user = await queryOne<UserBillingRow>(
    `SELECT id, email, ching_customer_id, ching_subscription_id,
            subscription_status, subscription_current_period_end
       FROM users WHERE id = $1`,
    [userId]
  );
  if (!user) throw new Error('USER_NOT_FOUND');
  return user;
}

/**
 * Returns the user's CHING customer id, creating the customer on first use.
 * One user maps to exactly one CHING customer, forever.
 */
async function ensureCustomer(userId: string): Promise<string> {
  const user = await getUserBilling(userId);
  if (user.ching_customer_id) return user.ching_customer_id;

  const customer = await chingRequest<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: user.email.split('@')[0],
      email: user.email,
    }),
  });

  await execute('UPDATE users SET ching_customer_id = $1, updated_at = now() WHERE id = $2', [
    customer.id,
    userId,
  ]);
  return customer.id;
}

/**
 * Creates a hosted checkout session for the monthly subscription plan.
 * Returns the URL the user must be redirected to.
 */
export async function createSubscriptionCheckout(userId: string): Promise<string> {
  if (!config.ching.monthlyPriceId) {
    throw new Error('CHING_MONTHLY_PRICE_ID is not configured');
  }
  const customerId = await ensureCustomer(userId);
  const session = await chingRequest<{ url: string }>('/checkout_sessions', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      price: config.ching.monthlyPriceId,
      success_url: `${config.appPublicUrl}/settings?billing=success`,
      cancel_url: `${config.appPublicUrl}/settings?billing=cancelled`,
      create_document: true,
    }),
  });
  return session.url;
}

/**
 * Creates a hosted billing-portal session (manage cards, cancel subscription,
 * download invoices). Portal URLs expire after ~1 hour — never cached.
 */
export async function createBillingPortalSession(userId: string): Promise<string> {
  const customerId = await ensureCustomer(userId);
  const session = await chingRequest<{ url: string }>('/billing_portal_sessions', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      return_url: `${config.appPublicUrl}/settings`,
    }),
  });
  return session.url;
}

/** Current subscription state as known from webhooks (no CHING API call). */
export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const user = await getUserBilling(userId);
  return {
    status: user.subscription_status,
    isActive: ACTIVE_STATUSES.includes(user.subscription_status ?? ''),
    currentPeriodEnd: user.subscription_current_period_end,
  };
}

/** Timing-safe HMAC-SHA256 verification of the Ching-Signature header over the raw body. */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!config.ching.webhookSecret || !signatureHeader) return false;
  const expected = crypto
    .createHmac('sha256', config.ching.webhookSecret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signatureHeader, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Applies a verified webhook event to the local DB.
 * Events are deduped by id; unknown types are ignored on purpose.
 */
export async function processWebhookEvent(event: ChingWebhookEvent): Promise<void> {
  const inserted = await execute(
    'INSERT INTO billing_webhook_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [event.id, event.type]
  );
  if (inserted === 0) return; // already processed

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.canceled':
    case 'subscription.past_due':
      await syncSubscription(event);
      break;
    default:
      break;
  }
}

async function syncSubscription(event: ChingWebhookEvent): Promise<void> {
  const { customer, id: subscriptionId, status, current_period_end } = event.data;
  if (!customer || !subscriptionId || !status) {
    console.warn('[ching] subscription event missing fields, skipping:', event.id, event.type);
    return;
  }
  const updated = await execute(
    `UPDATE users
        SET ching_subscription_id = $1,
            subscription_status = $2,
            subscription_current_period_end = $3,
            updated_at = now()
      WHERE ching_customer_id = $4`,
    [subscriptionId, status, current_period_end ?? null, customer]
  );
  if (updated === 0) {
    console.warn('[ching] no user found for customer', customer, '(event', event.id, ')');
  }
}
