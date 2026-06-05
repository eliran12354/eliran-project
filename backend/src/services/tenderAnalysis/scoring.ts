/**
 * Risk and readiness scoring.
 *
 * Ported from bido's `RiskScoringService` and `ReadinessScoringService`,
 * but with the dynamic DB-backed weight lookup replaced by hardcoded
 * defaults (the original weights table is not relevant for small tenders
 * and removing it removes a whole infra dependency).
 */

import type { CriticalPointResult, EligibilityResult, RequiredDocumentResult, RiskResult } from './extractors/schemas.js';

const SEVERITY_WEIGHTS: Record<string, number> = {
  Low: 5,
  Medium: 15,
  High: 35,
  Critical: 60,
};

const CONFIDENCE_MULTIPLIERS: Record<string, number> = {
  High: 1,
  Medium: 0.7,
  Low: 0.4,
  Unknown: 0.3,
};

const RISK_DECAY_RATE = 0.3;
const RISK_SCALE_FACTOR = 80;

const READINESS_WEIGHTS = {
  documents: 0.4,
  eligibility: 0.4,
  critical: 0.2,
};

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

/**
 * Risk score 0..100.
 * Sorts contributions by severity, then sums them with a decay so a single
 * Critical doesn't dominate when there are also many Mediums.
 */
export function computeRiskScore(risks: RiskResult['risks']): number {
  if (risks.length === 0) return 0;

  const contributions = risks
    .map((risk) => {
      const weight = SEVERITY_WEIGHTS[risk.severity] ?? 0;
      const multiplier = CONFIDENCE_MULTIPLIERS[risk.confidence ?? 'Unknown'] ?? 0.3;
      return weight * multiplier;
    })
    .sort((a, b) => b - a);

  let decayedSum = 0;
  for (let i = 0; i < contributions.length; i++) {
    decayedSum += contributions[i] / (1 + RISK_DECAY_RATE * i);
  }

  const normalized = 100 * (1 - Math.exp(-decayedSum / RISK_SCALE_FACTOR));
  return Math.min(100, Math.max(0, Math.round(normalized)));
}

/**
 * Highest risk level among risks the analyzer is at least Medium-confident
 * about. Returns null when nothing qualifies.
 */
export function computeHighestRiskLevel(risks: RiskResult['risks']): RiskLevel | null {
  const qualifying = risks.filter((r) => {
    const conf = r.confidence ?? 'Unknown';
    return conf === 'High' || conf === 'Medium';
  });
  if (qualifying.length === 0) return null;

  const order: RiskLevel[] = ['Critical', 'High', 'Medium', 'Low'];
  for (const level of order) {
    if (qualifying.some((r) => r.severity === level)) return level;
  }
  return null;
}

/**
 * Readiness score 0..100 for a "small tender" flow without a business
 * profile: required documents are all assumed Pending (so the score
 * reflects the eligibility + critical-points distribution only).
 */
export function computeReadinessScore(input: {
  requiredDocuments: RequiredDocumentResult['requiredDocuments'];
  eligibility: EligibilityResult['eligibility'];
  criticalPoints: CriticalPointResult['criticalPoints'];
}): number {
  const documentScore = computeDocumentScore(input.requiredDocuments);
  const eligibilityScore = computeEligibilityScore(input.eligibility);
  const criticalScore = computeCriticalScore(input.criticalPoints);

  const total =
    documentScore * READINESS_WEIGHTS.documents +
    eligibilityScore * READINESS_WEIGHTS.eligibility +
    criticalScore * READINESS_WEIGHTS.critical;

  return Math.round(Math.min(100, Math.max(0, total)));
}

function computeDocumentScore(docs: RequiredDocumentResult['requiredDocuments']): number {
  // Treat missing `isSubmissionBlocking` as true — most tender required documents are blocking.
  const blocking = docs.filter((d) => d.isSubmissionBlocking !== false);
  if (blocking.length === 0) return 100;
  // No business profile → assume nothing is provided yet.
  return 0;
}

function computeEligibilityScore(conditions: EligibilityResult['eligibility']): number {
  if (conditions.length === 0) return 100;
  const met = conditions.filter((c) => c.status === 'Met').length;
  return (met / conditions.length) * 100;
}

function computeCriticalScore(points: CriticalPointResult['criticalPoints']): number {
  if (points.length === 0) return 100;
  const nonHigh = points.filter((p) => p.severity !== 'High' && p.severity !== 'Critical').length;
  return (nonHigh / points.length) * 100;
}
