/**
 * Routes a buffer to the right text extractor based on MIME type and (as a
 * fallback) magic bytes. Throws on unsupported types so the caller can
 * surface a clear error.
 */

import { extractTextFromPdf, type PdfExtractionResult } from './pdfExtractor.js';
import { extractTextFromDocx, type WordExtractionResult } from './docxExtractor.js';
import { extractTextFromExcel, type ExcelExtractionResult } from './excelExtractor.js';

export interface ExtractedDocument {
  text: string;
  pageBreaks: number[];
  pageCount: number;
  mimeType: string;
}

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const LEGACY_DOC_MIME = 'application/msword';
const LEGACY_XLS_MIME = 'application/vnd.ms-excel';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK.. (DOCX/XLSX)

export async function extractText(
  buffer: Buffer,
  declaredMimeType: string,
  fileName: string,
): Promise<ExtractedDocument> {
  const mime = resolveMimeType(buffer, declaredMimeType, fileName);

  if (mime === PDF_MIME) {
    const result = await extractTextFromPdf(buffer);
    return withMime(result, PDF_MIME);
  }

  if (mime === DOCX_MIME) {
    const result = await extractTextFromDocx(buffer);
    return withMime(result, DOCX_MIME);
  }

  if (mime === XLSX_MIME) {
    const result = extractTextFromExcel(buffer);
    return withMime(result, XLSX_MIME);
  }

  if (mime === LEGACY_DOC_MIME || mime === LEGACY_XLS_MIME) {
    throw new Error(
      'פורמט מסמך ישן (.doc / .xls) אינו נתמך. אנא שמור כ-PDF או DOCX/XLSX ונסה שוב.',
    );
  }

  throw new Error(`סוג קובץ לא נתמך: ${mime}. נתמכים: PDF, DOCX, XLSX.`);
}

function resolveMimeType(buffer: Buffer, declared: string, fileName: string): string {
  // Magic bytes win over declared MIME because uploads/downloads often
  // arrive as application/octet-stream.
  if (buffer.length >= 4) {
    if (buffer.subarray(0, 4).equals(PDF_MAGIC)) return PDF_MIME;
    if (buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
      // ZIP magic — DOCX or XLSX. Disambiguate via declared or filename.
      const lower = (fileName + ' ' + declared).toLowerCase();
      if (lower.includes('xlsx') || lower.includes('spreadsheet')) return XLSX_MIME;
      return DOCX_MIME;
    }
  }

  const lower = declared?.toLowerCase() ?? '';
  if (lower.includes('pdf')) return PDF_MIME;
  if (lower.includes('wordprocessingml')) return DOCX_MIME;
  if (lower.includes('spreadsheetml')) return XLSX_MIME;
  if (lower.includes('msword')) return LEGACY_DOC_MIME;
  if (lower.includes('ms-excel')) return LEGACY_XLS_MIME;

  const nameLower = fileName.toLowerCase();
  if (nameLower.endsWith('.pdf')) return PDF_MIME;
  if (nameLower.endsWith('.docx')) return DOCX_MIME;
  if (nameLower.endsWith('.xlsx')) return XLSX_MIME;
  if (nameLower.endsWith('.doc')) return LEGACY_DOC_MIME;
  if (nameLower.endsWith('.xls')) return LEGACY_XLS_MIME;

  return declared || 'application/octet-stream';
}

function withMime(
  result: PdfExtractionResult | WordExtractionResult | ExcelExtractionResult,
  mimeType: string,
): ExtractedDocument {
  return {
    text: result.text,
    pageBreaks: result.pageBreaks,
    pageCount: result.pageCount,
    mimeType,
  };
}
