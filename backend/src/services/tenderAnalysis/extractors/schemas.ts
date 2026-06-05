/**
 * Zod schemas for every extractor stage.
 * Mirrors the bido extractor schemas so callers get the same JSON shape.
 */

import { z } from 'zod';
import { ENUM } from '../prompts/base.js';

const SeverityEnum = z.enum(ENUM.severity);
const ConfidenceEnum = z.enum(ENUM.confidence);
const RiskCategoryEnum = z.enum(ENUM.riskCategory);
const ConditionTypeEnum = z.enum(ENUM.conditionType);
const EligibilityStatusEnum = z.enum(ENUM.eligibilityStatus);
const CriticalCategoryEnum = z.enum(ENUM.criticalCategory);
const PricingMethodEnum = z.enum(ENUM.pricingMethod);

/* ── General details ─────────────────────────────────────────── */

export const GeneralDetailsSchema = z.object({
  issuingBody: z.string().nullable().optional(),
  tenderNumber: z.string().nullable().optional(),
  publishDate: z.string().nullable().optional(),
  submissionDeadline: z.string().nullable().optional(),
  submissionLocation: z.string().nullable().optional(),
  estimatedBudget: z.string().nullable().optional(),
  contractDuration: z.string().nullable().optional(),
  pricingMethod: PricingMethodEnum.nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  prebidMeetingDate: z.string().nullable().optional(),
  prebidMeetingRequired: z.boolean().nullable().optional(),
  guaranteeRequired: z.boolean().nullable().optional(),
  guaranteeAmount: z.string().nullable().optional(),
  scope: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});
export type GeneralDetails = z.infer<typeof GeneralDetailsSchema>;

/* ── Eligibility ─────────────────────────────────────────────── */

export const EligibilityConditionSchema = z.object({
  description: z.string(),
  conditionType: ConditionTypeEnum.optional(),
  status: EligibilityStatusEnum.optional(),
  reasoning: z.string().optional(),
  profileGapGuidance: z.string().nullable().optional(),
  sourceDocument: z.string().optional(),
  pageNumber: z.coerce.number().optional(),
  clauseReference: z.string().optional(),
  sourceSnippet: z.string().optional(),
  confidence: ConfidenceEnum.optional(),
});
export const EligibilityResultSchema = z.object({
  eligibility: z.array(EligibilityConditionSchema),
});
export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;

/* ── Risks ───────────────────────────────────────────────────── */

export const RiskSchema = z.object({
  description: z.string(),
  severity: SeverityEnum,
  category: RiskCategoryEnum,
  recommendation: z.string().nullable().optional(),
  sourceDocument: z.string().optional(),
  pageNumber: z.coerce.number().optional(),
  clauseReference: z.string().optional(),
  sourceSnippet: z.string().optional(),
  confidence: ConfidenceEnum.optional(),
});
export const RiskResultSchema = z.object({ risks: z.array(RiskSchema) });
export type RiskResult = z.infer<typeof RiskResultSchema>;

/* ── Penalties ───────────────────────────────────────────────── */

export const PenaltySchema = z.object({
  description: z.string(),
  severity: SeverityEnum.optional(),
  amount: z.string().nullable().optional(),
  triggerCondition: z.string().nullable().optional(),
  sourceDocument: z.string().optional(),
  pageNumber: z.coerce.number().optional(),
  clauseReference: z.string().optional(),
  sourceSnippet: z.string().optional(),
  confidence: ConfidenceEnum.optional(),
});
export const PenaltyResultSchema = z.object({ penalties: z.array(PenaltySchema) });
export type PenaltyResult = z.infer<typeof PenaltyResultSchema>;

/* ── Critical points ─────────────────────────────────────────── */

export const CriticalPointSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: CriticalCategoryEnum,
  severity: SeverityEnum,
  recommendation: z.string().nullable().optional(),
  sourceDocument: z.string().optional(),
  pageNumber: z.coerce.number().optional(),
  clauseReference: z.string().optional(),
  sourceSnippet: z.string().optional(),
  confidence: ConfidenceEnum.optional(),
});
export const CriticalPointResultSchema = z.object({
  criticalPoints: z.array(CriticalPointSchema),
});
export type CriticalPointResult = z.infer<typeof CriticalPointResultSchema>;

/* ── Required documents ──────────────────────────────────────── */

export const RequiredDocumentSchema = z.object({
  documentName: z.string(),
  description: z.string().nullable().optional(),
  /** Optional in the LLM response; the orchestrator treats `undefined` as `true`. */
  isSubmissionBlocking: z.boolean().optional(),
  sourceDocument: z.string().optional(),
  pageNumber: z.coerce.number().optional(),
  clauseReference: z.string().nullable().optional(),
});
export const RequiredDocumentResultSchema = z.object({
  requiredDocuments: z.array(RequiredDocumentSchema),
});
export type RequiredDocumentResult = z.infer<typeof RequiredDocumentResultSchema>;

/* ── Summary ─────────────────────────────────────────────────── */

export const SummarySchema = z.object({
  briefSummary: z.string(),
  extendedSummary: z.string(),
  recommendations: z.string(),
});
export type Summary = z.infer<typeof SummarySchema>;
