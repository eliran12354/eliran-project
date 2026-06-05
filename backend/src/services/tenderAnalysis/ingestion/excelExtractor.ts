/**
 * Excel text extraction.
 * Each sheet becomes a labeled CSV-like text block separated by `===` headers.
 */

import * as XLSX from 'xlsx';

const CHARS_PER_PAGE_ESTIMATE = 3000;

export interface ExcelExtractionResult {
  text: string;
  pageBreaks: number[];
  pageCount: number;
}

export function extractTextFromExcel(buffer: Buffer): ExcelExtractionResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetTexts: string[] = [];
  const pageBreaks: number[] = [];
  let cursor = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim();
    if (!csv) continue;

    pageBreaks.push(cursor);
    const block = `=== Sheet: ${sheetName} ===\n${csv}`;
    sheetTexts.push(block);
    cursor += block.length + 2; // +2 for the join separator
  }

  const text = sheetTexts.join('\n\n');
  const pageCount = pageBreaks.length || Math.max(1, Math.ceil(text.length / CHARS_PER_PAGE_ESTIMATE));

  return {
    text,
    pageBreaks: pageBreaks.length ? pageBreaks : [0],
    pageCount,
  };
}
