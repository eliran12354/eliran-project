import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel, Severity } from "@/lib/api/tenderAnalysisApi";

const SEVERITY_LABELS: Record<Severity, string> = {
  Low: "נמוך",
  Medium: "בינוני",
  High: "גבוה",
  Critical: "קריטי",
};

const SEVERITY_CLASSES: Record<Severity, string> = {
  Low: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
  Medium: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200",
  High: "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200",
  Critical: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  High: "ביטחון גבוה",
  Medium: "ביטחון בינוני",
  Low: "ביטחון נמוך",
};

const CONFIDENCE_CLASSES: Record<ConfidenceLevel, string> = {
  High: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  Medium: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
  Low: "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-50",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge variant="outline" className={cn(SEVERITY_CLASSES[severity], "font-medium", className)}>
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: ConfidenceLevel;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(CONFIDENCE_CLASSES[confidence], "text-xs", className)}>
      {CONFIDENCE_LABELS[confidence]}
    </Badge>
  );
}
