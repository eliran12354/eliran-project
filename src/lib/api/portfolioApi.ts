import { getToken } from './authApi';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export type PortfolioItem = {
  id: string;
  user_id: string;
  item_type: string;
  source_id: string;
  snapshot: Record<string, unknown> | null;
  created_at: string;
};

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  const res = await fetch(`${BASE_URL}/api/portfolio/items`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error('Failed to load portfolio');
  }
  const data = await res.json();
  return data.items ?? [];
}

export async function addPortfolioItem(
  itemType: string,
  sourceId: string,
  snapshot?: Record<string, unknown> | null
): Promise<PortfolioItem> {
  const res = await fetch(`${BASE_URL}/api/portfolio/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ item_type: itemType, source_id: sourceId, snapshot: snapshot ?? null }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    if (res.status === 409) throw new Error('ALREADY_SAVED');
    throw new Error(data.error || data.message || 'Failed to add to portfolio');
  }
  return data.item;
}

export async function removePortfolioItem(itemType: string, sourceId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/portfolio/items`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ item_type: itemType, source_id: sourceId }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to remove from portfolio');
  }
}

/**
 * Build a stable source_id for a saved item (avoids duplicates).
 */
export function portfolioSourceId(type: string, ...parts: (string | number | undefined)[]): string {
  const safe = parts.map((p) => (p ?? '').toString().trim()).filter(Boolean);
  return `${type}:${safe.join(':')}`;
}
