/**
 * Risk identification prompt — focuses on Hebrew tender patterns:
 * ערבות, קנסות, ביטוח, תנאי תשלום.
 */

import { BASE_SYSTEM_RULES } from './base.js';

export function buildRisksPrompt(text: string, documentName: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `${BASE_SYSTEM_RULES}

Identify risks for a bidder. Pay attention to Hebrew-specific patterns: ערבות (guarantees), קנסות (penalties), ביטוח (insurance), תנאי תשלום (payment terms). Return valid JSON matching this schema exactly:

{
  "risks": [
    {
      "description": "string",
      "severity": "string (one of: Low, Medium, High, Critical)",
      "category": "string (one of: Financial, Legal, Technical, Operational, Compliance, Timeline, Reputational, Other)",
      "recommendation": "string | null",
      "sourceDocument": "string",
      "pageNumber": "number | null",
      "clauseReference": "string | null",
      "sourceSnippet": "string",
      "confidence": "string (one of: High, Medium, Low)"
    }
  ]
}

If a "Bidder Business Profile" section is provided at the end of the document text, contextualize risks to the specific bidder. For example, if the tender requires a bank guarantee of 10M NIS but the bidder's financial capacity shows only 5M, flag this as a higher-severity risk. If the bidder's contractor classification or experience matches the requirements well, note lower severity where applicable.`;

  const userPrompt = `Document name: ${documentName}\n\nDocument text:\n${text}`;

  return { systemPrompt, userPrompt };
}
