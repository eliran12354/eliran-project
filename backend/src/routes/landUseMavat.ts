import { Router } from 'express';
import {
  getLandUseMavatChunkController,
  getLandUseMavatCountController,
} from '../controllers/landUseMavatController.js';

const router = Router();

// GET /api/land-use-mavat/chunk - Get land_use_mavat chunk (for progressive loading)
router.get('/chunk', getLandUseMavatChunkController);

// GET /api/land-use-mavat/count - Get land_use_mavat count
router.get('/count', getLandUseMavatCountController);

export default router;

