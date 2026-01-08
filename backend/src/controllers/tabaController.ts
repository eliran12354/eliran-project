/**
 * Taba Plans Controller
 * Handles requests for Taba building plans
 */

import { Request, Response } from 'express';
import { getTabaPlans } from '../services/tabaService';

/**
 * Get Taba plans by gush and helka
 * POST /api/taba/plans
 * Body: { gush: string, helka: string }
 */
export async function getTabaPlansController(req: Request, res: Response) {
  try {
    const { gush, helka } = req.body;

    if (!gush) {
      return res.status(400).json({
        success: false,
        error: 'גוש נדרש (gush is required)',
      });
    }

    if (!helka) {
      return res.status(400).json({
        success: false,
        error: 'חלקה נדרשת (helka is required)',
      });
    }

    console.log(`📋 Fetching Taba plans for gush ${gush}, helka ${helka}...`);

    const plans = await getTabaPlans(gush, helka, {
      maxPages: 10,
      pageSize: 200,
    });

    return res.json({
      success: true,
      plans,
      totalPlans: plans.length,
    });
  } catch (error: any) {
    console.error('❌ Error in getTabaPlansController:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בקבלת תוכניות טאבו',
    });
  }
}


