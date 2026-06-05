/**
 * Critical points prompt — flags items the bidder must not miss.
 */

import { BASE_SYSTEM_RULES } from './base.js';

export function buildCriticalPointsPrompt(text: string, documentName: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `${BASE_SYSTEM_RULES}

Identify critical points requiring attention. Return valid JSON matching this schema exactly:

{
  "criticalPoints": [
    {
      "title": "string",
      "description": "string",
      "category": "string (one of: Deadline, Financial, Legal, Technical, Compliance, Operational, Other)",
      "severity": "string (one of: Low, Medium, High, Critical)",
      "recommendation": "string | null",
      "sourceDocument": "string",
      "pageNumber": "number | null",
      "clauseReference": "string | null",
      "sourceSnippet": "string",
      "confidence": "string (one of: High, Medium, Low)"
    }
  ]
}`;

  const userPrompt = `Document name: ${documentName}\n\nDocument text:\n${text}`;

  return { systemPrompt, userPrompt };
}
