import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ScrollText, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { TenderAnalysisInputForm } from "@/components/tenderAnalysis/TenderAnalysisInputForm";
import { TenderAnalysisResults } from "@/components/tenderAnalysis/TenderAnalysisResults";
import {
  analyzeTender,
  type AnalyzeTenderInput,
  type TenderAnalysisResult,
} from "@/lib/api/tenderAnalysisApi";

const HINTS = [
  "מוריד את הקובץ ומחלץ ממנו טקסט…",
  "מזהה פרטים כלליים, סיכונים ותנאי סף…",
  "מאתר נקודות קריטיות, סעיפי קנס ומסמכים נדרשים…",
  "מנסח סיכום והמלצות בעברית…",
];

export default function TenderAnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TenderAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Rotate hint text while a request is in flight so the user sees progress.
  useEffect(() => {
    if (!loading) return;
    setHintIndex(0);
    const interval = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % HINTS.length);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSubmit = useCallback(async (input: AnalyzeTenderInput) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await analyzeTender(input, controller.signal);

    if (controller.signal.aborted) {
      setLoading(false);
      return;
    }

    if ("result" in response) {
      setResult(response.result);
      // Scroll the results into view on the next frame.
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      setError(response.error);
    }

    setLoading(false);
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return (
    <div className="w-full" dir="rtl">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <nav className="flex items-center gap-2 mb-6" aria-label="ניווט">
          <Link
            to="/"
            className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors"
          >
            דף הבית
          </Link>
          <span className="text-muted-foreground text-sm" aria-hidden>
            /
          </span>
          <span className="text-foreground text-sm font-semibold">ניתוח מכרזים</span>
        </nav>

        <header className="flex flex-col gap-2 mb-6 sm:mb-8">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
              <ScrollText className="size-7" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">
                ניתוח מכרזים חכם
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                העלה מסמך מכרז (PDF / DOCX / XLSX) או הדבק כתובת URL — נחלץ אוטומטית
                פרטים כלליים, תנאי סף, סיכונים, סעיפי קנס, נקודות קריטיות ומסמכים נדרשים,
                ונייצר סיכום והמלצות בעברית.
              </p>
            </div>
          </div>
        </header>

        <SubscriptionGate>
        <TenderAnalysisInputForm
          loading={loading}
          onSubmit={handleSubmit}
          onCancel={loading ? handleCancel : undefined}
        />

        {loading && (
          <Card className="mt-6 p-6 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium text-foreground">{HINTS[hintIndex]}</p>
            <p className="text-xs text-muted-foreground">
              ניתוח מלא לוקח בדרך כלל 30–60 שניות תלוי בגודל המסמך.
            </p>
          </Card>
        )}

        {error && !loading && (
          <Card className="mt-6 border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-destructive">הניתוח נכשל</p>
                <p className="text-sm text-destructive/90 mt-1 break-words">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {result && (
          <div ref={resultsRef} className="mt-8">
            <TenderAnalysisResults key={result.generatedAt} result={result} />
          </div>
        )}
        </SubscriptionGate>
      </div>
    </div>
  );
}
