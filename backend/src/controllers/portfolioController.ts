import type { Request, Response } from 'express';
import * as portfolioService from '../services/portfolioService.js';

/**
 * GET /api/portfolio/items – list portfolio items for the authenticated user
 */
export async function getItems(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const items = await portfolioService.getItemsByUserId(userId);
    res.json({ success: true, items });
  } catch (err: unknown) {
    console.error('Portfolio getItems error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load portfolio items',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/portfolio/items – add item to portfolio
 * Body: { item_type: string, source_id: string, snapshot?: object }
 */
export async function addItem(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const { item_type, source_id, snapshot } = req.body;
    if (!item_type || !source_id) {
      res.status(400).json({
        success: false,
        error: 'Missing item_type or source_id',
      });
      return;
    }
    const item = await portfolioService.addItem(
      userId,
      String(item_type),
      String(source_id),
      snapshot ?? null
    );
    res.status(201).json({ success: true, item });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'ALREADY_SAVED') {
      res.status(409).json({ success: false, error: 'Item already in portfolio' });
      return;
    }
    console.error('Portfolio addItem error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to add to portfolio',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * DELETE /api/portfolio/items – remove item from portfolio
 * Body: { item_type: string, source_id: string }
 */
export async function removeItem(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const { item_type, source_id } = req.body;
    if (!item_type || !source_id) {
      res.status(400).json({
        success: false,
        error: 'Missing item_type or source_id',
      });
      return;
    }
    await portfolioService.removeItem(userId, String(item_type), String(source_id));
    res.json({ success: true });
  } catch (err: unknown) {
    console.error('Portfolio removeItem error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to remove from portfolio',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
