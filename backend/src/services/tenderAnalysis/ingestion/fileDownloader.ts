/**
 * Download a tender document from a remote URL with hard limits to avoid
 * accidentally pulling huge files into memory.
 */

const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export interface DownloadedFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * Fetch a remote file. Validates size + content-type loosely; returns the
 * buffer and a best-effort MIME type. The caller is responsible for further
 * routing the buffer to the right extractor.
 */
export async function downloadTenderFile(url: string): Promise<DownloadedFile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 NadlanSmart/1.0 TenderAnalyzer',
        Accept: 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*;q=0.5',
      },
    });

    if (!res.ok) {
      throw new Error(`הורדת הקובץ נכשלה (HTTP ${res.status})`);
    }

    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `הקובץ גדול מדי (${(contentLength / 1024 / 1024).toFixed(1)}MB). מקסימום ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `הקובץ גדול מדי (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB). מקסימום ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      );
    }

    const buffer = Buffer.from(arrayBuffer);
    const mimeType =
      res.headers.get('content-type')?.split(';')[0]?.trim() || guessMimeFromUrl(url);
    const fileName = guessFileNameFromUrl(url);

    return { buffer, mimeType, fileName, sizeBytes: buffer.length };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`הורדת הקובץ נמשכה יותר מדי (timeout ${DOWNLOAD_TIMEOUT_MS / 1000}s)`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function guessFileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : 'tender-document';
  } catch {
    return 'tender-document';
  }
}

function guessMimeFromUrl(url: string): string {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}
