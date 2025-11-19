import { Router } from 'express';
import {
  getAllParcels,
  getParcelsInViewport,
  getParcelsCountController,
  getParcelsChunkController,
} from '../controllers/parcelsController';

const router = Router();

// GET /api/parcels - Get all parcels (with optional viewport filter)
router.get('/', getAllParcels);

// GET /api/parcels/chunk - Get parcels chunk (for progressive loading)
router.get('/chunk', getParcelsChunkController);

// GET /api/parcels/viewport - Get parcels within viewport
router.get('/viewport', getParcelsInViewport);

// GET /api/parcels/count - Get parcels count
router.get('/count', getParcelsCountController);

export default router;

