/**
 * Public surface of the tender analysis service.
 * Re-exports the orchestrator entry points and the result type so callers
 * (controllers / future jobs) only depend on this single module.
 */

export {
  analyzeTenderFromBuffer,
  analyzeTenderFromUrl,
  type AnalysisStatus,
  type AnalyzeFromBufferInput,
  type ConfidenceLevel,
  type StageOutcome,
  type TenderAnalysisResult,
} from './orchestrator.js';

export { ScannedPdfError } from './ingestion/pdfExtractor.js';
export { STAGE, type StageName } from './extractors/index.js';
export { saveTenderAnalysis } from './repository.js';
