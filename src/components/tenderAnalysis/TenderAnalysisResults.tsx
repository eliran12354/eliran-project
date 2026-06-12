import { useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Coins,
  FileCheck2,
  FileText,
  Gauge,
  HelpCircle,
  LayoutList,
  Mail,
  MapPin,
  PanelTop,
  Phone,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Target,
  TimerReset,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ConfidenceBadge, SeverityBadge } from "./SeverityBadge";
import type {
  CriticalPoint,
  EligibilityCondition,
  EligibilityStatus,
  GeneralDetails,
  Penalty,
  RequiredDocument,
  Risk,
  StageName,
  StageOutcome,
  TenderAnalysisResult,
} from "@/lib/api/tenderAnalysisApi";

const STAGE_LABELS: Record<StageName, string> = {
  general_details: "פרטים כלליים",
  eligibility: "תנאי סף",
  risks: "סיכונים",
  penalties: "סעיפי קנס",
  critical_points: "נקודות קריטיות",
  required_documents: "מסמכים נדרשים",
  summary: "סיכום והמלצות",
};

const ELIGIBILITY_LABELS: Record<EligibilityStatus, string> = {
  Met: "עומד",
  NotMet: "לא עומד",
  NeedsReview: "דורש בדיקה",
};

const ELIGIBILITY_CLASSES: Record<EligibilityStatus, string> = {
  Met: "bg-emerald-100 text-emerald-700 border-emerald-200",
  NotMet: "bg-red-100 text-red-700 border-red-200",
  NeedsReview: "bg-amber-100 text-amber-700 border-amber-200",
};

interface Props {
  result: TenderAnalysisResult;
}

type ResultsView = "summary" | "detailed";

