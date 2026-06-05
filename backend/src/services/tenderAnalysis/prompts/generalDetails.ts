/**
 * General details prompt — extracts the high-level metadata of a tender:
 * issuing body, deadlines, budget, contact info, etc.
 */

import { BASE_SYSTEM_RULES, ENUM } from './base.js';

export function buildGeneralDetailsPrompt(text: string, documentName: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const pricingValues = ENUM.pricingMethod.join(' | ');

  const systemPrompt = `${BASE_SYSTEM_RULES}

Extract general tender details. Return valid JSON matching this schema exactly:

{
  "issuingBody": "string | null",
  "tenderNumber": "string | null",
  "publishDate": "string | null",
  "submissionDeadline": "ISO 8601 date string (YYYY-MM-DDTHH:mm:ss) | null — extract the exact submission deadline date/time from the document",
  "submissionLocation": "string | null",
  "estimatedBudget": "string | null — monetary consideration / תמורה: total estimated value, budget cap, or price framework stated in the document (include currency or units as written). Do not put narrative work descriptions here; null if not stated",
  "contractDuration": "string | null — human-readable duration exactly as stated in the document (months/years, Hebrew or numeric, e.g. \"36 חודשים\", \"3 years\"). Do not invent; use null if not found.",
  "pricingMethod": "${pricingValues} | null — choose exactly one value that best matches the tender's pricing method. Use NotSpecified only if the method is unclear.",
  "contactPerson": "string | null",
  "contactEmail": "string | null",
  "contactPhone": "string | null",
  "prebidMeetingDate": "string | null",
  "prebidMeetingRequired": "boolean | null",
  "guaranteeRequired": "boolean | null — true if a bid/tender guarantee (ערבות) is required",
  "guaranteeAmount": "string | null — amount or terms of the bid bond / tender guarantee (ערבות הצעה, ערבות מכרז, גובה ערבות) including currency or % as written; null if not stated",
  "scope": "string | null — narrative description of the work, deliverables, or project (היקף העבודה / תיאור הפרויקט). Exclude monetary amounts and תמורה; do not repeat a short executive summary verbatim if the same text appears as the document's own abstract",
  "location": "string | null"
}`;

  const userPrompt = `Document name: ${documentName}\n\nDocument text:\n${text}`;

  return { systemPrompt, userPrompt };
}
