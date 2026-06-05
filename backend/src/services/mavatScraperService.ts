/**
 * Mavat search via Playwright.
 *
 * Strategy:
 *  1) Load SV3 in a real browser context to pick up cookies / session state.
 *  2) Retry the /rest/api/sv3/Search POST both through the browser request API
 *     and via in-page fetch.
 *  3) If still blocked (captcha), optionally drive the search UI itself and
 *     capture the outgoing POST (set MAVAT_PLAYWRIGHT_UI_FALLBACK=1).
 *
 * Heavy debugging is emitted to help diagnose when selectors stop matching:
 *  - screenshots at each step under `backend/.mavat-debug/`
 *  - dump of visible form controls when UI can't be interacted with
 *  - explicit log line when a reCAPTCHA iframe is present on the page
 */

import { chromium, type BrowserContext, type Page, type Response, type Locator } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const MAVAT_SEARCH_ABS = 'https://mavat.iplan.gov.il/rest/api/sv3/Search';
const SV3_ENTRY =
  'https://mavat.iplan.gov.il/SV3?searchEntity=0&searchType=0&entityType=0&searchMethod=2';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const UI_SEARCH_RESPONSE_MS = Number(process.env.MAVAT_PLAYWRIGHT_UI_TIMEOUT_MS || 60_000);
const UI_FALLBACK_ENABLED = process.env.MAVAT_PLAYWRIGHT_UI_FALLBACK === '1';
const NETWORK_RETRY_ROUNDS = Math.min(
  6,
  Math.max(1, Number(process.env.MAVAT_PLAYWRIGHT_NETWORK_ROUNDS || 3)),
);
const NETWORK_RETRY_GAP_MS = Number(process.env.MAVAT_PLAYWRIGHT_NETWORK_GAP_MS || 3500);
const DEBUG = process.env.MAVAT_PLAYWRIGHT_DEBUG === '1';

