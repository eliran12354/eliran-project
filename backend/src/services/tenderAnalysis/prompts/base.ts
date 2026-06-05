/**
 * Shared system rules for every tender extraction prompt.
 * These rules — verbatim from the bido prompt library — keep extracted
 * Hebrew text faithful and force enum values to remain in English.
 */

export const BASE_SYSTEM_RULES = `You are an expert Israeli tender analyst. You analyze Hebrew tender documents.

Rules:
- Extract information ONLY from the provided text. Never invent or assume.
- If information is not found, use null or omit the field.
- Always include evidence: source document name, page number, clause reference, and a brief Hebrew snippet.
- Distinguish between mandatory requirements (חובה) and recommendations (המלצה).
- Distinguish between threshold/eligibility conditions (תנאי סף) and operational requirements.
- Return valid JSON matching the provided schema exactly.
- All extracted text should preserve the original Hebrew.
- Severity, confidence, and category values must be in English and match the allowed enum values exactly. Never translate enum values to Hebrew.`;

/** Allowed enum values — kept in one place so prompts and zod schemas stay aligned. */
export const ENUM = {
  severity: ['Low', 'Medium', 'High', 'Critical'] as const,
  confidence: ['High', 'Medium', 'Low'] as const,
  riskCategory: [
    'Financial',
    'Legal',
    'Technical',
    'Operational',
    'Compliance',
    'Timeline',
    'Reputational',
    'Other',
  ] as const,
  conditionType: [
    'Threshold',
    'Certification',
    'Financial',
    'Experience',
    'Operational',
    'Legal',
    'Other',
  ] as const,
  eligibilityStatus: ['Met', 'NotMet', 'NeedsReview'] as const,
  criticalCategory: [
    'Deadline',
    'Financial',
    'Legal',
    'Technical',
    'Compliance',
    'Operational',
    'Other',
  ] as const,
  pricingMethod: [
    'FixedPrice',
    'CostPlus',
    'UnitPrice',
    'TimeAndMaterial',
    'PerformanceBased',
    'NotSpecified',
    'Other',
  ] as const,
};
