import { getToken } from "@/lib/api/authApi";
import type { TaxCalculationResult } from "@/lib/tax/types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

type ApiOk<T> = { success: true; data: T };
type ApiErr = { success: false; error: string; details?: unknown };

function authHeaders(): HeadersInit {
  const token = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function postPurchaseTax(body: Record<string, unknown>): Promise<TaxCalculationResult> {
  const res = await fetch(`${BASE_URL}/api/tax/purchase`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiOk<TaxCalculationResult> | ApiErr;
  if (!res.ok || !json.success || !("data" in json)) {
    const msg =
      "error" in json && typeof json.error === "string" ? json.error : "שגיאת שרת בחישוב מס רכישה";
    throw new Error(msg);
  }
  return json.data;
}

export async function postCapitalGains(body: Record<string, unknown>): Promise<TaxCalculationResult> {
  const res = await fetch(`${BASE_URL}/api/tax/capital-gains`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiOk<TaxCalculationResult> | ApiErr;
  if (!res.ok || !json.success || !("data" in json)) {
    throw new Error(
      "error" in json && typeof json.error === "string" ? json.error : "שגיאת שרת בחישוב מס שבח"
    );
  }
  return json.data;
}
