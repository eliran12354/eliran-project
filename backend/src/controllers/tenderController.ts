import type { Request, Response } from 'express';
import * as tenderService from '../services/tenderService.js';
import { buildPaginated, parseIntParam } from '../lib/pagination.js';

export async function getActiveTenders(req: Request, res: Response): Promise<void> {
  try {
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 60);
    const { rows, total } = await tenderService.getActivePaginated(page, limit);
    res.json({ success: true, data: buildPaginated(rows, total, page, limit) });
  } catch (e) {
    console.error('getActiveTenders error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת מכרזים' });
  }
}

export async function searchActiveTenders(req: Request, res: Response): Promise<void> {
  try {
    const q = String(req.query.q ?? '');
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 60);
    const { rows, total } = await tenderService.searchActiveTenders(q, page, limit);
    res.json({ success: true, data: buildPaginated(rows, total, page, limit) });
  } catch (e) {
    console.error('searchActiveTenders error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בחיפוש מכרזים' });
  }
}

export async function searchAllTenders(req: Request, res: Response): Promise<void> {
  try {
    const q = String(req.query.q ?? '');
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 20);
    const { rows, total } = await tenderService.searchAllTenders(q, page, limit);
    res.json({ success: true, data: buildPaginated(rows, total, page, limit) });
  } catch (e) {
    console.error('searchAllTenders error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בחיפוש מכרזים' });
  }
}

export async function getSampleTenders(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseIntParam(req.query.limit, 5);
    const rows = await tenderService.getSampleTenders(limit);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getSampleTenders error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת נתונים' });
  }
}
