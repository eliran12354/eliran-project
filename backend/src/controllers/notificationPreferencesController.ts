import type { Request, Response } from 'express';
import * as notificationPreferencesService from '../services/notificationPreferencesService.js';
import { formatSupabaseError } from '../lib/supabaseError.js';

export async function getNotificationPreferences(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const preferences =
      await notificationPreferencesService.getNotificationPreferences(userId);
    res.json({ success: true, preferences });
  } catch (err: unknown) {
    console.error('getNotificationPreferences error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load notification preferences',
      message: formatSupabaseError(err),
    });
  }
}

export async function patchNotificationPreferences(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const body = req.body as {
      notify_urban_renewal_new?: unknown;
      notify_dangerous_buildings_new?: unknown;
      notify_hot_investor_boards_new?: unknown;
    };

    const hasUrban = typeof body.notify_urban_renewal_new === 'boolean';
    const hasDangerous =
      typeof body.notify_dangerous_buildings_new === 'boolean';
    const hasHotBoards =
      typeof body.notify_hot_investor_boards_new === 'boolean';

    if (!hasUrban && !hasDangerous && !hasHotBoards) {
      res.status(400).json({
        success: false,
        error:
          'Provide at least one boolean: notify_urban_renewal_new, notify_dangerous_buildings_new, notify_hot_investor_boards_new',
      });
      return;
    }

    const current =
      await notificationPreferencesService.getNotificationPreferences(userId);
    const nextUrban = hasUrban
      ? (body.notify_urban_renewal_new as boolean)
      : current.notify_urban_renewal_new;
    const nextDangerous = hasDangerous
      ? (body.notify_dangerous_buildings_new as boolean)
      : current.notify_dangerous_buildings_new;
    const nextHotBoards = hasHotBoards
      ? (body.notify_hot_investor_boards_new as boolean)
      : current.notify_hot_investor_boards_new;
    const preferences =
      await notificationPreferencesService.upsertNotificationPreferences(
        userId,
        {
          notify_urban_renewal_new: nextUrban,
          notify_dangerous_buildings_new: nextDangerous,
          notify_hot_investor_boards_new: nextHotBoards,
        }
      );
    res.json({ success: true, preferences });
  } catch (err: unknown) {
    console.error('patchNotificationPreferences error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to save notification preferences',
      message: formatSupabaseError(err),
    });
  }
}
