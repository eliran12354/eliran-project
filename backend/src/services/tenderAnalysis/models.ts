/**
 * Stage registry — defines the canonical stage names, plus which OpenAI model
 * and sampling defaults each extractor stage uses. Mirrors the per-stage
 * configuration in bido-tender-analyzer-ms
 * (src/modules/llm/prompt-registry.service.ts).
 *
 * Override priority (highest first):
 *   1. Per-stage env var, e.g. `TENDER_ANALYSIS_MODEL_RISKS`
 *   2. Global env var: `TENDER_ANALYSIS_MODEL`
 *   3. The stage default declared below
 */

/** Stage names used by the orchestrator for stageResults reporting + UI. */
export const STAGE = {
  GeneralDetails: 'general_details',
  Eligibility: 'eligibility',
  Risks: 'risks',
  Penalties: 'penalties',
  CriticalPoints: 'critical_points',
  RequiredDocuments: 'required_documents',
  Summary: 'summary',
} as const;

export type StageName = (typeof STAGE)[keyof typeof STAGE];

interface StageModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

/* Defaults match bido's heavy-extraction stages: gpt-5.4 with low temperature
 * for deterministic, schema-friendly extraction. Summary uses a slightly higher
 * temperature to allow more natural Hebrew prose, again mirroring bido. */
const STAGE_DEFAULTS: Record<StageName, StageModelConfig> = {
  [STAGE.GeneralDetails]: { model: 'gpt-5.4', temperature: 0.1, maxTokens: 4096 },
  [STAGE.Eligibility]: { model: 'gpt-5.4', temperature: 0.1, maxTokens: 8192 },
  [STAGE.Risks]: { model: 'gpt-5.4', temperature: 0.1, maxTokens: 8192 },
  [STAGE.Penalties]: { model: 'gpt-5.4', temperature: 0.1, maxTokens: 8192 },
  [STAGE.CriticalPoints]: { model: 'gpt-5.4', temperature: 0.1, maxTokens: 8192 },
  [STAGE.RequiredDocuments]: { model: 'gpt-5.4', temperature: 0.1, maxTokens: 4096 },
  [STAGE.Summary]: { model: 'gpt-5.4', temperature: 0.3, maxTokens: 4096 },
};

/** Convert a stage name (snake_case) → env var suffix (UPPER_SNAKE_CASE). */
function stageToEnvKey(stage: StageName): string {
  return stage.toUpperCase();
}

export function getStageModel(stage: StageName): string {
  const perStage = process.env[`TENDER_ANALYSIS_MODEL_${stageToEnvKey(stage)}`];
  if (perStage && perStage.trim()) return perStage.trim();

  const global = process.env.TENDER_ANALYSIS_MODEL;
  if (global && global.trim()) return global.trim();

  return STAGE_DEFAULTS[stage].model;
}

export function getStageDefaults(stage: StageName): StageModelConfig {
  return {
    model: getStageModel(stage),
    temperature: STAGE_DEFAULTS[stage].temperature,
    maxTokens: STAGE_DEFAULTS[stage].maxTokens,
  };
}
