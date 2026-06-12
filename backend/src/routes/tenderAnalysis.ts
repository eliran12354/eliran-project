/**
 * Tender Analysis routes.
 *
 * Single POST endpoint accepting either a URL or a base64-encoded file.
 * Uses a per-route JSON parser with a 32MB limit so the rest of the API
 * keeps express's default 100kb body cap.
 */

import { Router, json } from 'express';
import { analyzeTenderController } from '../controllers/tenderAnalysisController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSubscription } from '../middleware/subscription.js';

const router = Router();

router.post('/', json({ limit: '32mb' }), requireAuth, requireSubscription, analyzeTenderController);

export default router;
