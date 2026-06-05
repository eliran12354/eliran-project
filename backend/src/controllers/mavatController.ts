/**
 * Mavat Controller
 * Thin HTTP layer over `mavatService`. All outbound calls to Mavat happen here
 * so the frontend never talks to mavat.iplan.gov.il directly.
 */

import { Request, Response } from 'express';
import {
  getMavatPlanDetails,
  searchMavatPlans,
} from '../services/mavatService.js';

/**
 * GET /api/mavat-search?q=...&page=1&pageSize=20
 * Returns { results: MavatPlan[], page, pageSize, total, hasMore }.
 */
export async function getMavatSearchController(req: Request, res: Response) {
  try {
    const { q, page, pageSize } = req.query;

    const query = typeof q === 'string' ? q : '';
    const pageNum = page ? parseInt(String(page), 10) : 1;
    const pageSizeNum = pageSize ? parseInt(String(pageSize), 10) : 20;

    if (Number.isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ success: false, error: 'page must be a positive integer' });
    }
    if (Number.isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
      return res
        .status(400)
        .json({ success: false, error: 'pageSize must be between 1 and 100' });
    }

    const data = await searchMavatPlans(query, pageNum, pageSizeNum);

    return res.json({
      success: true,
      query,
      ...data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ getMavatSearchController error:', message);
    const isTimeout = message.includes('timed out');
    return res.status(isTimeout ? 504 : 502).json({
      success: false,
      error: isTimeout ? 'שירות מנהל התכנון לא הגיב בזמן' : 'שגיאה בקבלת נתונים ממנהל התכנון',
      details: message,
    });
  }
}

/**
 * GET /api/mavat-search/:id
 * Returns full details for a plan by PLAN_ID.
 */
export async function getMavatPlanDetailsController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id is required' });
    }

    const data = await getMavatPlanDetails(id);
    return res.json({ success: true, ...data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ getMavatPlanDetailsController error:', message);
    return res.status(502).json({
      success: false,
      error: 'שגיאה בקבלת פרטי תוכנית ממנהל התכנון',
      details: message,
    });
  }
}
