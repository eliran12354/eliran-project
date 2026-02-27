import type { Request, Response } from 'express';
import * as notificationService from '../services/notificationService.js';

/**
 * GET /api/notifications – list notifications for the authenticated user
 * Query: ?limit=50&unreadOnly=true
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const limit = req.query.limit != null ? Math.min(100, Number(req.query.limit)) : 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notifications = await notificationService.getNotificationsByUserId(userId, {
      limit,
      unreadOnly,
    });

    res.json({ success: true, notifications });
  } catch (err: unknown) {
    console.error('Notifications getNotifications error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load notifications',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/notifications/unread-count – get count of unread notifications
 */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const count = await notificationService.getUnreadCount(userId);
    res.json({ success: true, count });
  } catch (err: unknown) {
    console.error('Notifications getUnreadCount error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * PATCH /api/notifications/:id/read – mark a single notification as read
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'Missing notification id' });
      return;
    }

    await notificationService.markAsRead(userId, id);
    res.json({ success: true });
  } catch (err: unknown) {
    console.error('Notifications markAsRead error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as read',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/notifications/mark-all-read – mark all notifications as read
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    await notificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (err: unknown) {
    console.error('Notifications markAllAsRead error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all as read',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
