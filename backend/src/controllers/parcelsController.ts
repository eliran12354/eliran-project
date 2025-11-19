import { Request, Response } from 'express';
import { getParcels, getParcelsCount, getParcelsChunk } from '../services/parcelsService.js';

/**
 * Get all parcels (with optional viewport filter)
 * GET /api/parcels?min_lat=31&max_lat=32&min_lng=34&max_lng=35&limit=1000
 */
export async function getAllParcels(req: Request, res: Response) {
  try {
    const { min_lat, max_lat, min_lng, max_lng, limit } = req.query;

    const viewport =
      min_lat && max_lat && min_lng && max_lng
        ? {
            minLat: parseFloat(min_lat as string),
            maxLat: parseFloat(max_lat as string),
            minLng: parseFloat(min_lng as string),
            maxLng: parseFloat(max_lng as string),
          }
        : undefined;

    const limitNum = limit ? parseInt(limit as string, 10) : 1000;

    const features = await getParcels(viewport, limitNum);
    const total = await getParcelsCount();

    res.json({
      type: 'FeatureCollection',
      features,
      count: features.length,
      total,
      viewport: viewport || null,
    });
  } catch (error: any) {
    console.error('Error in getAllParcels:', error);
    res.status(500).json({
      error: 'Failed to fetch parcels',
      message: error.message,
    });
  }
}

/**
 * Get parcels within viewport
 * GET /api/parcels/viewport?min_lat=31&max_lat=32&min_lng=34&max_lng=35
 */
export async function getParcelsInViewport(req: Request, res: Response) {
  try {
    const { min_lat, max_lat, min_lng, max_lng, limit } = req.query;

    if (!min_lat || !max_lat || !min_lng || !max_lng) {
      return res.status(400).json({
        error: 'Missing viewport parameters',
        message: 'min_lat, max_lat, min_lng, max_lng are required',
      });
    }

    const viewport = {
      minLat: parseFloat(min_lat as string),
      maxLat: parseFloat(max_lat as string),
      minLng: parseFloat(min_lng as string),
      maxLng: parseFloat(max_lng as string),
    };

    const limitNum = limit ? parseInt(limit as string, 10) : 1000;

    const features = await getParcels(viewport, limitNum);

    res.json({
      type: 'FeatureCollection',
      features,
      count: features.length,
      viewport,
    });
  } catch (error: any) {
    console.error('Error in getParcelsInViewport:', error);
    res.status(500).json({
      error: 'Failed to fetch parcels in viewport',
      message: error.message,
    });
  }
}

/**
 * Get parcels count
 * GET /api/parcels/count
 */
export async function getParcelsCountController(req: Request, res: Response) {
  try {
    const count = await getParcelsCount();
    res.json({ count });
  } catch (error: any) {
    console.error('Error in getParcelsCount:', error);
    res.status(500).json({
      error: 'Failed to get parcels count',
      message: error.message,
    });
  }
}

/**
 * Get parcels chunk (for progressive loading)
 * GET /api/parcels/chunk?page=1&pageSize=500&min_lat=31&max_lat=32&min_lng=34&max_lng=35
 */
export async function getParcelsChunkController(req: Request, res: Response) {
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

    const result = await getParcelsChunk(pageNum, pageSizeNum, viewport);

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
    console.error('Error in getParcelsChunk:', error);
    res.status(500).json({
      error: 'Failed to fetch parcels chunk',
      message: error.message,
    });
  }
}

