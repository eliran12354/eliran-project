import { Router } from 'express';
import { scrapeDealsController, getScrapeStatus, getScrapeResult } from '../controllers/nadlanController.js';

const router = Router();

// POST /api/nadlan/scrape - Start scraping deals from Nadlan.gov.il (returns jobId immediately)
router.post('/scrape', scrapeDealsController);

// GET /api/nadlan/status/:jobId - Get job status
router.get('/status/:jobId', getScrapeStatus);

// GET /api/nadlan/result/:jobId - Get job result (only if done)
router.get('/result/:jobId', getScrapeResult);

export default router;







