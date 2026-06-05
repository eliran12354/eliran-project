import type { Request, Response } from 'express';
import { getTama70GeoJSON } from '../services/tama70Service.js';

export async function getTama70(_req: Request, res: Response): Promise<void> {
  try {
    const geojson = await getTama70GeoJSON();
    res.json({ success: true, data: geojson });
  } catch (e) {
    console.error('getTama70 error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת תמא/70' });
  }
}
