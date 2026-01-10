import { Request, Response } from 'express';
// @ts-ignore - JavaScript file without type definitions
import { scrapeNadlanDeals } from '../services/nadlanScrapingService.js';
import { createJob, updateJob, getJob } from '../lib/jobs.js';

/**
 * Start scraping deals from Nadlan.gov.il for a specific address
 * POST /api/nadlan/scrape
 * Body: { cityName: string, street: string, houseNumber: string, maxPages?: number }
 * Returns: { jobId: string, status: "processing" } (202 Accepted)
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

    // Create job and return immediately
    const job = createJob();
    res.status(202).json({
      jobId: job.id,
      status: 'processing',
      message: 'Scraping started in background. Use jobId to check status and get results.',
    });

    // Run scraping in background
    (async () => {
      try {
        updateJob(job.id, { status: 'running' });
        const result = await scrapeNadlanDeals({
          cityName,
          street,
          houseNumber,
          maxPages: typeof maxPages === 'number' ? maxPages : 50,
        });
        updateJob(job.id, { status: 'done', result });
      } catch (e: any) {
        console.error('Background scraping error:', e);
        updateJob(job.id, { status: 'error', error: e?.message ?? 'Unknown error' });
      }
    })();
  } catch (error: any) {
    console.error('Error in scrapeDealsController:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scraping',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Get job status
 * GET /api/nadlan/status/:jobId
 * Returns: { jobId: string, status: string, updatedAt: number }
 */
export function getScrapeStatus(req: Request, res: Response) {
  const { jobId } = req.params;
  const job = getJob(jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      message: `Job with id ${jobId} does not exist or has been cleaned up`,
    });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    updatedAt: job.updatedAt,
    createdAt: job.createdAt,
  });
}

/**
 * Get job result (only if status is "done")
 * GET /api/nadlan/result/:jobId
 * Returns: { jobId: string, status: "done", result: any }
 */
export function getScrapeResult(req: Request, res: Response) {
  const { jobId } = req.params;
  const job = getJob(jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      message: `Job with id ${jobId} does not exist or has been cleaned up`,
    });
  }

  if (job.status === 'error') {
    return res.status(500).json({
      jobId: job.id,
      status: job.status,
      error: job.error,
      updatedAt: job.updatedAt,
    });
  }

  if (job.status !== 'done') {
    return res.status(409).json({
      jobId: job.id,
      status: job.status,
      message: `Job is still ${job.status}. Please check status endpoint.`,
      updatedAt: job.updatedAt,
    });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    result: job.result,
    updatedAt: job.updatedAt,
  });
}





