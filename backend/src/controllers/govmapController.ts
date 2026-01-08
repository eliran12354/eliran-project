import { Request, Response } from 'express';
import { 
  searchParcelByGushHelka,
  getEntitiesByPoint,
  getRealEstateDealsByPoint,
  getMultipleLayersByPoint,
  geocodeAddress
} from '../services/govmapService.js';

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

/**
 * Get entities from GovMap by point coordinates
 * POST /api/govmap/entities-by-point
 * Body: { x: number, y: number, layers?: number[], radius?: number }
 */
export async function getEntitiesByPointController(req: Request, res: Response) {
  try {
    const { x, y, layers, radius } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'x and y coordinates (ITM) are required as numbers',
      });
    }

    const layerIds = Array.isArray(layers) ? layers : [16]; // Default to layer 16 (deals)
    const searchRadius = typeof radius === 'number' ? radius : 500;

    const result = await getEntitiesByPoint(x, y, layerIds, searchRadius);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getEntitiesByPoint:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch entities from GovMap',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Get real estate deals from GovMap by point
 * POST /api/govmap/deals-by-point
 * Body: { x: number, y: number, radius?: number }
 */
export async function getDealsByPointController(req: Request, res: Response) {
  try {
    const { x, y, radius } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'x and y coordinates (ITM) are required as numbers',
      });
    }

    const searchRadius = typeof radius === 'number' ? radius : 500;

    const deals = await getRealEstateDealsByPoint(x, y, searchRadius);

    res.json({
      success: true,
      data: deals,
      count: deals.length,
    });
  } catch (error: any) {
    console.error('Error in getDealsByPoint:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deals from GovMap',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Get multiple layers from GovMap by point
 * POST /api/govmap/layers-by-point
 * Body: { x: number, y: number, layers: number[], radius?: number }
 */
export async function getLayersByPointController(req: Request, res: Response) {
  try {
    const { x, y, layers, radius } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'x and y coordinates (ITM) are required as numbers',
      });
    }

    if (!Array.isArray(layers) || layers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'layers array is required',
      });
    }

    const searchRadius = typeof radius === 'number' ? radius : 500;

    const result = await getMultipleLayersByPoint(x, y, layers, searchRadius);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getLayersByPoint:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch layers from GovMap',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Geocode address using GovMap search API
 * GET /api/govmap/geocode?term=יגאל אלון 98, תל אביב
 */
export async function geocodeAddressController(req: Request, res: Response) {
  try {
    const { term } = req.query;

    if (!term || typeof term !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'term query parameter is required',
      });
    }

    const suggestions = await geocodeAddress(term);

    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
    });
  } catch (error: any) {
    console.error('Error in geocodeAddress:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to geocode address',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

