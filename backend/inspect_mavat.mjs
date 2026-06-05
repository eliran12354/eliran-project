/* eslint-disable */
/**
 * Quick inspector: open SV3 and dump all visible inputs/selects/buttons so we
 * can pick reliable selectors. Usage: `node inspect_mavat.mjs`
 */
import { chromium } from 'playwright';

const SV3_ENTRY =
  'https://mavat.iplan.gov.il/SV3?searchEntity=0&searchType=0&entityType=0&searchMethod=2';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  page.on('request', (r) => {
    if (r.url().includes('/rest/api/sv3/') && r.method() === 'POST') {
      console.log(
        '>> POST',
        r.method(),
        r.url(),
        'postData=',
        (r.postData() || '').slice(0, 400),
      );
    }
  });
  page.on('response', async (res) => {
    if (res.url().includes('/rest/api/sv3/') && res.request().method() === 'POST') {
      const text = await res.text().catch(() => '');
      console.log(
        '<< RESP',
        res.status(),
        res.url(),
        'body=',
        text.slice(0, 300).replace(/\s+/g, ' '),
      );
    }
  });

  await page.goto(SV3_ENTRY, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const inputs = await page.$$eval('input, select, textarea, button', (els) =>
    els
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          id: el.id || null,
          name: el.getAttribute('name'),
          cls: el.className || null,
          placeholder: el.getAttribute('placeholder'),
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          text: (el.textContent || '').trim().slice(0, 60),
          visible: rect.width > 0 && rect.height > 0,
        };
      })
      .filter((el) => el.visible),
  );

  console.log('=== VISIBLE FORM CONTROLS (inputs/selects/buttons) ===');
  console.log(JSON.stringify(inputs, null, 2));

  const extendedButtons = await page.$$eval(
    '[role="button"], a, [class*="button"], [class*="btn"], [class*="Button"]',
    (els) =>
      els
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            cls: el.className || null,
            role: el.getAttribute('role'),
            text: (el.textContent || '').trim().slice(0, 60),
            visible: rect.width > 0 && rect.height > 0,
          };
        })
        .filter((el) => el.visible && el.text.length > 0),
  );
  console.log('=== VISIBLE ROLE-BUTTONS / LINKS WITH TEXT ===');
  console.log(JSON.stringify(extendedButtons.slice(0, 50), null, 2));

  await page.screenshot({ path: 'mavat_sv3.png', fullPage: false });
  console.log('Saved screenshot: mavat_sv3.png');

  console.log('\nLeaving browser open 30s so you can inspect manually.');
  await page.waitForTimeout(30000);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
