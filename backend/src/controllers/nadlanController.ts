import { Request, Response } from 'express';
// @ts-ignore - JavaScript file without type definitions
import { scrapeNadlanDeals } from '../services/nadlanScrapingService.js';

/**
 * Scrape deals from Nadlan.gov.il for a specific address
 * POST /api/nadlan/scrape
 * Body: { cityName: string, street: string, houseNumber: string, maxPages?: number }
 */
export async function scrapeDealsController(req: Request, res: Response) {
  try {
    const { cityName, street, houseNumber, maxPages } = req.body;

    if (!cityName || !street || !houseNumber) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'cityName, street, and houseNumber are required',
      });
    }

    // In production on Render free tier, run scraping in background to avoid timeout
    // Results are saved to database, client can check DB for results
    if (process.env.NODE_ENV === 'production') {
      // Return immediately and run scraping in background
      res.json({
        success: true,
        message: 'Scraping started in background. Results will be saved to database.',
        data: {
          cityName,
          street,
          houseNumber,
          status: 'processing',
        },
      });

      // Run scraping in background (don't await)
      scrapeNadlanDeals({
        cityName,
        street,
        houseNumber,
        maxPages: typeof maxPages === 'number' ? maxPages : 50,
      }).catch((error) => {
        console.error('Background scraping error:', error);
      });

      return;
    }

    // In development, wait for results (for easier debugging)
    const result = await scrapeNadlanDeals({
      cityName,
      street,
      houseNumber,
      maxPages: typeof maxPages === 'number' ? maxPages : 50,
    });

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in scrapeDealsController:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to scrape deals from Nadlan',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}





