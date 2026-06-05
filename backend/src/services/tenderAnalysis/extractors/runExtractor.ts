/**
 * Shared extractor helper.
 *
 * Each tender extraction stage is a tuple of (prompt builder, zod schema).
 * This module wraps both into a single `runExtractor` call that:
 *   1. Runs the LLM in JSON mode.
 *   2. Validates the response against the schema.
 *   3. On validation failure, asks the LLM to repair its output once more
 *      and re-validates.
 *   4. Throws a structured error if both attempts fail.
 *
 * Keeping this in one place removes the ~80-line repair loop that the bido
 * extractor classes duplicated.
 */

import type { ZodSchema } from 'zod';
import { completeJson, type LlmRequest } from '../llmClient.js';

export interface ExtractorParams<T> {
  stage: string;
  prompt: { systemPrompt: string; userPrompt: string };
  schema: ZodSchema<T>;
  /** Optional per-stage overrides. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ExtractorOutcome<T> {
  data: T;
  tokensUsed: number;
  durationMs: number;
}

export async function runExtractor<T>(params: ExtractorParams<T>): Promise<ExtractorOutcome<T>> {
  const baseRequest: LlmRequest = {
    systemPrompt: params.prompt.systemPrompt,
    userPrompt: params.prompt.userPrompt,
    stage: params.stage,
    model: params.model,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
  };

  const first = await completeJson(baseRequest);

  if (first.finishReason === 'length') {
    throw new Error(
      `שלב ${params.stage}: התשובה נחתכה בגלל מגבלת טוקנים (${first.tokensUsed.completion}). נסה לחתוך את המסמך.`,
    );
  }

  const firstParse = params.schema.safeParse(first.parsedJson ?? safeJsonParse(first.content));
  if (firstParse.success) {
    return {
      data: firstParse.data,
      tokensUsed: first.tokensUsed.total,
      durationMs: first.durationMs,
    };
  }

  const errors = formatZodErrors(firstParse.error);
  const repair = await completeJson({
    ...baseRequest,
    userPrompt: `Your previous response had validation errors:\n${errors}\n\nOriginal request:\n${baseRequest.userPrompt}\n\nPlease fix and return valid JSON.`,
  });

  const repairParse = params.schema.safeParse(repair.parsedJson ?? safeJsonParse(repair.content));
  if (repairParse.success) {
    return {
      data: repairParse.data,
      tokensUsed: first.tokensUsed.total + repair.tokensUsed.total,
      durationMs: first.durationMs + repair.durationMs,
    };
  }

  throw new Error(
    `שלב ${params.stage}: וולידציה נכשלה גם אחרי תיקון. שגיאות: ${formatZodErrors(repairParse.error)}`,
  );
}

function safeJsonParse(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

function formatZodErrors(error: { issues: Array<{ path: (string | number)[]; message: string }> }): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join('; ');
}
