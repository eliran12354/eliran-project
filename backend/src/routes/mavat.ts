/**
 * Mavat (Israeli Planning Authority) routes.
 *
 * Public, read-only search endpoints that proxy the Mavat public API.
 */

import { Router } from 'express';
import {
  getMavatPlanDetailsController,
  getMavatSearchController,
} from '../controllers/mavatController.js';

const router = Router();

// GET /api/mavat-search?q=&page=&pageSize=
router.get('/', getMavatSearchController);

// GET /api/mavat-search/:id  → full plan details
router.get('/:id', getMavatPlanDetailsController);

export default router;
