import type { Request, Response } from 'express';
import * as service from '../services/landCheckLookupService.js';

export async function getParcel(req: Request, res: Response): Promise<void> {
  try {
    const gush = Number(req.query.gush);
    const helka = Number(req.query.helka);
    if (!Number.isFinite(gush) || !Number.isFinite(helka)) {
      res.status(400).json({ success: false, error: 'גוש וחלקה חייבים להיות מספרים' });
      return;
    }
    const row = await service.getParcelByGushHelka(gush, helka);
    res.json({ success: true, data: row });
  } catch (e) {
    console.error('getParcel error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת נתוני חלקה' });
  }
}

export async function searchDealsByAddress(req: Request, res: Response): Promise<void> {
  try {
    const searchAddress = String(req.query.searchAddress ?? '');
    const street = String(req.query.street ?? '');
    const houseNumber = String(req.query.houseNumber ?? '');
    const city = String(req.query.city ?? '');
    const rows = await service.searchDealsByAddress(searchAddress, street, houseNumber, city);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('searchDealsByAddress error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בחיפוש עסקאות' });
  }
}

export async function getUrbanRenewalMitchamim(req: Request, res: Response): Promise<void> {
  try {
    const city = String(req.query.city ?? '');
    const street = req.query.street ? String(req.query.street) : undefined;
    if (!city) {
      res.json({ success: true, data: [] });
      return;
    }
    const rows = await service.getUrbanRenewalMitchamim(city, street);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getUrbanRenewalMitchamim error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת מתחמי התחדשות' });
  }
}
