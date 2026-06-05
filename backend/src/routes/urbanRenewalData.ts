import { Router } from 'express';
import {
  getProjects,
  getCompoundsGeoJSON,
  getTalarPrepGeoJSON,
} from '../controllers/urbanRenewalDataController.js';

const router = Router();

router.get('/projects', getProjects);
router.get('/compounds-geojson', getCompoundsGeoJSON);
router.get('/talar-prep-geojson', getTalarPrepGeoJSON);

export default router;
