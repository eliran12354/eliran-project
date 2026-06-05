/**
 * Mavat (Israeli Planning Authority) Search Service
 *
 * Proxies the public Mavat search API:
 *   POST https://mavat.iplan.gov.il/rest/api/sv3/Search
 *
 * - Direct `fetch` first (fast). Mavat often returns 401 + CaptchaNotValid for
 *   server-side calls without a browser session — then we fall back to
 *   Playwright (`mavatScraperService`) which loads SV3 and repeats the request
 *   from a real browser context.
 * - Timeout protection via AbortController on direct fetch.
 * - Simple in-memory TTL cache keyed by query + page + pageSize.
 */

import { searchMavatViaPlaywright } from './mavatScraperService.js';

const MAVAT_SEARCH_URL = 'https://mavat.iplan.gov.il/rest/api/sv3/Search';
const MAVAT_DETAILS_URL = 'https://mavat.iplan.gov.il/rest/api/sv3/EntityDetails';

const REQUEST_TIMEOUT_MS = 20_000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 200;

/** Shape of a normalized result returned to the frontend. */
export interface MavatPlan {
  id: string | number | null;
  name: string | null;
  number: string | null;
  location: string | null;
  authority: string | null;
  status: string | null;
}

export interface MavatSearchResponse {
  results: MavatPlan[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs: number = CACHE_TTL_MS): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Cheap eviction: drop the first inserted entry.
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/** Fetch with a hard timeout. Throws an Error with a user-friendly message. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    if (e?.name === 'AbortError') {
      throw new Error(`Mavat request timed out after ${timeoutMs}ms`);
    }
    throw new Error(e?.message || 'Network error contacting Mavat');
  } finally {
    clearTimeout(timer);
  }
}

/** Safely extract the dtResults array wherever Mavat puts it. */
function extractDtResults(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;

  const direct = obj.dtResults;
  if (Array.isArray(direct)) return direct;

  const result = obj.result as Record<string, unknown> | undefined;
  if (result && Array.isArray(result.dtResults)) return result.dtResults as unknown[];

  return [];
}

/** Total count may appear in different fields depending on Mavat response shape. */
function extractTotal(raw: unknown, fallback: number): number {
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Record<string, unknown>;
  const result = (obj.result as Record<string, unknown> | undefined) ?? obj;
  const candidates = [
    result?.totalResults,
    result?.TotalResults,
    result?.total,
    result?.Total,
    result?.recordCount,
    obj.totalResults,
    obj.total,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
    if (typeof c === 'string' && c.trim() !== '' && !Number.isNaN(Number(c))) return Number(c);
  }
  return fallback;
}

function mapPlan(item: unknown): MavatPlan {
  const r = (item ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = r[k];
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s.length > 0) return s;
    }
    return null;
  };

  const idRaw = r.PLAN_ID ?? r.plan_id ?? r.planId ?? r.ENTITY_ID ?? null;
  const id =
    typeof idRaw === 'number' || typeof idRaw === 'string'
      ? idRaw
      : idRaw !== null && idRaw !== undefined
        ? String(idRaw)
        : null;

  return {
    id,
    name: pick('ENTITY_NAME', 'entity_name', 'entityName', 'PL_NAME', 'plName'),
    number: pick('ENTITY_NUMBER', 'entity_number', 'entityNumber', 'PL_NUMBER', 'plNumber'),
    location: pick('ENTITY_LOCATION', 'entity_location', 'entityLocation', 'LOCATION'),
    authority: pick('AUTH_NAME', 'auth_name', 'authName', 'AUTHORITY_NAME'),
    status: pick(
      'UNIFIED_STATUS_DESC',
      'unified_status_desc',
      'unifiedStatusDesc',
      'STATION_DESC',
      'STATUS',
    ),
  };
}

/**
 * Search Mavat for plans matching the query.
 *
 * @param query      Free-text search term (city or plan name). Empty is allowed.
 * @param page       1-based page number.
 * @param pageSize   Number of results per page (Mavat's `toResult - fromResult + 1`).
 */
export async function searchMavatPlans(
  query: string,
  page = 1,
  pageSize = 20,
): Promise<MavatSearchResponse> {
  const q = (query ?? '').trim();
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));

  const cacheKey = `search::${q.toLowerCase()}::${safePage}::${safeSize}`;
  const cached = cacheGet<MavatSearchResponse>(cacheKey);
  if (cached) return cached;

  const fromResult = (safePage - 1) * safeSize + 1;
  const toResult = safePage * safeSize;

  const body = {
    searchEntity: 1,
    plNumber: '',
    plName: q,
    fromResult,
    toResult,
    _page: safePage,
    modelCity: {
      DESCRIPTION: '',
      CODE: -1,
    },
  };

  const usePlaywrightFirst = process.env.MAVAT_SEARCH_ALWAYS_PLAYWRIGHT === '1';

  let raw: unknown;

  if (usePlaywrightFirst) {
    raw = await searchMavatViaPlaywright(q, safePage, safeSize);
  } else {
    const response = await fetchWithTimeout(MAVAT_SEARCH_URL, {
      method: 'POST',
      headers: BASE_HEADERS,
      body: JSON.stringify(body),
    });

    const responseText = await response.text().catch(() => '');

    if (response.ok) {
      try {
        raw = JSON.parse(responseText) as unknown;
      } catch {
        throw new Error(`Mavat returned non-JSON response: ${responseText.slice(0, 200)}`);
      }
    } else if (
      response.status === 401 &&
      responseText.includes('CaptchaNotValid') &&
      process.env.MAVAT_DISABLE_PLAYWRIGHT !== '1'
    ) {
      raw = await searchMavatViaPlaywright(q, safePage, safeSize);
    } else {
      throw new Error(
        `Mavat responded with status ${response.status}${responseText ? `: ${responseText.slice(0, 200)}` : ''}`,
      );
    }
  }
  const rawResults = extractDtResults(raw);
  const results = rawResults.map(mapPlan);
  const total = extractTotal(raw, fromResult - 1 + results.length);
  const hasMore = results.length === safeSize && toResult < total;

  const payload: MavatSearchResponse = {
    results,
    page: safePage,
    pageSize: safeSize,
    total,
    hasMore,
  };

  cacheSet(cacheKey, payload);
  return payload;
}

/**
 * Fetch full details for a specific plan by PLAN_ID.
 * Mavat's entity-details endpoint is not officially documented;
 * if it fails we fall back to the portal URL.
 */
export async function getMavatPlanDetails(planId: string | number): Promise<{
  id: string | number;
  portalUrl: string;
  raw: unknown | null;
}> {
  const portalUrl = `https://mavat.iplan.gov.il/SV4/1/${encodeURIComponent(String(planId))}/0`;
  const cacheKey = `details::${planId}`;
  const cached = cacheGet<{ id: string | number; portalUrl: string; raw: unknown | null }>(cacheKey);
  if (cached) return cached;

  let raw: unknown | null = null;
  try {
    const response = await fetchWithTimeout(MAVAT_DETAILS_URL, {
      method: 'POST',
      headers: BASE_HEADERS,
      body: JSON.stringify({ entityId: planId, searchEntity: 1 }),
    });
    if (response.ok) {
      raw = (await response.json().catch(() => null)) as unknown;
    }
  } catch {
    // swallow — we still return the portal URL as a usable fallback
    raw = null;
  }

  const payload = { id: planId, portalUrl, raw };
  cacheSet(cacheKey, payload);
  return payload;
}

/** Exposed for tests / manual cache busting. */
export function clearMavatCache(): void {
  cache.clear();
}
