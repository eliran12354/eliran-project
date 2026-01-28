import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMe } from '../controllers/meController.js';

const router = Router();

router.get('/', requireAuth, getMe);

export default router;
