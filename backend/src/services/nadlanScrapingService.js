/**
 * Service for scraping real estate deals from Nadlan.gov.il
 * JavaScript version - exact copy from scrape_nadlan_by_address.js
 */

import { chromium } from 'playwright';
import { pool } from '../config/database.js';

const DEAL_COLUMNS = [
  'city_id', 'city_name', 'serial_no', 'address', 'area_m2', 'deal_date',
  'price_nis', 'block_parcel_subparcel', 'property_type', 'rooms', 'floor',
  'trend', 'source_url', 'raw',
];

function parseNumber(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(text) {
  if (!text) return null;
  const m = String(text).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo}-${d}`;
}

function mapRowToDeal(cityName, street, houseNumber, row, serialFallback, sourceUrl) {
  const fullAddress = street && houseNumber ? `${street} ${houseNumber}` : (row['כתובת'] || null);

  return {
    city_id: null,
    city_name: cityName,
    serial_no: row['מספר סידורי'] ? parseInt(row['מספר סידורי'], 10) : serialFallback,
    address: fullAddress || row['כתובת'] || null,
    area_m2: row['שטח במ"ר'] && row['שטח במ"ר'] !== 'לא ידוע' ? parseNumber(row['שטח במ"ר']) : null,
    deal_date: parseDate(row['תאריך העסקה']),
    price_nis: row['מחיר העסקה'] ? parseNumber(row['מחיר העסקה']) : null,
    block_parcel_subparcel: row['גוש/חלקה/תת-חלקה'] || null,
    property_type: row['סוג נכס'] || null,
    rooms: row['חדרים'] ? parseNumber(row['חדרים']) : null,
    floor: row['קומה'] || null,
    trend: row['מגמת שינוי'] || null,
    source_url: sourceUrl,
    raw: row,
  };
}

async function insertBatch(rows) {
  if (!rows.length) return;

  const values = [];
  const tuples = rows.map((row, rowIndex) => {
    const base = rowIndex * DEAL_COLUMNS.length;
    const placeholders = DEAL_COLUMNS.map((col, colIndex) => {
      const position = base + colIndex + 1;
      return col === 'raw' ? `$${position}::jsonb` : `$${position}`;
    });
    values.push(
      row.city_id, row.city_name, row.serial_no, row.address, row.area_m2,
      row.deal_date, row.price_nis, row.block_parcel_subparcel, row.property_type,
      row.rooms, row.floor, row.trend, row.source_url,
      row.raw != null ? JSON.stringify(row.raw) : null
    );
    return `(${placeholders.join(', ')})`;
  });

  try {
    await pool.query(
      `INSERT INTO deals (${DEAL_COLUMNS.join(', ')}) VALUES ${tuples.join(', ')}`,
      values
    );
  } catch (error) {
    if (error.code === '23505' || /duplicate key value/i.test(error.message || '')) {
      console.warn('⚠️ דילוג על כפילויות בבאצ\' הנוכחי.');
      return;
    }
    console.error('❌ שגיאה בהכנסה למסד הנתונים:', error.message);
    throw error;
  }
}

async function saveTrendsData(addressId, cityName, street, houseNumber, trendsData) {
  if (!trendsData || Object.keys(trendsData).length === 0) return;

  const params = [
    addressId,
    cityName,
    street,
    houseNumber,
    `${street} ${houseNumber}, ${cityName}`,
    trendsData.rental_yield_percent || null,
    trendsData.price_increase_percent || null,
    trendsData.prestige_score ? parseInt(trendsData.prestige_score) : null,
    trendsData.prestige_max ? parseInt(trendsData.prestige_max) : null,
    trendsData.median_prices_by_rooms ? JSON.stringify(trendsData.median_prices_by_rooms) : null,
    trendsData.quarter_prices ? JSON.stringify(trendsData.quarter_prices) : null,
    JSON.stringify(trendsData),
    new Date().toISOString(),
  ];

  try {
    await pool.query(
      `INSERT INTO address_price_trends
         (address_id, city_name, street_name, house_number, address,
          rental_yield_percent, price_increase_percent, prestige_score, prestige_max,
          median_prices_by_rooms, quarter_prices, raw_trends_data, scraped_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13)
       ON CONFLICT (address_id) DO UPDATE SET
         city_name = EXCLUDED.city_name,
         street_name = EXCLUDED.street_name,
         house_number = EXCLUDED.house_number,
         address = EXCLUDED.address,
         rental_yield_percent = EXCLUDED.rental_yield_percent,
         price_increase_percent = EXCLUDED.price_increase_percent,
         prestige_score = EXCLUDED.prestige_score,
         prestige_max = EXCLUDED.prestige_max,
         median_prices_by_rooms = EXCLUDED.median_prices_by_rooms,
         quarter_prices = EXCLUDED.quarter_prices,
         raw_trends_data = EXCLUDED.raw_trends_data,
         scraped_at = EXCLUDED.scraped_at`,
      params
    );
    console.log('✅ נתוני מגמות נשמרו במסד הנתונים');
  } catch (error) {
    console.warn('⚠️ שגיאה בשמירת נתוני מגמות:', error.message);
  }
}

async function searchAddressAndGetId(cityName, street, houseNumber) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ locale: 'he-IL' });
  const page = await context.newPage();

  // הגדלת timeout ל-Playwright
  page.setDefaultTimeout(180000); // 3 דקות
  page.setDefaultNavigationTimeout(180000); // 3 דקות

  try {
    await page.goto('https://www.nadlan.gov.il/', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForTimeout(2000);

    const openSearch = async () => {
      const openers = [
        'button[aria-label*="חיפוש"]',
        'button:has-text("חיפוש")',
        'header button:has(svg)',
        '.search, .Search, .header .search button',
        'button[type="button"]',
        '[role="button"]',
      ];
      for (const s of openers) {
        const btn = await page.$(s).catch(() => null);
        if (btn) {
          try {
            await btn.click({ timeout: 2000 });
            await page.waitForTimeout(500);
          } catch {}
        }
        const input = await page
          .$('input[type="search"], input[placeholder*="חיפוש"], input[aria-label*="חיפוש"], input[dir="rtl"], input[type="text"]')
          .catch(() => null);
        if (input) {
          const isVisible = await input.isVisible().catch(() => false);
          if (isVisible) return input;
        }
      }
      const input = await page
        .$('input[type="search"], input[placeholder*="חיפוש"], input[aria-label*="חיפוש"], input[dir="rtl"], input[type="text"]')
        .catch(() => null);
      if (input) {
        const isVisible = await input.isVisible().catch(() => false);
        if (isVisible) return input;
      }
      return null;
    };

    let searchInput = await openSearch();
    if (!searchInput) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(800);
      searchInput = await openSearch();
    }
    if (!searchInput) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      searchInput = await openSearch();
    }

    if (!searchInput) {
      console.log('⚠️ מנסה למצוא שדה חיפוש בדרכים חלופיות...');
      await page.waitForTimeout(1000);
      searchInput = await page.$('input').catch(() => null);
    }

    if (!searchInput) {
      throw new Error('לא נמצא שדה חיפוש באתר');
    }

    const searchQueries = [`${street} ${houseNumber} ${cityName}`, `${cityName} ${street} ${houseNumber}`, `${street} ${houseNumber}`];

    let addressId = null;

    for (const query of searchQueries) {
      console.log(`🔍 מחפש: "${query}"`);
      await searchInput.fill(query);
      await page.waitForTimeout(800);

      try {
        await page.waitForSelector('li, .suggestion, [role="option"], ul li, [class*="suggestion"], [class*="option"]', {
          timeout: 3000,
        });
      } catch {}

      const suggestionTexts = await page.evaluate(
        ({ searchStreet, searchHouse, searchCity }) => {
          const selectors = ['li', '.suggestion', '[role="option"]', 'ul li', '[class*="suggestion"]', '[class*="option"]'];
          const allElements = [];
          for (const sel of selectors) {
            const elements = Array.from(document.querySelectorAll(sel));
            allElements.push(...elements);
          }

          const uniqueTexts = new Set();
          const filtered = allElements
            .map((el) => el.textContent?.trim() || '')
            .filter((text) => {
              if (!text || text.length < 3 || uniqueTexts.has(text)) return false;
              uniqueTexts.add(text);
              const lowerText = text.toLowerCase();
              const hasStreet = !searchStreet || lowerText.includes(searchStreet.toLowerCase());
              const hasHouse = !searchHouse || text.includes(searchHouse);
              const hasCity = !searchCity || lowerText.includes(searchCity.toLowerCase());
              return hasStreet && hasHouse && hasCity;
            });

          return filtered;
        },
        { searchStreet: street, searchHouse: houseNumber, searchCity: cityName }
      );

      console.log(`📋 נמצאו ${suggestionTexts.length} תוצאות אפשריות`);

      if (suggestionTexts.length > 0) {
        try {
          const firstSuggestion = page.locator(`text="${suggestionTexts[0]}"`).first();
          await firstSuggestion.waitFor({ timeout: 2000 });
          await firstSuggestion.click({ timeout: 2000 });
        } catch (e) {
          console.log(`⚠️ ניסיון לחיצה דרך locator נכשל, מנסה דרך selector כללי...`);
          const allSuggestions = await page.$$('li, .suggestion, [role="option"], ul li');
          if (allSuggestions.length > 0) {
            await allSuggestions[0].click({ timeout: 2000 }).catch(() => {
              return page.evaluate(() => {
                const first = document.querySelector('li, .suggestion, [role="option"]');
                if (first) first.click();
              });
            });
          }
        }

        await page
          .waitForURL((url) => url.toString().includes('view=address') || url.toString().includes('view=settlement'), {
            timeout: 15000,
          })
          .catch(() => {});
        await page.waitForTimeout(1000);

        const currentUrl = page.url();
        console.log(`📍 URL נוכחי: ${currentUrl}`);
        const addressIdMatch = currentUrl.match(/[?&]id=(\d+)/);
        if (addressIdMatch) {
          addressId = addressIdMatch[1];
          console.log(`✅ נמצא מזהה כתובת: ${addressId}`);
          break;
        }
      } else {
        console.log(`⚠️ לא נמצאו תוצאות, מנסה Enter...`);
        await searchInput.press('Enter');
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        console.log(`📍 URL אחרי Enter: ${currentUrl}`);
        const addressIdMatch = currentUrl.match(/[?&]id=(\d+)/);
        if (addressIdMatch) {
          addressId = addressIdMatch[1];
          console.log(`✅ נמצא מזהה כתובת: ${addressId}`);
          break;
        }
      }
    }

    await browser.close();
    return addressId;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function scrapeAddressDeals(cityName, street, houseNumber, addressId, maxPages = 50) {
  const url = `https://www.nadlan.gov.il/?view=address&id=${addressId}&page=deals`;
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    locale: 'he-IL',
    // Block images and videos to speed up scraping
    ...(process.env.NODE_ENV === 'production' && {
      blockedResources: ['image', 'media', 'font', 'stylesheet'],
    }),
  });
  const page = await context.newPage();

  // הגדלת timeout ל-Playwright
  page.setDefaultTimeout(180000); // 3 דקות
  page.setDefaultNavigationTimeout(180000); // 3 דקות

  let latestApiItems = [];
  page.on('response', async (resp) => {
    try {
      const u = resp.url();
      if (u.includes('/api/deal') && resp.request().method() === 'POST') {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('application/json')) {
          const data = await resp.json();
          const items = data?.data?.items || data?.items || [];
          if (Array.isArray(items) && items.length) latestApiItems = items;
        }
      }
    } catch {}
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });

  try {
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
  } catch {}

  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(2000);

  // חילוץ נתוני מגמות מחירים לפני חילוץ העסקאות
  console.log('📈 חולץ נתוני מגמות מחירים...');
  const trendsData = await page.evaluate(() => {
    const trendsData = {};

    function text(n) {
      return (n?.innerText || n?.textContent || '').trim();
    }

    const bodyText = document.body.innerText || '';

    const yieldMatch = bodyText.match(/([\d.]+)\s*%\s*תשואה/);
    if (yieldMatch && yieldMatch[1]) {
      trendsData.rental_yield_percent = parseFloat(yieldMatch[1]);
    }

    const priceIncreaseMatch = bodyText.match(/עליית\s+מחירים\s+([\d.]+)\s*%/);
    if (priceIncreaseMatch && priceIncreaseMatch[1]) {
      trendsData.price_increase_percent = parseFloat(priceIncreaseMatch[1]);
    }

    const prestigePatterns = [
      /ציון\s+יוקר[^\d]*(\d+)\s*\/\s*(\d+)/,
      /יוקר[^\d]*(\d+)\s*\/\s*(\d+)/,
      /(\d+)\s*\/\s*(\d+)[^\d]*ציון\s+יוקר/,
      /(\d+)\s*\/\s*(\d+)[^\d]*יוקר/,
    ];

    for (const pattern of prestigePatterns) {
      const prestigeMatch = bodyText.match(pattern);
      if (prestigeMatch && prestigeMatch[1] && prestigeMatch[2]) {
        trendsData.prestige_score = parseInt(prestigeMatch[1], 10);
        trendsData.prestige_max = parseInt(prestigeMatch[2], 10);
        break;
      }
    }

    if (!trendsData.prestige_score) {
      const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="Card"], div, section'));
      for (const card of cards) {
        const cardText = text(card);
        if (cardText.includes('יוקר') || cardText.includes('ציון')) {
          const scoreMatch = cardText.match(/(\d+)\s*\/\s*(\d+)/);
          if (scoreMatch && scoreMatch[1] && scoreMatch[2]) {
            trendsData.prestige_score = parseInt(scoreMatch[1], 10);
            trendsData.prestige_max = parseInt(scoreMatch[2], 10);
            break;
          }
        }
      }
    }

    const medianPrices = {};
    const roomPricePattern = /(\d+)\s*חדרים[:\s]*([\d.]+)\s*מ'?\s*₪/g;
    let roomMatch;
    while ((roomMatch = roomPricePattern.exec(bodyText)) !== null) {
      medianPrices[`${roomMatch[1]}_rooms`] = parseFloat(roomMatch[2]);
    }

    const weightedMatch = bodyText.match(/משוקלל[^\d]*([\d.]+)\s*מ'?\s*₪/);
    if (weightedMatch && weightedMatch[1]) {
      medianPrices.weighted_all = parseFloat(weightedMatch[1]);
    }

    if (Object.keys(medianPrices).length > 0) {
      trendsData.median_prices_by_rooms = medianPrices;
    }

    const quarterPrices = {};

    const neighborhoodNameMatch = bodyText.match(/מחיר\s+חציוני\s+(?:ב|בשכונת|בשכונה)?([^:]+?):\s*([\d.]+)\s*מ'?\s*₪/);
    if (neighborhoodNameMatch && neighborhoodNameMatch[1] && neighborhoodNameMatch[2]) {
      const neighborhoodName = neighborhoodNameMatch[1].trim();
      const price = parseFloat(neighborhoodNameMatch[2]);
      quarterPrices.neighborhood_name = neighborhoodName;
      quarterPrices.neighborhood = price;
    }

    const cityPriceMatch = bodyText.match(/תל\s+אביב[^\d]*([\d.]+)\s*מ'?\s*₪/);
    if (cityPriceMatch && cityPriceMatch[1]) {
      quarterPrices.city = parseFloat(cityPriceMatch[1]);
    }

    const nationalPriceMatch = bodyText.match(/מחיר\s+ארצי[^\d]*([\d.]+)\s*מ'?\s*₪/);
    if (nationalPriceMatch && nationalPriceMatch[1]) {
      quarterPrices.national = parseFloat(nationalPriceMatch[1]);
    }

    if (Object.keys(quarterPrices).length > 0) {
      trendsData.quarter_prices = quarterPrices;
    }

    return trendsData;
  });

  if (Object.keys(trendsData).length > 0) {
    console.log('✅ נתוני מגמות:', JSON.stringify(trendsData, null, 2));
    await saveTrendsData(addressId, cityName, street, houseNumber, trendsData);
  } else {
    console.log('⚠️ לא נמצאו נתוני מגמות');
  }

  const readPageRows = async () => {
    return await page.evaluate(() => {
      function text(n) {
        return (n?.innerText || n?.textContent || '').trim();
      }
      const tables = Array.from(document.querySelectorAll('section table, table, [role="table"]'));
      let best = null;
      let bestRows = [];
      for (const tbl of tables) {
        const rows = Array.from(tbl.querySelectorAll('tbody tr, tr[role="row"]'));
        if (rows.length > bestRows.length) {
          best = tbl;
          bestRows = rows;
        }
      }
      const headerCells = best ? Array.from(best.querySelectorAll('thead th, th[role="columnheader"]')).map(text) : [];
      return bestRows.map((tr) => {
        const cells = Array.from(tr.querySelectorAll('td')).map(text);
        const obj = {};
        if (headerCells.length === cells.length && headerCells.length > 0) {
          headerCells.forEach((h, i) => {
            obj[h || `col_${i + 1}`] = cells[i];
          });
          return obj;
        }
        return { raw: cells };
      });
    });
  };

  const clickNextIfExists = async () => {
    const beforeKey = await page.evaluate(() => {
      const tr = document.querySelector('table tbody tr');
      return tr ? tr.textContent?.trim().slice(0, 120) : '';
    });
    const locs = [
      page.locator('a:has-text("הבא")').first(),
      page.locator('button:has-text("הבא")').first(),
      page.locator('text=הבא').first(),
    ];
    for (const loc of locs) {
      if (await loc.isVisible().catch(() => false)) {
        for (let i = 0; i < 2; i++) {
          try {
            await loc.click({ timeout: 3000 });
            break;
          } catch {
            await page.waitForTimeout(300);
          }
        }
        await Promise.race([
          page
            .waitForResponse((r) => r.url().includes('/api/deal') && r.request().method() === 'POST', { timeout: 15000 })
            .catch(() => null),
          page
            .waitForFunction(
              (k) => {
                const tr = document.querySelector('table tbody tr');
                const now = tr ? tr.textContent?.trim().slice(0, 120) : '';
                return now && now !== k;
              },
              beforeKey,
              { timeout: 15000 }
            )
            .catch(() => null),
        ]);
        await page.waitForTimeout(600);
        return true;
      }
    }
    return false;
  };

  let collected = 0;
  const allDeals = [];

  for (let p = 1; p <= maxPages; p++) {
    let pageItems = [];
    if (latestApiItems.length) {
      console.log(`📦 שימוש בנתונים מ-API: ${latestApiItems.length} פריטים`);
      pageItems = latestApiItems;
      latestApiItems = [];
    } else {
      console.log(`📖 קורא נתונים מהדף...`);
      pageItems = await readPageRows();
      console.log(`📊 נמצאו ${pageItems.length} שורות בעמוד`);
    }

    const mapped = pageItems.map((r, i) => mapRowToDeal(cityName, street, houseNumber, r, i + 1, page.url()));
    allDeals.push(...mapped);

    if (mapped.length) {
      try {
        await insertBatch(mapped);
      } catch (e) {
        console.error(`❌ שגיאה בהכנסה (עמוד ${p}):`, e.message);
      }
    }
    collected += mapped.length;
    console.log(`📍 ${cityName}, ${street} ${houseNumber} – עמוד ${p}, הוכנסו ${mapped.length}, סה"כ ${collected}`);

    const ok = await clickNextIfExists();
    if (!ok) break;
  }

  await browser.close();
  return { 
    count: collected, 
    deals: allDeals,
    trendsData: Object.keys(trendsData).length > 0 ? trendsData : null // Return trends data directly
  };
}

export async function scrapeNadlanDeals(request) {
  const SCRAPER_TIMEOUT = 180000; // 3 דקות (180,000ms)
  
  const scraperPromise = (async () => {
    try {
      const { cityName, street, houseNumber, maxPages = 50 } = request;

      console.log(`🔍 מחפש כתובת: ${cityName}, ${street} ${houseNumber}...`);

      const addressId = await searchAddressAndGetId(cityName, street, houseNumber);

      if (!addressId) {
        return {
          success: false,
          dealsScraped: 0,
          message: `לא נמצא מזהה לכתובת: ${cityName}, ${street} ${houseNumber}`,
        };
      }

      console.log(`✅ נמצא מזהה כתובת: ${addressId}`);
      console.log(`📊 מתחיל לגרד עסקאות...`);

      const result = await scrapeAddressDeals(cityName, street, houseNumber, addressId, maxPages);

      return {
        success: true,
        addressId,
        dealsScraped: result.count,
        deals: result.deals || [],
        trendsData: result.trendsData || null, // Include trends data in response
        message: `סה"כ הוכנסו ${result.count} עסקאות`,
      };
    } catch (error) {
      console.error('❌ שגיאה ב-scraping:', error);
      return {
        success: false,
        dealsScraped: 0,
        message: error.message || 'שגיאה לא ידועה',
      };
    }
  })();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: false,
        dealsScraped: 0,
        message: `הסקרייפר חרג מזמן - timeout לאחר ${SCRAPER_TIMEOUT / 1000} שניות (3 דקות)`,
      });
    }, SCRAPER_TIMEOUT);
  });

  try {
    const result = await Promise.race([scraperPromise, timeoutPromise]);
    return result;
  } catch (error) {
    console.error('❌ שגיאה ב-scraping:', error);
    return {
      success: false,
      dealsScraped: 0,
      message: error.message || 'שגיאה לא ידועה',
    };
  }
}


