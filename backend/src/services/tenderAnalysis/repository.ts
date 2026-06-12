/**
 * Persistence for tender analyses.
 *
 * Each completed analysis is recorded so the admin dashboard can report
 * aggregate usage (total token spend, number of analyses, etc.). Writes are
 * best-effort: callers should never fail a user-facing response because the
 * audit insert failed.
 */

import { execute } from '../../config/database.js';
import type { TenderAnalysisResult } from './orchestrator.js';

export async function saveTenderAnalysis(
  result: TenderAnalysisResult,
  userId: string | null,
): Promise<void> {
  await execute(
    `INSERT INTO tender_analyses (
       user_id, file_name, mime_type, page_count, size_bytes, model,
       status, overall_confidence, risk_score, readiness_score,
       total_tokens_used, processing_duration_ms, result
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      userId,
      result.source.fileName,
      result.source.mimeType,
      result.source.pageCount,
      result.source.sizeBytes,
      result.model,
      result.status,
      result.overallConfidence,
      result.scores.riskScore,
      result.scores.readinessScore,
      result.totalTokensUsed,
      result.processingDurationMs,
      JSON.stringify(result),
    ],
  );
}
