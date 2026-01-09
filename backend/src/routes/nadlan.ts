import { Router } from 'express';
import { scrapeDealsController } from '../controllers/nadlanController.js';

const router = Router();

// POST /api/nadlan/scrape - Scrape deals from Nadlan.gov.il
router.post('/scrape', scrapeDealsController);

export default router;






