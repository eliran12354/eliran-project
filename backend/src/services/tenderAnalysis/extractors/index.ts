/**
 * Public extractor functions — one per analysis stage.
 *
 * Each function is a thin wrapper that pairs a prompt builder with its zod
 * schema and delegates to `runExtractor`. The orchestrator calls them in
 * parallel via `Promise.allSettled`.
 */

import { runExtractor } from './runExtractor.js';
import {
  EligibilityResultSchema,
  type EligibilityResult,
  CriticalPointResultSchema,
  type CriticalPointResult,
  GeneralDetailsSchema,
  type GeneralDetails,
  PenaltyResultSchema,
  type PenaltyResult,
  RequiredDocumentResultSchema,
  type RequiredDocumentResult,
  RiskResultSchema,
  type RiskResult,
  SummarySchema,
  type Summary,
} from './schemas.js';
import { buildEligibilityPrompt } from '../prompts/eligibility.js';
import { buildCriticalPointsPrompt } from '../prompts/criticalPoints.js';
import { buildGeneralDetailsPrompt } from '../prompts/generalDetails.js';
import { buildPenaltiesPrompt } from '../prompts/penalties.js';
import { buildRequiredDocumentsPrompt } from '../prompts/requiredDocuments.js';
import { buildRisksPrompt } from '../prompts/risks.js';
import { buildSummaryPrompt } from '../prompts/summary.js';
import { getStageDefaults, STAGE, type StageName } from '../models.js';

export { STAGE };
export type { StageName };

/* ── Per-stage public extractors ─────────────────────────────── */

export function extractGeneralDetails(text: string, documentName: string) {
  const defaults = getStageDefaults(STAGE.GeneralDetails);
  return runExtractor<GeneralDetails>({
    stage: STAGE.GeneralDetails,
    prompt: buildGeneralDetailsPrompt(text, documentName),
    schema: GeneralDetailsSchema,
    model: defaults.model,
    temperature: defaults.temperature,
    maxTokens: defaults.maxTokens,
  });
}

export function extractEligibility(text: string, documentName: string) {
  const defaults = getStageDefaults(STAGE.Eligibility);
  return runExtractor<EligibilityResult>({
    stage: STAGE.Eligibility,
    prompt: buildEligibilityPrompt(text, documentName),
    schema: EligibilityResultSchema,
    model: defaults.model,
    temperature: defaults.temperature,
    maxTokens: defaults.maxTokens,
  });
}

export function extractRisks(text: string, documentName: string) {
  const defaults = getStageDefaults(STAGE.Risks);
  return runExtractor<RiskResult>({
    stage: STAGE.Risks,
    prompt: buildRisksPrompt(text, documentName),
    schema: RiskResultSchema,
    model: defaults.model,
    temperature: defaults.temperature,
    maxTokens: defaults.maxTokens,
  });
}

export function extractPenalties(text: string, documentName: string) {
  const defaults = getStageDefaults(STAGE.Penalties);
  return runExtractor<PenaltyResult>({
    stage: STAGE.Penalties,
    prompt: buildPenaltiesPrompt(text, documentName),
    schema: PenaltyResultSchema,
    model: defaults.model,
    temperature: defaults.temperature,
    maxTokens: defaults.maxTokens,
  });
}

export function extractCriticalPoints(text: string, documentName: string) {
  const defaults = getStageDefaults(STAGE.CriticalPoints);
  return runExtractor<CriticalPointResult>({
    stage: STAGE.CriticalPoints,
    prompt: buildCriticalPointsPrompt(text, documentName),
    schema: CriticalPointResultSchema,
    model: defaults.model,
    temperature: defaults.temperature,
    maxTokens: defaults.maxTokens,
  });
}

export function extractRequiredDocuments(text: string, documentName: string) {
  const defaults = getStageDefaults(STAGE.RequiredDocuments);
  return runExtractor<RequiredDocumentResult>({
    stage: STAGE.RequiredDocuments,
    prompt: buildRequiredDocumentsPrompt(text, documentName),
    schema: RequiredDocumentResultSchema,
    model: defaults.model,
    temperature: defaults.temperature,
    maxTokens: defaults.maxTokens,
  });
}

export function extractSummary(consolidated: Record<string, unknown>, tenderText: string) {
  const defaults = getStageDefaults(STAGE.Summary);
  return runExtractor<Summary>({
    stage: STAGE.Summary,
    prompt: buildSummaryPrompt(consolidated, tenderText),
    schema: SummarySchema,
    model: defaults.model,
    temperature: defaults.temperature,
    maxTokens: defaults.maxTokens,
  });
}
