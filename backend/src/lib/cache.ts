/**
 * In-memory cache with stale-while-revalidate.
 *
 * איך זה עובד:
 * 1. בקשת נתונים לפי key: אם יש ב-cache – מחזירים מיד (גם אם הנתונים ישנים).
 * 2. אם הנתונים ישנים (מעל staleAfterMs): מחזירים את הישנים מיד, ובמקביל מריצים
 *    רענון ברקע מה-fetcher. רק רענון אחד לכל key בכל רגע (מנוע עומס מיותר).
 * 3. אם אין ב-cache – קוראים ל-fetcher פעם אחת (עם timeout), שומרים ומחזירים.
 * 4. רענון שנכשל לא מעדכן את ה-cache ולא מחזיר שגיאה – נשארים עם הנתונים הישנים.
 */

const STALE_AFTER_MS = 30_000;   // אחרי 30 שניות נחשב "ישן" ומרעננים ברקע
const FETCH_TIMEOUT_MS = 5_000; // timeout לקריאה חיצונית

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const refreshInProgress = new Set<string>();

/**
 * מריץ Promise עם timeout; אם עבר הזמן – דוחה עם Error.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Cache fetch timeout')), ms)
    ),
  ]);
}

/**
 * מחזיר נתונים מ-cache או מטעין אותם.
 * - יש ב-cache (טרי): מחזיר מיד.
 * - יש ב-cache (ישן): מחזיר מיד, ומרענן ברקע (רק רענון אחד ל-key).
 * - אין ב-cache: טוען עם fetcher (עם timeout), שומר ומחזיר. בכישלון – זורק.
 */
export async function getOrRefresh<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry) {
    const isStale = now - entry.fetchedAt > STALE_AFTER_MS;

    if (isStale && !refreshInProgress.has(key)) {
      refreshInProgress.add(key);
      withTimeout(fetcher(), FETCH_TIMEOUT_MS)
        .then((data) => {
          cache.set(key, { data, fetchedAt: Date.now() });
        })
        .catch((err) => {
          // נכשל – לא מעדכנים cache, המשתמש כבר קיבל את הישן
          console.warn(`[cache] refresh failed for "${key}":`, err?.message ?? err);
        })
        .finally(() => {
          refreshInProgress.delete(key);
        });
    }

    return entry.data;
  }

  // אין ב-cache – טעינה ראשונה (חובה עם timeout)
  const data = await withTimeout(fetcher(), FETCH_TIMEOUT_MS);
  cache.set(key, { data, fetchedAt: Date.now() });
  return data;
}

/**
 * בונה מפתח cache מפרמטרים (למשל ל-endpoints עם limit, offset, q).
 */
export function cacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .filter((k) => params[k] !== undefined && params[k] !== '')
    .map((k) => `${k}=${params[k]}`);
  return sorted.length ? `${prefix}:${sorted.join('&')}` : prefix;
}
