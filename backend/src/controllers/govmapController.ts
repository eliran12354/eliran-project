import { Request, Response } from 'express';
import { searchParcelByGushHelka } from '../services/govmapService';

/**
 * Search for parcel by GUSH and HELKA
 * GET /api/govmap/search?gush=30500&helka=42
 */
export async function searchParcelController(req: Request, res: Response) {
  try {
    const { gush, helka } = req.query;

    if (!gush || !helka) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'gush and helka are required',
      });
    }

    const gushNum = parseInt(gush as string, 10);
    const helkaNum = parseInt(helka as string, 10);

    if (isNaN(gushNum) || isNaN(helkaNum)) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'gush and helka must be numbers',
      });
    }

    const result = await searchParcelByGushHelka(gushNum, helkaNum);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in searchParcel:', error);
    console.error('Error stack:', error.stack);
    
    // If it's a "not found" error, return 404 instead of 500
    const isNotFound = error.message && (
      error.message.includes('לא נמצאה') || 
      error.message.includes('not found') ||
      error.message.includes('לא נמצאו')
    );
    
    const statusCode = isNotFound ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: isNotFound ? 'Parcel not found' : 'Failed to search parcel',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

