/**
 * Urban Renewal Routes
 */

import { Router } from 'express';
import { getUrbanRenewalMitchamimController } from '../controllers/urbanRenewalController.js';

const router = Router();

/**
 * POST /api/urban-renewal/mitchamim
 * Get urban renewal mitchamim by city and street
 * Body: { city: string, street?: string }
 */
router.post('/mitchamim', getUrbanRenewalMitchamimController);

export default router;
