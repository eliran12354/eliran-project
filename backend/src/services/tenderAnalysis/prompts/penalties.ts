/**
 * Penalty clauses (סעיפי קנסות) extraction prompt.
 */

import { BASE_SYSTEM_RULES } from './base.js';

export function buildPenaltiesPrompt(text: string, documentName: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `${BASE_SYSTEM_RULES}

Extract penalty clauses (סעיפי קנסות). Return valid JSON matching this schema exactly:

{
  "penalties": [
    {
      "description": "string",
      "severity": "string | null (one of: Low, Medium, High, Critical)",
      "amount": "string | null",
      "triggerCondition": "string | null",
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