const DEBUG_DIR = path.resolve(process.cwd(), '.mavat-debug');
if (DEBUG && !existsSync(DEBUG_DIR)) {
  try {
    mkdirSync(DEBUG_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

async function screenshot(page: Page, name: string): Promise<void> {
  if (!DEBUG) return;
  const file = path.join(DEBUG_DIR, `${Date.now()}_${name}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  console.log(`[mavat-scraper] 📸 ${file}`);
}

function buildSearchPayload(query: string, pageNum: number, pageSize: number) {
  const fromResult = (pageNum - 1) * pageSize + 1;
  const toResult = pageNum * pageSize;
  return {
    searchEntity: 1,
    plNumber: '',
    plName: query.trim(),
    fromResult,
    toResult,
    _page: pageNum,
    modelCity: { DESCRIPTION: '', CODE: -1 },
  };
}

function isCaptchaNotValid(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).CaptchaNotValid === true
  );
}

function isSearchPostResponse(res: Response): boolean {
  if (res.request().method() !== 'POST') return false;
  try {
    const { hostname, pathname } = new URL(res.url());
    if (!hostname.toLowerCase().includes('mavat.iplan.gov.il')) return false;
    const p = pathname.toLowerCase().replace(/\/+$/, '') || '/';
    return p === '/rest/api/sv3/search';
  } catch {
    return false;
  }
}

function parseMavatSearchResponse(status: number, text: string): { status: number; data: unknown } {
  if (status === 204 || status === 205) {
    return { status: 200, data: {} };
  }
  const trimmed = text.trim();
  if (status >= 200 && status < 300 && trimmed === '') {
    return { status: 200, data: {} };
  }
  try {
    return { status, data: JSON.parse(text) as unknown };
  } catch {
    return { status, data: { _nonJson: true, text: text.slice(0, 500) } };
  }
}

async function parseResponseBody(res: Response): Promise<{ status: number; data: unknown }> {
  const status = res.status();
  const text = await res.text().catch(() => '');
  return parseMavatSearchResponse(status, text);
}

async function postSearchWithContext(
  context: BrowserContext,
  payload: Record<string, unknown>,
): Promise<{ status: number; data: unknown }> {
  const res = await context.request.post(MAVAT_SEARCH_ABS, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: 'https://mavat.iplan.gov.il',
      Referer: SV3_ENTRY,
    },
    data: payload,
    timeout: 60_000,
  });
  const status = res.status();
  const text = await res.text().catch(() => '');
  return parseMavatSearchResponse(status, text);
}

async function tryInPageFetch(
  page: Page,
  payload: Record<string, unknown>,
): Promise<{ status: number; data: unknown }> {
  type EvalOut = { status: number; json: unknown };
  const out = (await page.evaluate(async (body: unknown) => {
    try {
      const r = await fetch('/rest/api/sv3/Search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const text = await r.text();
      let json: unknown;
      if (r.status === 204 || r.status === 205 || text.trim() === '') {
        json = {};
      } else {
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          json = { _nonJson: true, text: text.slice(0, 400) };
        }
      }
      return { status: r.status, json } as EvalOut;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { status: 0, json: { _fetchError: msg } } as EvalOut;
    }
  }, payload)) as EvalOut;
  return { status: out.status, data: out.json };
}

/** האם יש iframe של reCAPTCHA שחוסם — רמז חשוב לדיבוג. */
async function detectRecaptcha(page: Page): Promise<boolean> {
  const frames = page.frames();
  return frames.some((f) => /recaptcha|google\.com\/recaptcha/i.test(f.url()));
}

/** מזהה כפתור "חיפוש" (מתעלם מכפתור פתיחת תפריט / ניווט). */
async function findSearchButton(page: Page): Promise<Locator | null> {
  const candidates = [
    page.getByRole('button', { name: /^\s*חיפוש\s*$/ }),
    page.getByRole('button', { name: /חיפוש תכניות|חיפוש ישויות/ }),
    page.locator('button:has-text("חיפוש")'),
    page.locator('[role="button"]:has-text("חיפוש")'),
  ];
  for (const c of candidates) {
    const loc = c.first();
    if ((await loc.count().catch(() => 0)) > 0 && (await loc.isVisible().catch(() => false))) {
      return loc;
    }
  }
  return null;
}

/**
 * מחפש שדה לפי label "מחוז" בלבד (לא "מרחב תכנון").
 * מחזיר את ה-locator של הטריגר (הקלט/הכפתור שפותח dropdown).
 */
async function findDistrictField(page: Page): Promise<Locator | null> {
  // getByLabel לא מבדיל בין "מחוז" ל-"מרחב תכנון" — אז מסננים במפורש.
  const candidates = [
    // Label אלמנטים (Angular Material) — מחוז ישיר, לא "מרחב תכנון"
    'label:text-is("מחוז")',
    'label:text-matches("^\\s*מחוז\\s*\\*?\\s*$")',
    'mat-label:text-is("מחוז")',
  ];
  for (const sel of candidates) {
    const label = page.locator(sel).first();
    if ((await label.count().catch(() => 0)) === 0) continue;

    // הטריגר יכול להיות אלמנט ה-input/combobox שבאותו form-field
    const trigger = label
      .locator(
        'xpath=ancestor::*[self::mat-form-field or contains(@class,"form-field") or contains(@class,"field") or self::div][1]',
      )
      .locator('input, [role="combobox"], mat-select, .mat-mdc-select-trigger, [aria-haspopup]')
      .first();

    if ((await trigger.count().catch(() => 0)) > 0 && (await trigger.isVisible().catch(() => false))) {
      return trigger;
    }

    // Fallback — מחזירים את ה-Label עצמו (לחיצה עליו לרוב פותחת את השדה)
    if (await label.isVisible().catch(() => false)) {
      return label;
    }
  }
  return null;
}

/** בוחר אופציה ברשימה שנפתחה (אחרי שפתחנו dropdown). */
async function selectDropdownOption(page: Page, query: string): Promise<boolean> {
  const q = query.trim();
  // Angular Material / generic listbox
  const optionCandidates = [
    page.getByRole('option', { name: new RegExp(`^\\s*${escapeRegex(q)}\\s*$`) }),
    page.getByRole('option', { name: new RegExp(escapeRegex(q)) }),
    page.locator(`mat-option:has-text("${q}")`),
    page.locator(`[role="option"]:has-text("${q}")`),
    page.locator(`li:has-text("${q}")`),
  ];
  for (const c of optionCandidates) {
    const loc = c.first();
    if ((await loc.count().catch(() => 0)) > 0 && (await loc.isVisible().catch(() => false))) {
      try {
        await loc.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
        await loc.click({ timeout: 3000 });
        return true;
      } catch {
        /* try next */
      }
    }
  }
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Dump של כל הקונטרולים הנראים — עוזר להבין מה באמת קיים ב-DOM. */
async function dumpVisibleControls(page: Page): Promise<void> {
  try {
    const controls = await page.$$eval('input, select, textarea, button, [role="button"]', (els) =>
      els
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type'),
            id: el.id || null,
            name: el.getAttribute('name'),
            placeholder: el.getAttribute('placeholder'),
            ariaLabel: el.getAttribute('aria-label'),
            role: el.getAttribute('role'),
            text: (el.textContent || '').trim().slice(0, 60),
            visible: rect.width > 0 && rect.height > 0,
          };
        })
        .filter((el) => el.visible)
        .slice(0, 40),
    );
    console.log('[mavat-scraper] 🔍 visible controls:', JSON.stringify(controls, null, 2));
  } catch (e) {
    console.warn('[mavat-scraper] dump failed:', (e as Error).message);
  }
}

/**
 * מכוון ל-dropdown של "מחוז" (District): פותח אותו, מקליד את השאילתה,
 * בוחר את האופציה המתאימה, ולוחץ על "חיפוש".
 */
async function tryFillSearchAndSubmit(page: Page, query: string): Promise<boolean> {
  await screenshot(page, '1_loaded');

  const districtField = await findDistrictField(page);
  if (!districtField) {
    console.warn('[mavat-scraper] ❌ did not find "מחוז" label / field.');
    await dumpVisibleControls(page);
    return false;
  }

  console.log('[mavat-scraper] ✍️  opening "מחוז" field');
  try {
    await districtField.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await districtField.click({ timeout: 4000 });
  } catch (e) {
    console.warn('[mavat-scraper] ⚠️  could not open district field:', (e as Error).message);
    return false;
  }
  await delay(500);

  // אם זה input עם autocomplete — מקלידים; אם זה select פשוט — האופציות כבר פתוחות.
  try {
    await page.keyboard.type(query, { delay: 40 });
  } catch {
    /* ignore — select ללא קלט */
  }
  await delay(600);
  await screenshot(page, '2_typed');

  const picked = await selectDropdownOption(page, query);
  if (!picked) {
    console.warn('[mavat-scraper] ❌ no dropdown option matched:', query);
    await dumpVisibleControls(page);
    return false;
  }
  console.log(`[mavat-scraper] ✅ selected "${query}" option`);
  await delay(400);

  const searchBtn = await findSearchButton(page);
  if (!searchBtn) {
    console.warn('[mavat-scraper] ❌ no "חיפוש" button found after selecting district');
    await dumpVisibleControls(page);
    return false;
  }
  try {
    await searchBtn.click({ timeout: 4000 });
    console.log('[mavat-scraper] 🖱  clicked "חיפוש"');
  } catch (e) {
    console.warn('[mavat-scraper] ⚠️  "חיפוש" click failed:', (e as Error).message);
    return false;
  }

  await screenshot(page, '3_submitted');
  return true;
}

function isSuccessfulSearchPayload(status: number, data: unknown): boolean {
  if (status < 200 || status >= 300) return false;
  if (isCaptchaNotValid(data)) return false;
  return true;
}

async function tryNetworkSearchWithRetries(
  context: BrowserContext,
  page: Page,
  payload: Record<string, unknown>,
): Promise<unknown | null> {
  for (let round = 0; round < NETWORK_RETRY_ROUNDS; round++) {
    if (round > 0) await delay(NETWORK_RETRY_GAP_MS);

    const post = await postSearchWithContext(context, payload);
    if (isSuccessfulSearchPayload(post.status, post.data)) {
      console.log(`[mavat-scraper] ✅ context.request OK (round ${round + 1}/${NETWORK_RETRY_ROUNDS})`);
      return post.data;
    }
    console.warn(
      `[mavat-scraper] context.request round ${round + 1}: HTTP ${post.status}`,
      summarizeData(post.data),
    );

    const ev = await tryInPageFetch(page, payload);
    if (isSuccessfulSearchPayload(ev.status, ev.data)) {
      console.log(`[mavat-scraper] ✅ in-page fetch OK (round ${round + 1}/${NETWORK_RETRY_ROUNDS})`);
      return ev.data;
    }
    console.warn(
      `[mavat-scraper] in-page fetch round ${round + 1}: HTTP ${ev.status}`,
      summarizeData(ev.data),
    );
  }
  return null;
}

function summarizeData(data: unknown): string {
  if (data === null || data === undefined) return '';
  if (typeof data === 'object') return JSON.stringify(data).slice(0, 160);
  return String(data).slice(0, 160);
}

export async function searchMavatViaPlaywright(
  query: string,
  pageNum: number,
  pageSize: number,
): Promise<unknown> {
  if (process.env.MAVAT_DISABLE_PLAYWRIGHT === '1') {
    throw new Error('Mavat Playwright scraper disabled (MAVAT_DISABLE_PLAYWRIGHT=1)');
  }

  const headless = process.env.MAVAT_PLAYWRIGHT_HEADLESS !== '0';
  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(90_000);

  const payload = buildSearchPayload(query, pageNum, pageSize) as Record<string, unknown>;

  try {
    await page.goto(SV3_ENTRY, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {});
    await delay(3500);

    if (await detectRecaptcha(page)) {
      console.warn('[mavat-scraper] 🤖 reCAPTCHA iframe detected — API will keep returning CaptchaNotValid.');
    }

    const networkResult = await tryNetworkSearchWithRetries(context, page, payload);
    if (networkResult !== null) return networkResult;

    if (query.trim().length === 0) {
      throw new Error('Mavat scraper: רשת נכשלה ואין שאילתה לחיפוש בממשק (שדה ריק).');
    }

    if (!UI_FALLBACK_ENABLED) {
      throw new Error(
        'Mavat scraper: captcha חוסם את ה-API. הפעילו MAVAT_PLAYWRIGHT_UI_FALLBACK=1 כדי לנסות חיפוש דרך הממשק הגרפי.',
      );
    }

    console.log('[mavat-scraper] 🪄 switching to UI fallback');

    const responsePromise = page.waitForResponse(
      (res) => {
        if (!isSearchPostResponse(res)) return false;
        if (res.status() === 401) return false;
        return true;
      },
      { timeout: UI_SEARCH_RESPONSE_MS },
    );

    const submitted = await tryFillSearchAndSubmit(page, query.trim());
    if (!submitted) {
      throw new Error(
        'Mavat scraper: לא הצלחתי לזהות שדה/כפתור חיפוש ב-SV3. בדקו את הלוגים (visible controls) ושלחו אותם כדי לדייק סלקטורים.',
      );
    }

    let resp: Response;
    try {
      resp = await responsePromise;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await screenshot(page, '4_timeout');
      await dumpVisibleControls(page);
      throw new Error(
        `${msg}. הממשק לא שלח POST ל-/rest/api/sv3/Search (200) בזמן. ` +
          'בדוק/י: (1) האם reCAPTCHA מופיע בדפדפן? (2) האם החיפוש באמת הופעל? (3) להגדיל MAVAT_PLAYWRIGHT_UI_TIMEOUT_MS.',
      );
    }

    const parsed = await parseResponseBody(resp);
    if (!isSuccessfulSearchPayload(parsed.status, parsed.data)) {
      const snippet =
        typeof parsed.data === 'object' && parsed.data !== null
          ? JSON.stringify(parsed.data).slice(0, 400)
          : String(parsed.data);
      throw new Error(`Mavat scraper: Search failed (HTTP ${parsed.status}): ${snippet}`);
    }

    return parsed.data;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