export function TenderAnalysisResults({ result }: Props) {
  const [view, setView] = useState<ResultsView>("summary");
  const detailedSectionRef = useRef<HTMLDivElement | null>(null);
  const summaryActionsRef = useRef<HTMLDivElement | null>(null);

  const scrollToDetailed = () => {
    setView("detailed");
    requestAnimationFrame(() => {
      detailedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const scrollToSummaryActions = () => {
    setView("summary");
    requestAnimationFrame(() => {
      summaryActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <SummaryHeader result={result} />
      <ScoresPanel result={result} />
      <SectionStatusPanel stageResults={result.stageResults} />

      {hasNarrativeSummary(result.summary) && (
        <NarrativeSummaryCard summary={result.summary} />
      )}

      {view === "summary" ? (
        <>
          <AtAGlanceCard details={result.generalDetails} />
          <DetailCountsHint result={result} />
          <div ref={summaryActionsRef} className="flex flex-col items-center gap-2 pt-1">
            <Button
              type="button"
              size="lg"
              className="min-w-[220px]"
              onClick={scrollToDetailed}
            >
              <LayoutList className="size-4" aria-hidden />
              צפה בניתוח מפורט
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              פרטי מכרז מלאים, תנאי סף, סיכונים, קנסות ומסמכים — יוצגו אחרי לחיצה.
            </p>
          </div>
        </>
      ) : (
        <div ref={detailedSectionRef} className="space-y-6 scroll-mt-6">
          <div className="flex justify-center sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={scrollToSummaryActions}
              className="gap-2"
            >
              <PanelTop className="size-4" aria-hidden />
              צפה בניתוח המקוצר
            </Button>
          </div>

          <GeneralDetailsCard details={result.generalDetails} />

          {result.criticalPoints.length > 0 && (
            <CriticalPointsCard points={result.criticalPoints} />
          )}

          {result.eligibility.length > 0 && (
            <EligibilityCard items={result.eligibility} />
          )}

          {result.risks.length > 0 && <RisksCard risks={result.risks} />}

          {result.penalties.length > 0 && <PenaltiesCard penalties={result.penalties} />}

          {result.requiredDocuments.length > 0 && (
            <RequiredDocumentsCard docs={result.requiredDocuments} />
          )}
        </div>
      )}

      <MetadataFooter result={result} />
    </div>
  );
}

/* ─────────────────────── header ─────────────────────── */

function SummaryHeader({ result }: { result: TenderAnalysisResult }) {
  const statusLabel =
    result.status === "completed"
      ? "הניתוח הושלם בהצלחה"
      : result.status === "partially_completed"
      ? "ניתוח חלקי — חלק מהשלבים נכשלו"
      : "הניתוח נכשל";

  const statusClass =
    result.status === "completed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : result.status === "partially_completed"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";

  return (
    <Card className="p-5 sm:p-6 space-y-3 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <ScrollText className="size-6" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              ניתוח: {result.source.fileName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.source.pageCount.toLocaleString()} עמודים ·{" "}
              {(result.source.sizeBytes / 1024 / 1024).toFixed(2)}MB ·{" "}
              {result.model}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={statusClass + " font-medium"}>
            {statusLabel}
          </Badge>
          <ConfidenceBadge confidence={result.overallConfidence} />
        </div>
      </div>
    </Card>
  );
}

/* ─────────────────────── scores ─────────────────────── */

function ScoresPanel({ result }: { result: TenderAnalysisResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ScoreCard
        icon={<ShieldAlert className="size-5" aria-hidden />}
        label="ציון סיכון"
        value={result.scores.riskScore}
        accent={
          result.scores.riskScore >= 70
            ? "bg-red-500"
            : result.scores.riskScore >= 40
            ? "bg-amber-500"
            : "bg-emerald-500"
        }
        description={
          result.scores.highestRiskLevel
            ? `סיכון מירבי: ${
                result.scores.highestRiskLevel === "Critical"
                  ? "קריטי"
                  : result.scores.highestRiskLevel === "High"
                  ? "גבוה"
                  : result.scores.highestRiskLevel === "Medium"
                  ? "בינוני"
                  : "נמוך"
              }`
            : "לא זוהו סיכונים מובהקים"
        }
      />
      <ScoreCard
        icon={<Gauge className="size-5" aria-hidden />}
        label="ציון מוכנות"
        value={result.scores.readinessScore}
        accent="bg-blue-500"
        description={
          result.scores.readinessScore >= 70
            ? "מוכנות גבוהה להגשה"
            : result.scores.readinessScore >= 40
            ? "מוכנות חלקית — יש להשלים"
            : "מוכנות נמוכה — נדרשת השלמה משמעותית"
        }
      />
    </div>
  );
}

function ScoreCard({
  icon,
  label,
  value,
  accent,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
  description: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-2xl font-bold tabular-nums">{value}</span>
      </div>
      <ScoreBar value={value} accent={accent} />
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}

function ScoreBar({ value, accent }: { value: number; accent: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full transition-all duration-500 ease-out", accent)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ─────────────────────── stage status ─────────────────────── */

function SectionStatusPanel({
  stageResults,
}: {
  stageResults: Record<StageName, StageOutcome>;
}) {
  const failedStages = Object.entries(stageResults).filter(
    ([, outcome]) => !outcome.succeeded,
  ) as [StageName, StageOutcome][];

  if (failedStages.length === 0) return null;

  return (
    <Card className="p-4 border-amber-200 bg-amber-50/60">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            {failedStages.length} שלבים לא הושלמו במלואם
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-800">
            {failedStages.map(([stage, outcome]) => (
              <li key={stage}>
                <span className="font-medium">{STAGE_LABELS[stage]}:</span>{" "}
                {outcome.error || "לא ידוע"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

/* ─────────────────────── narrative summary ─────────────────────── */

function NarrativeSummaryCard({
  summary,
}: {
  summary: TenderAnalysisResult["summary"];
}) {
  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <SectionTitle icon={<Sparkles className="size-5 text-primary" aria-hidden />}>
        סיכום והמלצות
      </SectionTitle>

      {summary.briefSummary && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-1">תקציר</h4>
          <p className="text-sm leading-relaxed whitespace-pre-line">{summary.briefSummary}</p>
        </div>
      )}

      {summary.extendedSummary && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-1">סיכום מורחב</h4>
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {summary.extendedSummary}
          </p>
        </div>
      )}

      {summary.recommendations && (
        <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
          <h4 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
            <Target className="size-4" aria-hidden />
            המלצות פעולה
          </h4>
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {summary.recommendations}
          </p>
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────── general details ─────────────────────── */

function GeneralDetailsCard({ details }: { details: GeneralDetails }) {
  const items: Array<{ icon: React.ReactNode; label: string; value: string | null | undefined }> = [
    { icon: <Building2 className="size-4" aria-hidden />, label: "גוף מפרסם", value: details.issuingBody },
    { icon: <FileText className="size-4" aria-hidden />, label: "מספר מכרז", value: details.tenderNumber },
    { icon: <Calendar className="size-4" aria-hidden />, label: "תאריך פרסום", value: details.publishDate },
    {
      icon: <TimerReset className="size-4" aria-hidden />,
      label: "מועד הגשה אחרון",
      value: details.submissionDeadline ? formatDate(details.submissionDeadline) : null,
    },
    { icon: <MapPin className="size-4" aria-hidden />, label: "מיקום הגשה", value: details.submissionLocation },
    { icon: <Coins className="size-4" aria-hidden />, label: "אומדן / תמורה", value: details.estimatedBudget },
    { icon: <Calendar className="size-4" aria-hidden />, label: "משך התקשרות", value: details.contractDuration },
    {
      icon: <Coins className="size-4" aria-hidden />,
      label: "ערבות נדרשת",
      value:
        details.guaranteeRequired === true
          ? details.guaranteeAmount || "כן"
          : details.guaranteeRequired === false
          ? "לא"
          : details.guaranteeAmount,
    },
    {
      icon: <Calendar className="size-4" aria-hidden />,
      label: "סיור קבלנים",
      value:
        details.prebidMeetingRequired === true
          ? details.prebidMeetingDate || "כן"
          : details.prebidMeetingRequired === false
          ? "אופציונלי"
          : details.prebidMeetingDate,
    },
    { icon: <User className="size-4" aria-hidden />, label: "איש קשר", value: details.contactPerson },
    { icon: <Mail className="size-4" aria-hidden />, label: "אימייל", value: details.contactEmail },
    { icon: <Phone className="size-4" aria-hidden />, label: "טלפון", value: details.contactPhone },
    { icon: <MapPin className="size-4" aria-hidden />, label: "מיקום הפרויקט", value: details.location },
  ];

  const populated = items.filter((item) => item.value && item.value.trim() !== "");

  if (populated.length === 0 && !details.scope) {
    return null;
  }

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <SectionTitle icon={<ClipboardList className="size-5 text-primary" aria-hidden />}>
        פרטי המכרז
      </SectionTitle>

      {populated.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {populated.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground mt-0.5">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="font-medium break-words">{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}

      {details.scope && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-1">היקף העבודה</h4>
            <p className="text-sm leading-relaxed whitespace-pre-line">{details.scope}</p>
          </div>
        </>
      )}
    </Card>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function hasNarrativeSummary(summary: TenderAnalysisResult["summary"]): boolean {
  const nonEmpty = (s: string | undefined) => Boolean(s && s.trim());
  return (
    nonEmpty(summary.briefSummary) ||
    nonEmpty(summary.extendedSummary) ||
    nonEmpty(summary.recommendations)
  );
}

/** High-signal fields for the condensed view (full grid appears in detailed mode). */
function AtAGlanceCard({ details }: { details: GeneralDetails }) {
  const rows: Array<{ icon: React.ReactNode; label: string; value: string }> = [];

  if (details.issuingBody?.trim())
    rows.push({
      icon: <Building2 className="size-4" aria-hidden />,
      label: "גוף מפרסם",
      value: details.issuingBody.trim(),
    });
  if (details.tenderNumber?.trim())
    rows.push({
      icon: <FileText className="size-4" aria-hidden />,
      label: "מספר מכרז",
      value: details.tenderNumber.trim(),
    });
  if (details.publishDate?.trim())
    rows.push({
      icon: <Calendar className="size-4" aria-hidden />,
      label: "תאריך פרסום",
      value: details.publishDate.trim(),
    });
  if (details.submissionDeadline?.trim())
    rows.push({
      icon: <TimerReset className="size-4" aria-hidden />,
      label: "מועד הגשה אחרון",
      value: formatDate(details.submissionDeadline),
    });
  if (details.submissionLocation?.trim())
    rows.push({
      icon: <MapPin className="size-4" aria-hidden />,
      label: "מיקום הגשה",
      value: details.submissionLocation.trim(),
    });
  if (details.location?.trim())
    rows.push({
      icon: <MapPin className="size-4" aria-hidden />,
      label: "מיקום הפרויקט",
      value: details.location.trim(),
    });

  if (rows.length === 0) return null;

  return (
    <Card className="p-5 sm:p-6 space-y-3 border-primary/15 bg-primary/[0.03]">
      <SectionTitle icon={<ClipboardList className="size-5 text-primary" aria-hidden />}>
        מבט מהיר
      </SectionTitle>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground mt-0.5">{row.icon}</span>
            <div className="min-w-0 flex-1">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="font-medium break-words">{row.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function DetailCountsHint({ result }: { result: TenderAnalysisResult }) {
  const parts: string[] = [];
  if (result.criticalPoints.length > 0) {
    parts.push(`${result.criticalPoints.length} נקודות קריטיות`);
  }
  if (result.eligibility.length > 0) {
    parts.push(`${result.eligibility.length} תנאי סף`);
  }
  if (result.risks.length > 0) {
    parts.push(`${result.risks.length} סיכונים`);
  }
  if (result.penalties.length > 0) {
    parts.push(`${result.penalties.length} סעיפי קנס`);
  }
  if (result.requiredDocuments.length > 0) {
    parts.push(`${result.requiredDocuments.length} מסמכים נדרשים`);
  }

  if (parts.length === 0) return null;

  return (
    <p className="text-sm text-muted-foreground text-center leading-relaxed px-1">
      בניתוח המפורט: {parts.join(" · ")}.
    </p>
  );
}

/* ─────────────────────── critical points ─────────────────────── */

function CriticalPointsCard({ points }: { points: CriticalPoint[] }) {
  return (
    <Card className="p-5 sm:p-6 space-y-3">
      <SectionTitle icon={<AlertTriangle className="size-5 text-orange-500" aria-hidden />}>
        נקודות קריטיות ({points.length})
      </SectionTitle>
      <ul className="space-y-3">
        {points.map((p, i) => (
          <li
            key={i}
            className="rounded-md border border-border bg-card p-3.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h4 className="font-semibold text-sm leading-snug flex-1 min-w-0">{p.title}</h4>
              <SeverityBadge severity={p.severity} />
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed mb-2 whitespace-pre-line">
              {p.description}
            </p>
            {p.recommendation && (
              <p className="text-sm text-primary/90 bg-primary/5 rounded px-2 py-1.5 mb-2">
                <span className="font-medium">המלצה:</span> {p.recommendation}
              </p>
            )}
            <SourceFooter
              category={categoryLabel(p.category, "criticalCategory")}
              page={p.pageNumber}
              clause={p.clauseReference}
              snippet={p.sourceSnippet}
              confidence={p.confidence}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ─────────────────────── eligibility ─────────────────────── */

function EligibilityCard({ items }: { items: EligibilityCondition[] }) {
  return (
    <Card className="p-5 sm:p-6 space-y-3">
      <SectionTitle icon={<CheckCircle2 className="size-5 text-blue-600" aria-hidden />}>
        תנאי סף ({items.length})
      </SectionTitle>
      <ul className="divide-y divide-border">
        {items.map((c, i) => (
          <EligibilityRow key={i} condition={c} />
        ))}
      </ul>
    </Card>
  );
}

function EligibilityRow({ condition }: { condition: EligibilityCondition }) {
  const [open, setOpen] = useState(false);
  const hasDetails = Boolean(
    condition.reasoning ||
      condition.profileGapGuidance ||
      condition.sourceSnippet ||
      condition.conditionType ||
      condition.pageNumber ||
      condition.clauseReference ||
      condition.confidence,
  );

  return (
    <li>
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-start justify-between gap-3 py-3 text-right transition-colors",
          hasDetails ? "hover:bg-muted/40 cursor-pointer" : "cursor-default",
        )}
        aria-expanded={hasDetails ? open : undefined}
        disabled={!hasDetails}
      >
        <span className="text-sm font-medium leading-snug flex-1 min-w-0">
          {condition.description}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {condition.status && (
            <Badge
              variant="outline"
              className={cn(ELIGIBILITY_CLASSES[condition.status], "font-medium")}
            >
              {ELIGIBILITY_LABELS[condition.status]}
            </Badge>
          )}
          {hasDetails && (
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          )}
        </div>
      </button>
      {open && hasDetails && (
        <div className="pb-3 space-y-2 text-sm">
          {condition.reasoning && (
            <p>
              <span className="font-semibold text-muted-foreground">נימוק: </span>
              {condition.reasoning}
            </p>
          )}
          {condition.profileGapGuidance && (
            <p className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-amber-900">
              <span className="font-semibold">לבדיקה: </span>
              {condition.profileGapGuidance}
            </p>
          )}
          <SourceFooter
            category={categoryLabel(condition.conditionType, "conditionType")}
            page={condition.pageNumber}
            clause={condition.clauseReference}
            snippet={condition.sourceSnippet}
            confidence={condition.confidence}
          />
        </div>
      )}
    </li>
  );
}

/* ─────────────────────── risks ─────────────────────── */

function RisksCard({ risks }: { risks: Risk[] }) {
  return (
    <Card className="p-5 sm:p-6 space-y-3">
      <SectionTitle icon={<ShieldAlert className="size-5 text-red-500" aria-hidden />}>
        סיכונים ({risks.length})
      </SectionTitle>
      <ul className="space-y-3">
        {risks.map((r, i) => (
          <li
            key={i}
            className="rounded-md border border-border bg-card p-3.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-sm leading-relaxed flex-1 min-w-0 whitespace-pre-line">
                {r.description}
              </p>
              <SeverityBadge severity={r.severity} />
            </div>
            {r.recommendation && (
              <p className="text-sm text-primary/90 bg-primary/5 rounded px-2 py-1.5 mb-2">
                <span className="font-medium">המלצה:</span> {r.recommendation}
              </p>
            )}
            <SourceFooter
              category={categoryLabel(r.category, "riskCategory")}
              page={r.pageNumber}
              clause={r.clauseReference}
              snippet={r.sourceSnippet}
              confidence={r.confidence}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ─────────────────────── penalties ─────────────────────── */

function PenaltiesCard({ penalties }: { penalties: Penalty[] }) {
  return (
    <Card className="p-5 sm:p-6 space-y-3">
      <SectionTitle icon={<Coins className="size-5 text-orange-600" aria-hidden />}>
        סעיפי קנס ({penalties.length})
      </SectionTitle>
      <ul className="space-y-3">
        {penalties.map((p, i) => (
          <li
            key={i}
            className="rounded-md border border-border bg-card p-3.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-sm leading-relaxed flex-1 min-w-0 whitespace-pre-line">
                {p.description}
              </p>
              {p.severity && <SeverityBadge severity={p.severity} />}
            </div>
            {(p.amount || p.triggerCondition) && (
              <dl className="grid gap-1 text-sm mb-2">
                {p.amount && (
                  <div>
                    <dt className="inline font-semibold text-muted-foreground">סכום: </dt>
                    <dd className="inline">{p.amount}</dd>
                  </div>
                )}
                {p.triggerCondition && (
                  <div>
                    <dt className="inline font-semibold text-muted-foreground">תנאי: </dt>
                    <dd className="inline">{p.triggerCondition}</dd>
                  </div>
                )}
              </dl>
            )}
            <SourceFooter
              page={p.pageNumber}
              clause={p.clauseReference}
              snippet={p.sourceSnippet}
              confidence={p.confidence}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ─────────────────────── required documents ─────────────────────── */

function RequiredDocumentsCard({ docs }: { docs: RequiredDocument[] }) {
  return (
    <Card className="p-5 sm:p-6 space-y-3">
      <SectionTitle icon={<FileCheck2 className="size-5 text-emerald-600" aria-hidden />}>
        מסמכים נדרשים להגשה ({docs.length})
      </SectionTitle>
      <ul className="space-y-2">
        {docs.map((d, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-md border border-border bg-card p-3 hover:bg-muted/30 transition-colors"
          >
            <FileText className="size-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{d.documentName}</p>
                {d.isSubmissionBlocking !== false && (
                  <Badge
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-200 text-xs shrink-0"
                  >
                    חוסם הגשה
                  </Badge>
                )}
              </div>
              {d.description && (
                <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
              )}
              {(d.pageNumber || d.clauseReference) && (
                <p className="text-xs text-muted-foreground/80 mt-1.5">
                  {d.pageNumber && `עמוד ${d.pageNumber}`}
                  {d.pageNumber && d.clauseReference && " · "}
                  {d.clauseReference && `סעיף ${d.clauseReference}`}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ─────────────────────── footer / shared ─────────────────────── */

/** Token/timing metadata is internal usage data — only shown to admins. */
function MetadataFooter({ result }: { result: TenderAnalysisResult }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  const generatedAt = formatDate(result.generatedAt);
  return (
    <p className="text-xs text-muted-foreground text-center pt-2">
      נוצר ב-{generatedAt} · {result.totalTokensUsed.toLocaleString()} טוקנים ·{" "}
      {(result.processingDurationMs / 1000).toFixed(1)} שניות
    </p>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
      {icon}
      {children}
    </h3>
  );
}

function SourceFooter({
  category,
  page,
  clause,
  snippet,
  confidence,
}: {
  category?: string | null;
  page?: number;
  clause?: string | null;
  snippet?: string;
  confidence?: "High" | "Medium" | "Low";
}) {
  const hasMeta = category || page || clause;

  if (!hasMeta && !snippet && !confidence) return null;

  return (
    <div className="space-y-1.5 mt-2">
      {snippet && (
        <blockquote className="border-r-2 border-muted-foreground/30 pr-2 text-xs text-muted-foreground italic">
          "{snippet}"
        </blockquote>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {category && <span>{category}</span>}
        {category && (page || clause) && <span aria-hidden>·</span>}
        {page && <span>עמוד {page}</span>}
        {page && clause && <span aria-hidden>·</span>}
        {clause && <span>סעיף {clause}</span>}
        {confidence && (
          <span className="ms-auto">
            <ConfidenceBadge confidence={confidence} />
          </span>
        )}
      </div>
    </div>
  );
}

function categoryLabel(
  raw: string | undefined,
  kind: "riskCategory" | "conditionType" | "criticalCategory",
): string | null {
  if (!raw) return null;
  const maps: Record<typeof kind, Record<string, string>> = {
    riskCategory: {
      Financial: "פיננסי",
      Legal: "משפטי",
      Technical: "טכני",
      Operational: "תפעולי",
      Compliance: "ציות",
      Timeline: "לוחות זמנים",
      Reputational: "מוניטין",
      Other: "אחר",
    },
    conditionType: {
      Threshold: "תנאי סף",
      Certification: "תעודה / אישור",
      Financial: "פיננסי",
      Experience: "ניסיון",
      Operational: "תפעולי",
      Legal: "משפטי",
      Other: "אחר",
    },
    criticalCategory: {
      Deadline: "מועדים",
      Financial: "פיננסי",
      Legal: "משפטי",
      Technical: "טכני",
      Compliance: "ציות",
      Operational: "תפעולי",
      Other: "אחר",
    },
  };
  return maps[kind][raw] ?? raw;
}

// Quiet ts-unused warnings — `HelpCircle` is reserved for future use in
// surfacing per-stage explanations to the user.
void HelpCircle;
