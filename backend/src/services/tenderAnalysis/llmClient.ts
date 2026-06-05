/**
 * Lightweight OpenAI client for tender analysis.
 *
 * - JSON-mode chat completions only (every extractor expects structured output).
 * - Retries transient network errors and 5xx responses with exponential backoff.
 * - Tracks aggregate token usage so the orchestrator can report cost-relevant
 *   metadata to the caller.
 */

import OpenAI from 'openai';

export interface LlmRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Lower temperature → more deterministic extraction. */
  temperature?: number;
  maxTokens?: number;
  /** Override the default model for this call. */
  model?: string;
  /** Free-form tag used in logs to identify the calling extractor. */
  stage?: string;
}

export interface LlmResponse {
  content: string;
  parsedJson: unknown;
  model: string;
  finishReason: string;
  tokensUsed: { prompt: number; completion: number; total: number };
  durationMs: number;
}

/* Default mirrors the heavy-extraction stages in bido-tender-analyzer-ms. The
 * per-stage registry in `models.ts` is the primary source of truth — this
 * fallback applies only to ad-hoc calls that don't go through an extractor. */
const DEFAULT_MODEL = process.env.TENDER_ANALYSIS_MODEL || 'gpt-5.4';
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_TOKENS = 8_192;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY חסר ב-backend/.env — נדרש כדי להפעיל את ניתוח המכרזים',
    );
  }

  cachedClient = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  return cachedClient;
}

export async function completeJson(req: LlmRequest): Promise<LlmResponse> {
  const client = getClient();
  const model = req.model || DEFAULT_MODEL;
  const temperature = req.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = req.maxTokens ?? DEFAULT_MAX_TOKENS;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now();
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
        temperature,
        max_completion_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });

      const choice = response.choices[0];
      const content = choice?.message?.content ?? '';
      const finishReason = choice?.finish_reason ?? 'unknown';

      let parsedJson: unknown;
      try {
        parsedJson = content ? JSON.parse(content) : {};
      } catch {
        parsedJson = undefined;
      }

      return {
        content,
        parsedJson,
        model: response.model,
        finishReason,
        tokensUsed: {
          prompt: response.usage?.prompt_tokens ?? 0,
          completion: response.usage?.completion_tokens ?? 0,
          total: response.usage?.total_tokens ?? 0,
        },
        durationMs: Date.now() - start,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES && isRetryable(lastError)) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('LLM request failed');
}

function isRetryable(err: Error): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN') return true;

  const status = (err as { status?: number }).status;
  if (typeof status === 'number' && status >= 500 && status < 600) return true;
  if (status === 429) return true; // rate limit

  const msg = err.message?.toLowerCase() ?? '';
  return msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('rate limit');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
