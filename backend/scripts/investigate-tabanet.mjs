/**
 * One-shot Playwright investigation of tabanet.co.il's block/parcel search.
 *
 * Run from the `backend` folder:
 *   node scripts/investigate-tabanet.mjs
 *
 * Or pass custom גוש/חלקה values:
 *   GUSH=6213 HELKA=1 node scripts/investigate-tabanet.mjs
 *
 * Captures every XHR/Fetch fired during the search and writes them to
 *   backend/.tabanet-investigation/network.json + per-call .json files.
 * Also writes step screenshots to the same folder so we can verify the run.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const GUSH = process.env.GUSH || '6213';
const HELKA = process.env.HELKA || '1';
const HEADLESS = process.env.HEADLESS !== '0';
const ENTRY = 'https://tabanet.co.il/Dashboard';

const OUT_DIR = path.resolve(process.cwd(), '.tabanet-investigation');
mkdirSync(OUT_DIR, { recursive: true });

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const log = (...a) => console.log('[tabanet]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {Array<{ts: string, type: string, url: string, method: string, status?: number, requestHeaders?: Record<string,string>, requestBody?: string, responseHeaders?: Record<string,string>, responseBody?: string, responseBodySnippet?: string}>} */
const calls = [];

async function shot(page, name) {
  const f = path.join(OUT_DIR, `${stamp()}_${name}.png`);
  try {
    await page.screenshot({ path: f, fullPage: false });
    log('screenshot →', f);
  } catch (e) {
    log('screenshot failed:', e.message);
  }
}

function isInteresting(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith('data:') || lower.startsWith('blob:')) return false;
  if (/\.(css|woff2?|ttf|eot|otf|svg|png|jpe?g|gif|ico|webp|mp4|webm|map)(\?|$)/.test(lower)) {
    return false;
  }
  if (lower.includes('googletagmanager') || lower.includes('google-analytics') || lower.includes('gstatic')) {
    return false;
  }
  return true;
}

