const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

/* ─────────────── Result shape (mirror of backend) ─────────────── */

export type AnalysisStatus = "completed" | "partially_completed" | "failed";
export type ConfidenceLevel = "High" | "Medium" | "Low";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type EligibilityStatus = "Met" | "NotMet" | "NeedsReview";

export interface GeneralDetails {
  issuingBody?: string | null;
  tenderNumber?: string | null;
  publishDate?: string | null;
  submissionDeadline?: string | null;
  submissionLocation?: string | null;
  estimatedBudget?: string | null;
  contractDuration?: string | null;
  pricingMethod?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  prebidMeetingDate?: string | null;
  prebidMeetingRequired?: boolean | null;
  guaranteeRequired?: boolean | null;
  guaranteeAmount?: string | null;
  scope?: string | null;
  location?: string | null;
}

export interface SourceMeta {
  sourceDocument?: string;
  pageNumber?: number;
  clauseReference?: string | null;
  sourceSnippet?: string;
  confidence?: ConfidenceLevel;
}

export interface EligibilityCondition extends SourceMeta {
  description: string;
  conditionType?: string;
  status?: EligibilityStatus;
  reasoning?: string;
  profileGapGuidance?: string | null;
}

export interface Risk extends SourceMeta {
  description: string;
  severity: Severity;
  category: string;
  recommendation?: string | null;
}

export interface Penalty extends SourceMeta {
  description: string;
  severity?: Severity;
  amount?: string | null;
  triggerCondition?: string | null;
}

export interface CriticalPoint extends SourceMeta {
  title: string;
  description: string;
  category: string;
  severity: Severity;
  recommendation?: string | null;
}

export interface RequiredDocument {
  documentName: string;
  description?: string | null;
  isSubmissionBlocking?: boolean;
  sourceDocument?: string;
  pageNumber?: number;
  clauseReference?: string | null;
}

export interface StageOutcome {
  succeeded: boolean;
  durationMs: number;
  error?: string;
}

export type StageName =
  | "general_details"
  | "eligibility"
  | "risks"
  | "penalties"
  | "critical_points"
  | "required_documents"
  | "summary";

export interface TenderAnalysisResult {
  status: AnalysisStatus;
  overallConfidence: ConfidenceLevel;
  source: { fileName: string; mimeType: string; pageCount: number; sizeBytes: number };
  generalDetails: GeneralDetails;
  eligibility: EligibilityCondition[];
  risks: Risk[];
  penalties: Penalty[];
  criticalPoints: CriticalPoint[];
  requiredDocuments: RequiredDocument[];
  summary: { briefSummary: string; extendedSummary: string; recommendations: string };
  scores: {
    riskScore: number;
    readinessScore: number;
    highestRiskLevel: Severity | null;
  };
  stageResults: Record<StageName, StageOutcome>;
  totalTokensUsed: number;
  processingDurationMs: number;
  model: string;
  generatedAt: string;
}

/* ─────────────── Request types ─────────────── */

export type AnalyzeTenderInput =
  | { kind: "url"; url: string }
  | { kind: "file"; file: File };

export type AnalyzeTenderResponse =
  | { success: true; result: TenderAnalysisResult }
  | { success: false; error: string; code?: string };

/* ─────────────── API call ─────────────── */

const ANALYSIS_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes — orchestrator does up to 7 LLM calls

export async function analyzeTender(
  input: AnalyzeTenderInput,
  signal?: AbortSignal,
): Promise<AnalyzeTenderResponse> {
  try {
    const body =
      input.kind === "url"
        ? { url: input.url }
        : await fileToBase64Body(input.file);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), ANALYSIS_TIMEOUT_MS);
    signal?.addEventListener("abort", () => ac.abort(), { once: true });

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/tender-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const data = (await res.json().catch(() => ({}))) as Partial<{
      success: boolean;
      result: TenderAnalysisResult;
      error: string;
      code: string;
    }>;

    if (!res.ok || !data.success || !data.result) {
      return {
        success: false,
        error: data.error || `שגיאה (${res.status})`,
        code: data.code,
      };
    }

    return { success: true, result: data.result };
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") {
      return { success: false, error: "הניתוח בוטל או ארך יותר מדי" };
    }
    return { success: false, error: err.message || "שגיאת רשת בעת ניתוח המכרז" };
  }
}

async function fileToBase64Body(
  file: File,
): Promise<{ fileBase64: string; fileName: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.readAsDataURL(file);
  });

  // dataUrl looks like "data:application/pdf;base64,JVBE..."; strip the prefix.
  const commaIdx = dataUrl.indexOf(",");
  const fileBase64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;

  return {
    fileBase64,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
  };
}
