/**
 * Tender analysis orchestrator (synchronous, single-process).
 *
 * Public API:
 *   - `analyzeTenderFromBuffer({ buffer, mimeType, fileName })`
 *   - `analyzeTenderFromUrl(url)`
 *
 * Pipeline:
 *   1. (URL only) download file
 *   2. extract text (PDF/DOCX/XLSX — no OCR)
 *   3. run 6 structured extractors in parallel (Promise.allSettled)
 *   4. build a consolidated payload + run the summary extractor
 *   5. compute risk + readiness scores
 *   6. assemble a single TenderAnalysisResult and return it
 *
 * The orchestrator never throws on partial extractor failure — it records
 * which stages succeeded in `stageResults` and downgrades `overallConfidence`
 * accordingly. This matches the bido orchestrator's "partial completion"
 * semantics so the UI can still show whatever extractors returned.
 */

import {
  STAGE,
  type StageName,
  extractCriticalPoints,
  extractEligibility,
  extractGeneralDetails,
  extractPenalties,
  extractRequiredDocuments,
  extractRisks,
  extractSummary,
} from './extractors/index.js';
import type {
  CriticalPointResult,
  EligibilityResult,
  GeneralDetails,
  PenaltyResult,
  RequiredDocumentResult,
  RiskResult,
  Summary,
} from './extractors/schemas.js';
import { downloadTenderFile } from './ingestion/fileDownloader.js';
import { extractText, type ExtractedDocument } from './ingestion/textExtractor.js';
import { ScannedPdfError } from './ingestion/pdfExtractor.js';
import {
  computeHighestRiskLevel,
  computeReadinessScore,
  computeRiskScore,
  type RiskLevel,
} from './scoring.js';

export type AnalysisStatus = 'completed' | 'partially_completed' | 'failed';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface StageOutcome {
  succeeded: boolean;
  durationMs: number;
  error?: string;
}

export interface TenderAnalysisResult {
  status: AnalysisStatus;
  overallConfidence: ConfidenceLevel;
  source: { fileName: string; mimeType: string; pageCount: number; sizeBytes: number };
  generalDetails: GeneralDetails;
  eligibility: EligibilityResult['eligibility'];
  risks: RiskResult['risks'];
  penalties: PenaltyResult['penalties'];
  criticalPoints: CriticalPointResult['criticalPoints'];
  requiredDocuments: RequiredDocumentResult['requiredDocuments'];
  summary: Summary;
  scores: { riskScore: number; readinessScore: number; highestRiskLevel: RiskLevel | null };
  stageResults: Record<StageName, StageOutcome>;
  totalTokensUsed: number;
  processingDurationMs: number;
  model: string;
  generatedAt: string;
}

export interface AnalyzeFromBufferInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export async function analyzeTenderFromUrl(url: string): Promise<TenderAnalysisResult> {
  const downloaded = await downloadTenderFile(url);
  return runAnalysis({
    buffer: downloaded.buffer,
    mimeType: downloaded.mimeType,
    fileName: downloaded.fileName,
    sizeBytes: downloaded.sizeBytes,
  });
}

export async function analyzeTenderFromBuffer(input: AnalyzeFromBufferInput): Promise<TenderAnalysisResult> {
  return runAnalysis({
    buffer: input.buffer,
    mimeType: input.mimeType,
    fileName: input.fileName,
    sizeBytes: input.buffer.length,
  });
}

/* ───────────────────────────── internals ───────────────────────────── */

interface RunAnalysisInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
}

const EMPTY_GENERAL_DETAILS: GeneralDetails = {};
const EMPTY_SUMMARY: Summary = { briefSummary: '', extendedSummary: '', recommendations: '' };

