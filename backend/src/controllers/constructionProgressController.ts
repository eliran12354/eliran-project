import type { Request, Response } from 'express';
import * as service from '../services/constructionProgressService.js';
import { buildPaginated, parseIntParam } from '../lib/pagination.js';

export async function getConstructionProgress(req: Request, res: Response): Promise<void> {
  try {
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 100);
    const { rows, total } = await service.getConstructionProgressPaginated(page, limit);
    res.json({ success: true, data: buildPaginated(rows, total, page, limit) });
  } catch (e) {
    console.error('getConstructionProgress error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת נתוני בנייה' });
  }
}
