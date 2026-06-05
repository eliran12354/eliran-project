import { Router } from 'express';
import { getPlans, searchPlans } from '../controllers/plansController.js';

const router = Router();

router.get('/', getPlans);
router.get('/search', searchPlans);

export default router;
