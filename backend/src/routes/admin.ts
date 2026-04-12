import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getUsers, getStats, getContactSubmissions } from '../controllers/adminController.js';
import {
  deleteAdminFeaturedProfessional,
  getAdminFeaturedProfessionals,
  patchAdminFeaturedProfessional,
  postAdminFeaturedProfessional,
} from '../controllers/featuredProfessionalsController.js';

const router = Router();

router.get('/stats', requireAuth, requireAdmin, getStats);
router.get('/users', requireAuth, requireAdmin, getUsers);
router.get('/contact-submissions', requireAuth, requireAdmin, getContactSubmissions);

router.get('/featured-professionals', requireAuth, requireAdmin, getAdminFeaturedProfessionals);
router.post('/featured-professionals', requireAuth, requireAdmin, postAdminFeaturedProfessional);
router.patch('/featured-professionals/:id', requireAuth, requireAdmin, patchAdminFeaturedProfessional);
router.delete('/featured-professionals/:id', requireAuth, requireAdmin, deleteAdminFeaturedProfessional);

export default router;
