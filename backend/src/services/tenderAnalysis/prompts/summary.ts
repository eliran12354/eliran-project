/**
 * Summary prompt — runs after all extractors and produces the user-facing
 * Hebrew summary + recommendations from the consolidated structured output.
 */

import { BASE_SYSTEM_RULES } from './base.js';

const MAX_SOURCE_TEXT_CHARS = 5000;

export function buildSummaryPrompt(
  consolidatedResults: Record<string, unknown>,
  tenderText: string,
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `${BASE_SYSTEM_RULES}

Generate summaries in Hebrew. Return valid JSON matching this schema exactly:

{
  "briefSummary": "string (max 3 lines, Hebrew)",
  "extendedSummary": "string (comprehensive, Hebrew)",
  "recommendations": "string (actionable, Hebrew)"
}

If a "bidderProfile" field is present in the consolidated results, tailor the recommendations to the specific bidder. Mention which eligibility conditions they meet or don't meet, highlight risks specific to their financial capacity or experience level, and suggest concrete actions they should take before submitting.`;

  const truncatedText =
    tenderText.length > MAX_SOURCE_TEXT_CHARS
      ? tenderText.substring(0, MAX_SOURCE_TEXT_CHARS)
      : tenderText;

  const userPrompt = `Consolidated extraction results:\n${JSON.stringify(
    consolidatedResults,
  )}\n\nTender text (first ${MAX_SOURCE_TEXT_CHARS} chars):\n${truncatedText}`;

  return { systemPrompt, userPrompt };
}
