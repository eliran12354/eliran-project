/**
 * PDF text extraction using pdf-parse v2.
 *
 * No OCR — scanned/image PDFs throw a clear "scanned" error so the caller can
 * return a useful message to the user. pdf-parse v2 exposes the per-page
 * text natively, so the page-break offsets we return point at real page
 * starts (not character-count estimates).
 */

import { PDFParse } from 'pdf-parse';

/** Min average chars per page below which we treat the PDF as scanned. */
const SCANNED_PDF_THRESHOLD_CHARS_PER_PAGE = 100;

/** pdf.js fires verbose logs on stderr at default verbosity; silence them. */
const SILENT_VERBOSITY = 0;

export interface PdfExtractionResult {
  text: string;
  pageBreaks: number[];
  pageCount: number;
}

export class ScannedPdfError extends Error {
  constructor(message = 'PDF נראה סרוק/מבוסס תמונה — חילוץ טקסט אינו אפשרי ללא OCR') {
    super(message);
    this.name = 'ScannedPdfError';
  }
}

/**
 * Extract text from a PDF buffer.
 * @throws ScannedPdfError if the PDF appears to be image-based.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
    verbosity: SILENT_VERBOSITY,
  });

  try {
    const result = await parser.getText();
    const pageCount = result.total ?? result.pages.length ?? 1;
    const { text, pageBreaks } = joinPages(result.pages);

    if (isPdfScanned(text, pageCount)) {
      throw new ScannedPdfError();
    }

    return { text, pageBreaks, pageCount };
  } finally {
    // Release the underlying pdf.js document; pdf-parse leaks workers without this.
    await parser.destroy().catch(() => undefined);
  }
}

function joinPages(pages: Array<{ num: number; text: string }>): {
  text: string;
  pageBreaks: number[];
} {
  if (pages.length === 0) {
    return { text: '', pageBreaks: [0] };
  }

  const sorted = [...pages].sort((a, b) => a.num - b.num);
  const pageBreaks: number[] = [];
  const chunks: string[] = [];
  let offset = 0;

  for (let i = 0; i < sorted.length; i++) {
    pageBreaks.push(offset);
    const pageText = sorted[i].text ?? '';
    chunks.push(pageText);
    offset += pageText.length;
    if (i < sorted.length - 1) {
      chunks.push('\f'); // form-feed delimits pages without inflating the offset by much
      offset += 1;
    }
  }

  return { text: chunks.join(''), pageBreaks };
}

function isPdfScanned(text: string, pageCount: number): boolean {
  if (pageCount <= 0) return true;
  return text.length / pageCount < SCANNED_PDF_THRESHOLD_CHARS_PER_PAGE;
}
