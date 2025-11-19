import { Router } from 'express';
import {
  getGushimChunkController,
  getGushimCountController,
} from '../controllers/gushimController';

const router = Router();

// GET /api/gushim/chunk - Get gushim chunk (for progressive loading)
router.get('/chunk', getGushimChunkController);

// GET /api/gushim/count - Get gushim count
router.get('/count', getGushimCountController);

export default router;

