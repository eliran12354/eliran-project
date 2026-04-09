import type { Request, Response } from 'express';
import {
  capitalGainsRequestSchema,
  purchaseTaxRequestSchema,
  capitalGainsResponseSchema,
  purchaseTaxResponseSchema,
} from '../validation/taxSchemas.js';
import { runCapitalGainsService, runPurchaseTaxService } from '../services/taxCalculationService.js';

function userIdFromRequest(req: Request): string | null {
  return req.user?.sub ?? null;
}

export async function postPurchaseTax(req: Request, res: Response): Promise<void> {
  const parsed = purchaseTaxRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'קלט לא תקין', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await runPurchaseTaxService(parsed.data, userIdFromRequest(req));
    const out = purchaseTaxResponseSchema.safeParse(result);
    if (!out.success) {
      console.error('[tax] response validation', out.error);
      res.status(500).json({ success: false, error: 'שגיאת שרת בתוצאה' });
      return;
    }
    res.json({ success: true, data: out.data });
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === 'NO_RULE_VERSION') {
      res.status(422).json({
        success: false,
        error: 'לא נמצאה גרסת כללים לתאריך העסקה. יש לטעון נתוני מס ב-Supabase.',
      });
      return;
    }
    console.error('[postPurchaseTax]', e);
    res.status(500).json({ success: false, error: 'שגיאת שרת' });
  }
}

export async function postCapitalGains(req: Request, res: Response): Promise<void> {
  const parsed = capitalGainsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'קלט לא תקין', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await runCapitalGainsService(parsed.data, userIdFromRequest(req));
    const out = capitalGainsResponseSchema.safeParse(result);
    if (!out.success) {
      console.error('[tax] response validation', out.error);
      res.status(500).json({ success: false, error: 'שגיאת שרת בתוצאה' });
      return;
    }
    res.json({ success: true, data: out.data });
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === 'NO_RULE_VERSION') {
      res.status(422).json({
        success: false,
        error: 'לא נמצאה גרסת כללים לתאריך המכירה. יש לטעון נתוני מס ב-Supabase.',
      });
      return;
    }
    if (err.code === 'NO_CAPITAL_GAINS_RULE') {
      res.status(422).json({
        success: false,
        error: 'לא נמצאו כללי מס שבח לסוג הנכס שנבחר. יש לעדכן את הטבלה או לבחור סוג אחר.',
      });
      return;
    }
    console.error('[postCapitalGains]', e);
    res.status(500).json({ success: false, error: 'שגיאת שרת' });
  }
}
