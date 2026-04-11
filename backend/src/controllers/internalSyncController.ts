import type { Request, Response } from 'express';
import { config } from '../config/env.js';
import { runUrbanRenewalNotificationSync } from '../services/urbanRenewalNotificationSyncService.js';
import { runDangerousBuildingsNotificationSync } from '../services/dangerousBuildingsNotificationSyncService.js';

const CRON_HEADER = 'x-cron-secret';

function verifyCronSecret(req: Request, res: Response): boolean {
  if (!config.cronSecret) {
    res.status(503).json({
      success: false,
      error: 'CRON_SECRET is not configured',
    });
    return false;
  }

  const secret =
    typeof req.headers[CRON_HEADER] === 'string'
      ? req.headers[CRON_HEADER]
      : undefined;
  if (!secret || secret !== config.cronSecret) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

export async function postUrbanRenewalNotificationSync(
  req: Request,
  res: Response
): Promise<void> {
  if (!verifyCronSecret(req, res)) return;

  const result = await runUrbanRenewalNotificationSync();
  if (!result.success) {
    res.status(500).json({
      success: false,
      error: result.error,
    });
    return;
  }

  res.json({
    success: true,
    baselineOnly: result.baselineOnly,
    totalIds: result.totalIds,
    newCount: result.newCount,
    notifiedUsers: result.notifiedUsers,
  });
}

export async function postDangerousBuildingsNotificationSync(
  req: Request,
  res: Response
): Promise<void> {
  if (!verifyCronSecret(req, res)) return;

  const result = await runDangerousBuildingsNotificationSync();
  if (!result.success) {
    res.status(500).json({
      success: false,
      error: result.error,
    });
    return;
  }

  res.json({
    success: true,
    baselineOnly: result.baselineOnly,
    totalIds: result.totalIds,
    newCount: result.newCount,
    notifiedUsers: result.notifiedUsers,
  });
}
