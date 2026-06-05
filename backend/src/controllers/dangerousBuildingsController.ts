import type { Request, Response } from 'express';
import { getActiveDangerousBuildings } from '../services/dangerousBuildingsService.js';

export async function getDangerousBuildings(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await getActiveDangerousBuildings();
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getDangerousBuildings error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת מבנים מסוכנים' });
  }
}