(async () => {
  log('launching chromium (headless=' + HEADLESS + ')');
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'he-IL',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const callIndexByRequest = new Map();

  page.on('request', (req) => {
    if (!isInteresting(req.url())) return;
    const idx = calls.length;
    callIndexByRequest.set(req, idx);
    calls.push({
      ts: new Date().toISOString(),
      type: req.resourceType(),
      url: req.url(),
      method: req.method(),
      requestHeaders: req.headers(),
      requestBody: req.postData() || undefined,
    });
  });

  page.on('response', async (res) => {
    const req = res.request();
    const idx = callIndexByRequest.get(req);
    if (idx === undefined) return;
    const entry = calls[idx];
    entry.status = res.status();
    try {
      entry.responseHeaders = res.headers();
    } catch {
      /* ignore */
    }
    const ctype = (res.headers()['content-type'] || '').toLowerCase();
    if (
      ctype.includes('json') ||
      ctype.includes('text/') ||
      ctype.includes('xml') ||
      ctype.includes('javascript')
    ) {
      try {
        const body = await res.text();
        entry.responseBody = body.length > 200_000 ? body.slice(0, 200_000) + '\n…[truncated]' : body;
        entry.responseBodySnippet = body.slice(0, 800);
      } catch (e) {
        entry.responseBody = `[failed to read body: ${e.message}]`;
      }
    } else {
      entry.responseBody = `[binary content-type: ${ctype}]`;
    }
  });

  log('navigating to', ENTRY);
  await page.goto(ENTRY, { waitUntil: 'networkidle', timeout: 60_000 });
  await sleep(1500);
  await shot(page, '01_dashboard');

  log('switching wizard to גוש/חלקה mode (not sidebar — use last matching control)');
  const gushMode = page.getByText('חיפוש לפי גוש וחלקה', { exact: true });
  const n = await gushMode.count().catch(() => 0);
  if (n > 0) {
    await gushMode.last().click().catch((e) => log('gush-mode click failed:', e.message));
  } else {
    log('fallback: partial text match');
    await page.getByText(/חיפוש לפי גוש וחלקה/).last().click().catch(() => {});
  }
  await sleep(2000);
  await shot(page, '02_search_tab');

  log('locating gush/helka inputs');
  let gushInput = null;
  let helkaInput = null;

  const numInputs = page.locator('input[type="number"]').filter({ visible: true });
  const numCount = await numInputs.count().catch(() => 0);
  if (numCount >= 2) {
    log('using', numCount, 'visible number inputs');
    gushInput = numInputs.nth(0);
    helkaInput = numInputs.nth(1);
  } else {
    await page.waitForSelector('input[placeholder^="לדוגמה"]', { timeout: 15_000 }).catch(() => {});
    const allLikeInputs = page.locator('input[placeholder^="לדוגמה"]');
    const count = await allLikeInputs.count().catch(() => 0);
    log('found', count, '"לדוגמה" inputs');
    if (count >= 2) {
      gushInput = allLikeInputs.nth(0);
      helkaInput = allLikeInputs.nth(1);
    }
  }

  if (!gushInput || !helkaInput) {
    log('could not find inputs — dumping all visible inputs');
    const dump = await page.$$eval('input', (els) =>
      els.map((e) => ({
        type: e.type,
        name: e.name,
        id: e.id,
        placeholder: e.placeholder,
        ariaLabel: e.getAttribute('aria-label'),
        visible: !!(e.offsetWidth || e.offsetHeight),
      })),
    );
    writeFileSync(path.join(OUT_DIR, 'inputs-dump.json'), JSON.stringify(dump, null, 2));
    log('inputs dumped → inputs-dump.json');
  } else {
    log(`typing gush=${GUSH}, helka=${HELKA}`);
    await gushInput.click();
    await gushInput.fill(String(GUSH));
    await helkaInput.click();
    await helkaInput.fill(String(HELKA));
    await sleep(500);
    await shot(page, '03_typed');

    const clearBefore = calls.length;
    log('XHR count before submit:', clearBefore);

    // Try several submit selectors (Hebrew + the next/forward arrow some wizards use)
    const submitCandidates = [
      'button:has-text("המשך לאיתור גוש וחלקה")',
      'button:has-text("חיפוש")',
      'button:has-text("חפש")',
      'button:has-text("המשך")',
      'button:has-text("הבא")',
      'button:has-text("בדיקה")',
      'button:has-text("המשך לבדיקה")',
      'button[type="submit"]',
    ];
    let submitted = false;
    for (const sel of submitCandidates) {
      const btn = page.locator(sel).first();
      if (await btn.count().catch(() => 0)) {
        log('trying submit:', sel);
        const isDisabled = await btn.isDisabled().catch(() => false);
        if (isDisabled) {
          log('  → disabled, skipping');
          continue;
        }
        await btn.click().catch((e) => log('  → click failed:', e.message));
        submitted = true;
        break;
      }
    }
    if (!submitted) {
      log('no submit button matched — pressing Enter');
      await helkaInput.press('Enter').catch(() => {});
    }

    log('waiting 15s for network to settle');
    await sleep(15_000);
    await shot(page, '04_after_submit');

    log('XHR count after submit:', calls.length, '(+', calls.length - clearBefore, ')');
  }

  // Persist everything
  const summary = {
    ranAt: new Date().toISOString(),
    entry: ENTRY,
    gush: GUSH,
    helka: HELKA,
    totalCalls: calls.length,
    calls: calls.map((c, i) => ({
      idx: i,
      method: c.method,
      url: c.url,
      status: c.status,
      type: c.type,
      hasBody: !!c.requestBody,
      bodySize: c.requestBody?.length ?? 0,
      responseSnippet: c.responseBodySnippet,
    })),
  };
  writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(path.join(OUT_DIR, 'network.json'), JSON.stringify(calls, null, 2));

  // Also dump each "interesting" call (XHR/fetch with a body or json response) as its own file
  let saved = 0;
  for (let i = 0; i < calls.length; i++) {
    const c = calls[i];
    const url = new URL(c.url);
    const looksLikeApi =
      c.type === 'xhr' ||
      c.type === 'fetch' ||
      url.pathname.includes('/api/') ||
      (c.responseHeaders?.['content-type'] || '').includes('json');
    if (!looksLikeApi) continue;
    const slug = (url.host + url.pathname).replace(/[^a-z0-9]/gi, '_').slice(0, 80);
    writeFileSync(
      path.join(OUT_DIR, `call_${String(i).padStart(3, '0')}_${c.method}_${slug}.json`),
      JSON.stringify(c, null, 2),
    );
    saved++;
  }

  log('saved', saved, 'individual call files');
  log('summary →', path.join(OUT_DIR, 'summary.json'));
  log('all calls →', path.join(OUT_DIR, 'network.json'));

  await browser.close();
  log('done');
})().catch((err) => {
  console.error('[tabanet] FATAL:', err);
  process.exit(1);
});
