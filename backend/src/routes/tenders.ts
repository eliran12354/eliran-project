import { Router } from 'express';
import {
  getActiveTenders,
  searchActiveTenders,
  searchAllTenders,
  getSampleTenders,
} from '../controllers/tenderController.js';

const router = Router();

router.get('/active', getActiveTenders);
router.get('/active/search', searchActiveTenders);
router.get('/search', searchAllTenders);
router.get('/sample', getSampleTenders);

export default router;
