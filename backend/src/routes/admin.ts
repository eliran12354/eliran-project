import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getUsers } from '../controllers/adminController.js';

const router = Router();

router.get('/users', requireAuth, requireAdmin, getUsers);

export default router;
