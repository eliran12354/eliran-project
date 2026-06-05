/**
 * Word document text extraction.
 * - DOCX: mammoth (raw text only, no styles)
 * - DOC (legacy binary): not supported in this minimal port; rejected with
 *   a clear message so the user is told to convert to DOCX/PDF.
 */

import mammoth from 'mammoth';

const CHARS_PER_PAGE_ESTIMATE = 3000;

export interface WordExtractionResult {
  text: string;
  pageBreaks: number[];
  pageCount: number;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<WordExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value ?? '';
  const pageCount = Math.max(1, Math.ceil(text.length / CHARS_PER_PAGE_ESTIMATE));

  return {
    text,
    pageBreaks: buildPageBreaks(text, pageCount),
    pageCount,
  };
}

function buildPageBreaks(text: string, pageCount: number): number[] {
  if (pageCount <= 1) return [0];
  const approxCharsPerPage = Math.ceil(text.length / pageCount);
  const breaks: number[] = [0];
  for (let i = 1; i < pageCount; i++) {
    breaks.push(Math.min(i * approxCharsPerPage, text.length));
  }
  return breaks;
}
