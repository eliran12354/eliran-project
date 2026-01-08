import { Router } from 'express';
import { 
  searchParcelController,
  getEntitiesByPointController,
  getDealsByPointController,
  getLayersByPointController,
  geocodeAddressController
} from '../controllers/govmapController.js';

const router = Router();

// GET /api/govmap/search - Search for parcel by GUSH and HELKA
router.get('/search', searchParcelController);

// GET /api/govmap/geocode - Geocode address using GovMap search API
router.get('/geocode', geocodeAddressController);

// POST /api/govmap/entities-by-point - Get entities from GovMap by point
router.post('/entities-by-point', getEntitiesByPointController);

// POST /api/govmap/deals-by-point - Get real estate deals from GovMap by point
router.post('/deals-by-point', getDealsByPointController);

// POST /api/govmap/layers-by-point - Get multiple layers from GovMap by point
router.post('/layers-by-point', getLayersByPointController);

export default router;

