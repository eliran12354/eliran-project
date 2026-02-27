import { Router } from 'express';
import { 
  getConstructionProjectsController,
  getDistinctCitiesController,
  executeSqlController,
  getUrbanRenewalMitchamimController,
  getHousingLotteryController,
  getTenderResultsController,
} from '../controllers/dataGovController.js';

const router = Router();

// POST /api/datagov/construction-projects - Get construction progress projects
router.post('/construction-projects', getConstructionProjectsController);

// POST /api/datagov/urban-renewal-mitchamim - Get urban renewal mitchamim from data.gov.il
router.post('/urban-renewal-mitchamim', getUrbanRenewalMitchamimController);

// POST /api/datagov/sql - Execute raw SQL query (debug)
router.post('/sql', executeSqlController);

// GET /api/datagov/distinct-cities - Get distinct city names (debug)
router.get('/distinct-cities', getDistinctCitiesController);

// מעקב אחר הגרלות דירה בהנחה (מחיר למשתכן)
router.get('/housing-lottery', getHousingLotteryController);
router.post('/housing-lottery', getHousingLotteryController);

// תוצאות מכרזי פיתוח ותשתית
router.get('/tender-results', getTenderResultsController);
router.post('/tender-results', getTenderResultsController);

export default router;

