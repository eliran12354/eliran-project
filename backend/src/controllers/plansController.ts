import type { Request, Response } from 'express';
import * as plansService from '../services/plansService.js';
import { buildPaginated, parseIntParam } from '../lib/pagination.js';

export async function getPlans(req: Request, res: Response): Promise<void> {
  try {
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 50);
    const { rows, total } = await plansService.getPlansPaginated(page, limit);
    res.json({ success: true, data: buildPaginated(rows, total, page, limit) });
  } catch (e) {
    console.error('getPlans error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת תוכניות' });
  }
}

export async function searchPlans(req: Request, res: Response): Promise<void> {
  try {
    const q = String(req.query.q ?? '');
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 50);
    const { rows, total } = await plansService.searchPlans(q, page, limit);
    res.json({ success: true, data: buildPaginated(rows, total, page, limit) });
  } catch (e) {
    console.error('searchPlans error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בחיפוש תוכניות' });
  }
}
