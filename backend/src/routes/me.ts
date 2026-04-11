import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMe } from '../controllers/meController.js';
import {
  getNotificationPreferences,
  patchNotificationPreferences,
} from '../controllers/notificationPreferencesController.js';

const router = Router();

router.get('/', requireAuth, getMe);
router.get('/notification-preferences', requireAuth, getNotificationPreferences);
router.patch('/notification-preferences', requireAuth, patchNotificationPreferences);

export default router;
