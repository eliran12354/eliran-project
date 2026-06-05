import type { Request, Response } from 'express';
import { insertTabuRequest, type TabuRequestInput } from '../services/tabuRequestService.js';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createTabuRequest(req: Request, res: Response): Promise<void> {
  try {
    const body = (req.body ?? {}) as TabuRequestInput;

    if (typeof body.email !== 'string' || !isValidEmail(body.email.trim())) {
      res.status(400).json({ success: false, error: 'כתובת אימייל לא תקינה' });
      return;
    }

    if (body.identification_type === 'parcel') {
      if (!body.gush || !body.helka) {
        res.status(400).json({ success: false, error: 'יש למלא מספר גוש וחלקה' });
        return;
      }
    } else if (!body.city || !body.street || !body.house_number) {
      res.status(400).json({ success: false, error: 'יש למלא עיר, רחוב ומספר בית' });
      return;
    }

    const row = await insertTabuRequest(body);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error('createTabuRequest error:', e);
    res.status(500).json({ success: false, error: 'לא ניתן לשמור את הבקשה כעת' });
  }
}
