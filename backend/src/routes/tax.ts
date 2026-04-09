import { Router } from 'express';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { postCapitalGains, postPurchaseTax } from '../controllers/taxController.js';

const router = Router();

router.post('/purchase', optionalAuth, postPurchaseTax);
router.post('/capital-gains', optionalAuth, postCapitalGains);

export default router;
