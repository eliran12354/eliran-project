import type { Request, Response } from 'express';
import * as dealsService from '../services/dealsService.js';
import type { DealFilters } from '../services/dealsService.js';
import { parseIntParam } from '../lib/pagination.js';

function numParam(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function strParam(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function parseFilters(q: Request['query']): DealFilters {
  return {
    city_name: strParam(q.city_name),
    property_type: strParam(q.property_type),
    min_price: numParam(q.min_price),
    max_price: numParam(q.max_price),
    min_area: numParam(q.min_area),
    max_area: numParam(q.max_area),
    min_rooms: numParam(q.min_rooms),
    max_rooms: numParam(q.max_rooms),
    date_from: strParam(q.date_from),
    date_to: strParam(q.date_to),
  };
}

export async function getAllDeals(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await dealsService.getAllDeals();
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getAllDeals error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת עסקאות' });
  }
}

export async function getFilteredDeals(req: Request, res: Response): Promise<void> {
  try {
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 150);
    const sortBy = String(req.query.sortBy ?? 'deal_date');
    const sortOrder = String(req.query.sortOrder ?? 'desc');
    const { rows, total } = await dealsService.getFilteredDeals(
      parseFilters(req.query),
      page,
      limit,
      sortBy,
      sortOrder
    );
    res.json({ success: true, data: { data: rows, total } });
  } catch (e) {
    console.error('getFilteredDeals error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת עסקאות' });
  }
}

export async function searchDeals(req: Request, res: Response): Promise<void> {
  try {
    const q = String(req.query.q ?? '');
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 150);
    const sortBy = String(req.query.sortBy ?? 'deal_date');
    const sortOrder = String(req.query.sortOrder ?? 'desc');
    const { rows, total } = await dealsService.searchDeals(q, page, limit, sortBy, sortOrder);
    res.json({ success: true, data: { data: rows, total } });
  } catch (e) {
    console.error('searchDeals error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בחיפוש עסקאות' });
  }
}
