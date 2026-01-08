/**
 * Taba Plans Routes
 */

import { Router } from 'express';
import { getTabaPlansController } from '../controllers/tabaController';

const router = Router();

/**
 * POST /api/taba/plans
 * Get Taba plans by gush and helka
 * Body: { gush: string, helka: string }
 */
router.post('/plans', getTabaPlansController);

export default router;


