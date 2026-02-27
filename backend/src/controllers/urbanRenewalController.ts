/**
 * Urban Renewal Controller
 * Handles requests for urban renewal mitchamim
 */

import { Request, Response } from 'express';
import { getUrbanRenewalMitchamim } from '../services/urbanRenewalService.js';

/**
 * Get urban renewal mitchamim by city and street
 * POST /api/urban-renewal/mitchamim
 * Body: { city: string, street?: string }
 */
export async function getUrbanRenewalMitchamimController(req: Request, res: Response) {
  try {
    const { city, street } = req.body;

    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'עיר נדרשת (city is required)',
      });
    }

    console.log(`🏘️ [UrbanRenewalController] Fetching mitchamim for city: ${city}, street: ${street || 'N/A'}...`);

    const mitchamim = await getUrbanRenewalMitchamim(city, street);

    return res.json({
      success: true,
      mitchamim,
      totalMitchamim: mitchamim.length,
    });
  } catch (error: any) {
    console.error('❌ [UrbanRenewalController] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בקבלת מתחמי התחדשות עירונית',
    });
  }
}
