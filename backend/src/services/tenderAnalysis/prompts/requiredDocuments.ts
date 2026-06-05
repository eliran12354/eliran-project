/**
 * Required documents prompt — extracts the checklist of files the bidder
 * must submit.
 */

import { BASE_SYSTEM_RULES } from './base.js';

export function buildRequiredDocumentsPrompt(text: string, documentName: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `${BASE_SYSTEM_RULES}

Extract list of documents required for tender submission. Return valid JSON matching this schema exactly:

{
  "requiredDocuments": [
    {
      "documentName": "string",
      "description": "string | null",
      "isSubmissionBlocking": "boolean",
      "sourceDocument": "string",
      "pageNumber": "number | null",
      "clauseReference": "string | null"
    }
  ]
}`;

  const userPrompt = `Document name: ${documentName}\n\nDocument text:\n${text}`;

  return { systemPrompt, userPrompt };
}
