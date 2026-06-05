import type { Request, Response } from 'express';
import * as service from '../services/urbanRenewalDataService.js';

export async function getProjects(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await service.getAllProjects();
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getProjects error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת פרויקטים' });
  }
}

export async function getCompoundsGeoJSON(_req: Request, res: Response): Promise<void> {
  try {
    const geojson = await service.getCompoundsGeoJSON();
    res.json({ success: true, data: geojson });
  } catch (e) {
    console.error('getCompoundsGeoJSON error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת מתחמי התחדשות' });
  }
}

export async function getTalarPrepGeoJSON(_req: Request, res: Response): Promise<void> {
  try {
    const geojson = await service.getTalarPrepGeoJSON();
    res.json({ success: true, data: geojson });
  } catch (e) {
    console.error('getTalarPrepGeoJSON error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת תוכניות בהכנה' });
  }
}
