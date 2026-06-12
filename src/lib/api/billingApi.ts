import { apiGet, apiPost } from "./client";

export type BillingStatus = {
  /** CHING subscription status: active | trialing | past_due | canceled | null (never subscribed). */
  status: string | null;
  isActive: boolean;
  currentPeriodEnd: string | null;
};

export function fetchBillingStatus(): Promise<BillingStatus> {
  return apiGet<BillingStatus>("/api/billing/status", { auth: true });
}

/** Creates a hosted checkout session for the monthly plan and returns its URL. */
export async function createCheckoutSession(): Promise<string> {
  const { url } = await apiPost<{ url: string }>("/api/billing/checkout", undefined, { auth: true });
  return url;
}

/** Creates a hosted billing-portal session (manage card, cancel, invoices) and returns its URL. */
export async function createBillingPortalSession(): Promise<string> {
  const { url } = await apiPost<{ url: string }>("/api/billing/portal", undefined, { auth: true });
  return url;
}
