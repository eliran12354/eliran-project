/**
 * Tender Analysis Controller
 *
 * Single endpoint that accepts either:
 *   - `{ url: string }` — backend downloads + analyzes
 *   - `{ fileBase64: string, fileName: string, mimeType?: string }` — caller
 *     passes a base64-encoded document body (data URL prefix is stripped if
 *     present)
 *
 * Returns the full `TenderAnalysisResult` from the orchestrator. Each analysis
 * is also recorded in `tender_analyses` (best-effort) so the admin dashboard
 * can report aggregate usage such as total token spend.
 */

import { Request, Response } from 'express';
import {
  ScannedPdfError,
  analyzeTenderFromBuffer,
  analyzeTenderFromUrl,
  saveTenderAnalysis,
  type TenderAnalysisResult,
} from '../services/tenderAnalysis/index.js';

const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB after decoding base64
const DATA_URL_PREFIX = /^data:[^;]+;base64,/i;

interface AnalyzeRequestBody {
  url?: string;
  fileBase64?: string;
  fileName?: string;
  mimeType?: string;
}

/**
 * Records the analysis for admin reporting. Never throws — a failed audit
 * insert must not break the user-facing response.
 */
async function recordAnalysis(result: TenderAnalysisResult, userId: string | null): Promise<void> {
  try {
    await saveTenderAnalysis(result, userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('⚠️ saveTenderAnalysis failed:', message);
  }
}

export async function analyzeTenderController(req: Request, res: Response) {
  const body = (req.body ?? {}) as AnalyzeRequestBody;
  const userId = req.user?.sub ?? null;

  try {
    if (body.url && typeof body.url === 'string') {
      const result = await analyzeTenderFromUrl(body.url.trim());
      await recordAnalysis(result, userId);
      return res.json({ success: true, result });
    }

    if (body.fileBase64 && typeof body.fileBase64 === 'string') {
      if (!body.fileName || typeof body.fileName !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'fileName נדרש כאשר שולחים fileBase64',
        });
      }

      const cleanBase64 = body.fileBase64.replace(DATA_URL_PREFIX, '');
      let buffer: Buffer;
      try {
        buffer = Buffer.from(cleanBase64, 'base64');
      } catch {
        return res.status(400).json({ success: false, error: 'fileBase64 אינו base64 תקין' });
      }

      if (buffer.length === 0) {
        return res.status(400).json({ success: false, error: 'הקובץ ריק' });
      }
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(413).json({
          success: false,
          error: `הקובץ גדול מדי (${(buffer.length / 1024 / 1024).toFixed(1)}MB). מקסימום ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
        });
      }

      const result = await analyzeTenderFromBuffer({
        buffer,
        mimeType: body.mimeType || 'application/octet-stream',
        fileName: body.fileName,
      });
      await recordAnalysis(result, userId);
      return res.json({ success: true, result });
    }

    return res.status(400).json({
      success: false,
      error: 'יש לספק url או fileBase64+fileName',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ analyzeTenderController error:', message);

    if (err instanceof ScannedPdfError) {
      return res.status(422).json({
        success: false,
        error: message,
        code: 'SCANNED_PDF',
      });
    }

    if (message.includes('OPENAI_API_KEY')) {
      return res.status(503).json({
        success: false,
        error: 'שירות הניתוח אינו מוגדר (חסר מפתח OpenAI). פנה למנהל המערכת.',
      });
    }

    if (message.includes('timed out') || message.includes('timeout')) {
      return res.status(504).json({ success: false, error: message });
    }

    return res.status(500).json({
      success: false,
      error: 'ניתוח המכרז נכשל',
      details: message,
    });
  }
}
