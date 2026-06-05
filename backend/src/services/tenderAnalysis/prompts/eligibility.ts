/**
 * Eligibility (תנאי סף) prompt — without business profile context (small
 * tender flow), all conditions default to NeedsReview with guidance.
 */

import { BASE_SYSTEM_RULES } from './base.js';

export function buildEligibilityPrompt(text: string, documentName: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `${BASE_SYSTEM_RULES}

Extract eligibility conditions (תנאי סף). Return valid JSON matching this schema exactly:

{
  "eligibility": [
    {
      "description": "string — the eligibility condition as stated in the tender, in Hebrew",
      "conditionType": "string (one of: Threshold, Certification, Financial, Experience, Operational, Legal, Other)",
      "status": "string (one of: Met, NotMet, NeedsReview)",
      "reasoning": "string — concise Hebrew explanation of WHY this condition is met, not met, or needs review",
      "profileGapGuidance": "string | null — for status=NeedsReview only: describe what specific profile data the bidder should provide to enable evaluation",
      "sourceDocument": "string",
      "pageNumber": "number | null",
      "clauseReference": "string | null",
      "sourceSnippet": "string",
      "confidence": "string (one of: High, Medium, Low) | null"
    }
  ]
}

Evaluation rules for "status":
- "Met": the Bidder Business Profile clearly satisfies this condition. Explain the match in "reasoning".
- "NotMet": the Bidder Business Profile clearly does NOT satisfy this condition. Explain the gap in "reasoning".
- "NeedsReview": insufficient profile data to determine, OR the condition requires subjective judgment. Explain why in "reasoning", and in "profileGapGuidance" describe what specific information (e.g., a license type, financial figure, certification name) the bidder should add to their profile for automatic evaluation.

If a "Bidder Business Profile" section is provided at the end of the document text, compare every condition against the bidder's actual capabilities (experience, licenses, certifications, financial capacity, contractor classification, team qualifications). Always provide a "reasoning" field with a concise Hebrew explanation regardless of the verdict.

If no Bidder Business Profile is provided, set "status" to "NeedsReview" for all conditions, provide reasoning explaining that no profile data is available, and use "profileGapGuidance" to suggest what data would be needed.

Important: this evaluation provides guidance only, not a binding legal determination. Reflect this advisory nature in the reasoning when appropriate.`;

  const userPrompt = `Document name: ${documentName}\n\nDocument text:\n${text}`;

  return { systemPrompt, userPrompt };
}
