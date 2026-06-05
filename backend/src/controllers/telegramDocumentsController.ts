import type { Request, Response } from 'express';
import * as service from '../services/telegramDocumentsService.js';
import type { TelegramFilters } from '../services/telegramDocumentsService.js';
import { parseIntParam } from '../lib/pagination.js';

function numParam(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
function strParam(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function parseFilters(q: Request['query']): TelegramFilters {
  return {
    document_type: strParam(q.document_type),
    location_city: strParam(q.location_city),
    property_type: strParam(q.property_type),
    processing_status: strParam(q.processing_status),
    min_total_area: numParam(q.min_total_area),
    max_total_area: numParam(q.max_total_area),
    min_deposit: numParam(q.min_deposit),
    max_deposit: numParam(q.max_deposit),
  };
}

export async function getAllTelegramDocuments(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await service.getAllTelegramDocuments();
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getAllTelegramDocuments error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת מסמכים' });
  }
}

export async function searchTelegramDocuments(req: Request, res: Response): Promise<void> {
  try {
    const q = String(req.query.q ?? '');
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 50);
    const sortBy = String(req.query.sortBy ?? 'created_at');
    const sortOrder = String(req.query.sortOrder ?? 'desc');
    const { rows, total } = await service.searchTelegramDocuments(q, page, limit, sortBy, sortOrder);
    res.json({ success: true, data: { data: rows, total } });
  } catch (e) {
    console.error('searchTelegramDocuments error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בחיפוש מסמכים' });
  }
}

export async function getFilteredTelegramDocuments(req: Request, res: Response): Promise<void> {
  try {
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 50);
    const sortBy = String(req.query.sortBy ?? 'created_at');
    const sortOrder = String(req.query.sortOrder ?? 'desc');
    const { rows, total } = await service.getFilteredTelegramDocuments(
      parseFilters(req.query),
      page,
      limit,
      sortBy,
      sortOrder
    );
    res.json({ success: true, data: { data: rows, total } });
  } catch (e) {
    console.error('getFilteredTelegramDocuments error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת מסמכים' });
  }
}

export async function createTelegramDocument(req: Request, res: Response): Promise<void> {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const row = await service.createTelegramDocument(body);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error('createTelegramDocument error:', e);
    res.status(500).json({ success: false, error: 'שגיאה בהוספת מסמך' });
  }
}
