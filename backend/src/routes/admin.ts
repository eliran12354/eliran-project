import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getUsers, getStats, getContactSubmissions } from '../controllers/adminController.js';

const router = Router();

router.get('/stats', requireAuth, requireAdmin, getStats);
router.get('/users', requireAuth, requireAdmin, getUsers);
router.get('/contact-submissions', requireAuth, requireAdmin, getContactSubmissions);

export default router;
