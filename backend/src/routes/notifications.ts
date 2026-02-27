import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';

const router = Router();

router.use(requireAuth);

router.get('/unread-count', getUnreadCount);
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllAsRead);

export default router;
