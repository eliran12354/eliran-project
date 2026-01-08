import { Router } from 'express';
import { 
  getConstructionProjectsController,
  getDistinctCitiesController,
  executeSqlController
} from '../controllers/dataGovController.js';

const router = Router();

// POST /api/datagov/construction-projects - Get construction progress projects
router.post('/construction-projects', getConstructionProjectsController);

// POST /api/datagov/sql - Execute raw SQL query (debug)
router.post('/sql', executeSqlController);

// GET /api/datagov/distinct-cities - Get distinct city names (debug)
router.get('/distinct-cities', getDistinctCitiesController);

export default router;

