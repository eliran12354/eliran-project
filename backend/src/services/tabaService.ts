/**
 * Taba Plans Service
 * Fetches building plans from apps.land.gov.il TabaSearch API
 */

const ENDPOINT = 'https://apps.land.gov.il/TabaSearch/api//SerachPlans/GetPlans';

const HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  Origin: 'https://apps.land.gov.il',
  Referer: 'https://apps.land.gov.il/TabaSearch/',
  'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

let sessionCookie: string | null = null;

/**
 * Get session cookies from the main TabaSearch site
 */
async function getSessionCookies(): Promise<string | null> {
  try {
    const response = await fetch('https://apps.land.gov.il/TabaSearch/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // In fetch API, set-cookie header might be an array or single string
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      // Handle both single cookie and multiple cookies (comma-separated)
      const cookies = setCookieHeader
        .split(',')
        .map((c) => {
          const cookiePart = c.trim().split(';')[0].trim();
          return cookiePart;
        })
        .filter(Boolean)
        .join('; ');
      return cookies || null;
    }
    return null;
  } catch (error: any) {
    console.error('⚠️ Error getting session cookies:', error.message);
    return null;
  }
}

/**
 * Build headers with cookies
 */
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...HEADERS };
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }
  return headers;
}

/**
 * Extract plans array from response data
 */
function extractPlansArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  const candidates = [
    data.plansSmall,
    data.plans,
    data.items,
    data.result,
    data.Results,
    data.records,
    data.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) return value;
    }
  }

  return [];
}

/**
 * Search for Taba plans by gush and helka
 */
export async function getTabaPlans(
  gush: string,
  helka: string,
  options: { maxPages?: number; pageSize?: number } = {}
): Promise<any[]> {
  const { maxPages = 10, pageSize = 200 } = options;

  console.log(`🔍 Searching Taba plans for gush ${gush}, helka ${helka}...`);

  // Get session cookies if we don't have them
  if (!sessionCookie) {
    console.log('🍪 Getting session cookies...');
    sessionCookie = await getSessionCookies();
    if (sessionCookie) {
      console.log('✅ Got session cookies');
    }
  }

  const allPlans: any[] = [];
  let page = 1;

  while (page <= maxPages) {
    const requestBody = {
      ActivePlan: null,
      ActiveQuickSearch: false,
      Page: page,
      PageSize: pageSize,
      Take: pageSize,
      Skip: (page - 1) * pageSize,
      SearchText: '',
      Status: null,
      Area: null,
      Year: null,
      planNumber: '',
      chelka: helka ? String(helka) : '',
      gush: gush ? String(gush) : '',
      planTypes: [],
      planTypesUsed: false,
      statuses: null,
      fromStatusDate: null,
      toStatusDate: null,
    };

    try {
      console.log(`📄 Sending request for page ${page}...`);
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 404) {
          console.log(`⚠️ Request failed with status ${response.status}, ending...`);
          break;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData: any = await response.json();
      const plans = extractPlansArray(responseData);
      const totalRecords = responseData?.totalRecords || plans.length;

      console.log(`✅ Page ${page}: Found ${plans.length} plans (total records: ${totalRecords})`);

      if (!plans || plans.length === 0) {
        console.log(`⚠️ No more plans, ending...`);
        break;
      }

      allPlans.push(...plans);

      // If we got less than pageSize, we've reached the last page
      if (plans.length < pageSize) {
        console.log(`✅ Reached end of results`);
        break;
      }

      page++;

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error: any) {
      console.error(`❌ Error on page ${page}:`, error.message);
      if (error.message?.includes('400') || error.message?.includes('404')) {
        break;
      }
      page++;
    }
  }

  console.log(`✅ Total plans found: ${allPlans.length}`);
  return allPlans;
}

