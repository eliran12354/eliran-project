import { Request, Response } from 'express';
import { getLandUseMavatChunk, getLandUseMavatCount } from '../services/landUseMavatService.js';

/**
 * Get land_use_mavat chunk (for progressive loading)
 * GET /api/land-use-mavat/chunk?page=1&pageSize=500&min_lat=31&max_lat=32&min_lng=34&max_lng=35
 */
export async function getLandUseMavatChunkController(req: Request, res: Response) {
  try {
    const { page, pageSize, min_lat, max_lat, min_lng, max_lng } = req.query;

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize as string, 10) : 500;

    const viewport =
      min_lat && max_lat && min_lng && max_lng
        ? {
            minLat: parseFloat(min_lat as string),
            maxLat: parseFloat(max_lat as string),
            minLng: parseFloat(min_lng as string),
            maxLng: parseFloat(max_lng as string),
          }
        : undefined;

    const result = await getLandUseMavatChunk(pageNum, pageSizeNum, viewport);

    res.json({
      type: 'FeatureCollection',
      features: result.features,
      count: result.features.length,
      hasMore: result.hasMore,
      page: result.page,
      totalLoaded: result.totalLoaded,
      viewport: viewport || null,
    });
  } catch (error: any) {
    console.error('Error in getLandUseMavatChunk:', error);
    res.status(500).json({
      error: 'Failed to fetch land_use_mavat chunk',
      message: error.message,
    });
  }
}

/**
 * Get land_use_mavat count
 * GET /api/land-use-mavat/count
 */
export async function getLandUseMavatCountController(req: Request, res: Response) {
  try {
    const count = await getLandUseMavatCount();
    res.json({ count });
  } catch (error: any) {
    console.error('Error in getLandUseMavatCount:', error);
    res.status(500).json({
      error: 'Failed to get land_use_mavat count',
      message: error.message,
    });
  }
}







