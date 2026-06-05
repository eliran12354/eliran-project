import { Router } from 'express';
import { getAllDeals, getFilteredDeals, searchDeals } from '../controllers/dealsController.js';

const router = Router();

router.get('/all', getAllDeals);
router.get('/search', searchDeals);
router.get('/', getFilteredDeals);

export default router;
