import { Router } from 'express';
import { searchParcelController } from '../controllers/govmapController';

const router = Router();

// GET /api/govmap/search - Search for parcel by GUSH and HELKA
router.get('/search', searchParcelController);

export default router;