async function runAnalysis(input: RunAnalysisInput): Promise<TenderAnalysisResult> {
  const startedAt = Date.now();

  let extracted: ExtractedDocument;
  try {
    extracted = await extractText(input.buffer, input.mimeType, input.fileName);
  } catch (err) {
    if (err instanceof ScannedPdfError) {
      throw err; // surfaced unchanged so the controller can return a 422 + clear message
    }
    throw new Error(`חילוץ הטקסט מהמסמך נכשל: ${(err as Error).message}`);
  }

  if (!extracted.text.trim()) {
    throw new Error('המסמך לא הניב טקסט הניתן לניתוח. ייתכן שהוא ריק או סרוק.');
  }

  const documentName = input.fileName;
  const text = extracted.text;

  // Structured extractors run in parallel. We accept partial failure.
  const stageResults = createEmptyStageResults();
  let totalTokens = 0;

  const recordSettled = async <T>(
    stage: StageName,
    promise: Promise<{ data: T; tokensUsed: number; durationMs: number }>,
    fallback: T,
  ): Promise<T> => {
    const start = Date.now();
    try {
      const out = await promise;
      stageResults[stage] = { succeeded: true, durationMs: out.durationMs };
      totalTokens += out.tokensUsed;
      return out.data;
    } catch (err) {
      stageResults[stage] = {
        succeeded: false,
        durationMs: Date.now() - start,
        error: (err as Error).message,
      };
      return fallback;
    }
  };

  const [generalDetails, eligibility, risks, penalties, criticalPoints, requiredDocuments] = await Promise.all([
    recordSettled(STAGE.GeneralDetails, extractGeneralDetails(text, documentName), EMPTY_GENERAL_DETAILS),
    recordSettled(STAGE.Eligibility, extractEligibility(text, documentName), { eligibility: [] }),
    recordSettled(STAGE.Risks, extractRisks(text, documentName), { risks: [] }),
    recordSettled(STAGE.Penalties, extractPenalties(text, documentName), { penalties: [] }),
    recordSettled(STAGE.CriticalPoints, extractCriticalPoints(text, documentName), { criticalPoints: [] }),
    recordSettled(
      STAGE.RequiredDocuments,
      extractRequiredDocuments(text, documentName),
      { requiredDocuments: [] },
    ),
  ]);

  const consolidated = {
    generalDetails,
    eligibility,
    risks,
    penalties,
    criticalPoints,
    requiredDocuments,
  };
  const summary = await recordSettled(STAGE.Summary, extractSummary(consolidated, text), EMPTY_SUMMARY);

  // Compute scores from whatever we got back.
  const riskScore = computeRiskScore(risks.risks);
  const highestRiskLevel = computeHighestRiskLevel(risks.risks);
  const readinessScore = computeReadinessScore({
    requiredDocuments: requiredDocuments.requiredDocuments,
    eligibility: eligibility.eligibility,
    criticalPoints: criticalPoints.criticalPoints,
  });

  const status = determineStatus(stageResults);
  const overallConfidence = determineConfidence(stageResults);

  return {
    status,
    overallConfidence,
    source: {
      fileName: input.fileName,
      mimeType: extracted.mimeType,
      pageCount: extracted.pageCount,
      sizeBytes: input.sizeBytes,
    },
    generalDetails,
    eligibility: eligibility.eligibility,
    risks: risks.risks,
    penalties: penalties.penalties,
    criticalPoints: criticalPoints.criticalPoints,
    requiredDocuments: requiredDocuments.requiredDocuments,
    summary,
    scores: { riskScore, readinessScore, highestRiskLevel },
    stageResults,
    totalTokensUsed: totalTokens,
    processingDurationMs: Date.now() - startedAt,
    model: process.env.TENDER_ANALYSIS_MODEL || 'gpt-4o-mini',
    generatedAt: new Date().toISOString(),
  };
}

function createEmptyStageResults(): Record<StageName, StageOutcome> {
  return {
    [STAGE.GeneralDetails]: { succeeded: false, durationMs: 0 },
    [STAGE.Eligibility]: { succeeded: false, durationMs: 0 },
    [STAGE.Risks]: { succeeded: false, durationMs: 0 },
    [STAGE.Penalties]: { succeeded: false, durationMs: 0 },
    [STAGE.CriticalPoints]: { succeeded: false, durationMs: 0 },
    [STAGE.RequiredDocuments]: { succeeded: false, durationMs: 0 },
    [STAGE.Summary]: { succeeded: false, durationMs: 0 },
  };
}

function determineStatus(stageResults: Record<StageName, StageOutcome>): AnalysisStatus {
  const outcomes = Object.values(stageResults);
  const succeeded = outcomes.filter((o) => o.succeeded).length;
  if (succeeded === 0) return 'failed';
  if (succeeded < outcomes.length) return 'partially_completed';
  return 'completed';
}

function determineConfidence(stageResults: Record<StageName, StageOutcome>): ConfidenceLevel {
  const failed = Object.values(stageResults).filter((o) => !o.succeeded).length;
  if (failed === 0) return 'High';
  if (failed <= 2) return 'Medium';
  return 'Low';
}
