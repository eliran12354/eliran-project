import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Break out of Layout `main` horizontal padding; document `overflow-x: hidden` avoids 100vw scrollbar overflow. */
const sectionFullBleedStyle = {
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  width: "100vw",
} as const;

const ANALYSIS_FEATURES = [
  {
    icon: "fact_check",
    title: "תנאי סף וזכאות",
    description: "חילוץ אוטומטי של תנאי הסף וההתאמה שלכם לדרישות החוזה",
  },
  {
    icon: "warning",
    title: "סיכונים וסעיפי קנס",
    description: "איתור סעיפים בעייתיים, קנסות והתחייבויות חריגות לפני חתימה",
  },
  {
    icon: "priority_high",
    title: "נקודות קריטיות",
    description: "סימון הנקודות שדורשות את תשומת הלב שלכם, מדורגות לפי חומרה",
  },
  {
    icon: "description",
    title: "מסמכים נדרשים",
    description: "רשימה מסודרת של כל המסמכים והאישורים שעליכם להגיש",
  },
] as const;

const PREVIEW_FINDINGS = [
  { severity: "גבוה", severityClassName: "bg-red-50 text-red-600 border-red-200", label: "סעיף קנס בגין איחור במסירה", barWidth: "w-[85%]" },
  { severity: "בינוני", severityClassName: "bg-amber-50 text-amber-600 border-amber-200", label: "תנאי הצמדה למדד תשומות הבנייה", barWidth: "w-[60%]" },
  { severity: "נמוך", severityClassName: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "מועדי תשלום ולוחות זמנים", barWidth: "w-[35%]" },
] as const;

/** תצוגה מקדימה דקורטיבית של דוח ניתוח — ויזואלית בלבד */
function AnalysisReportPreview() {
  return (
    <div className="relative" aria-hidden>
      {/* הילה רכה מאחורי הכרטיס */}
      <div className="absolute -inset-4 rounded-[24px] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-2xl" />

      <div className="relative rounded-[20px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_rgba(13,36,71,0.12)]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-xl">contract</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#111318]">דוח ניתוח חוזה</p>
              <p className="text-xs text-slate-500">הופק אוטומטית על ידי AI</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            הושלם
          </span>
        </div>

        <ul className="mt-4 space-y-3">
          {PREVIEW_FINDINGS.map(({ severity, severityClassName, label, barWidth }) => (
            <li key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111318]">{label}</span>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-bold ${severityClassName}`}>
                  {severity}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                <div className={`h-full rounded-full bg-gradient-to-l from-primary to-primary/60 ${barWidth}`} />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/[0.06] p-3.5">
          <span className="material-symbols-outlined text-lg text-primary">summarize</span>
          <p className="text-xs leading-relaxed text-slate-600">
            סיכום מנהלים והמלצות פעולה בעברית — מוכן תוך 30–60 שניות
          </p>
        </div>
      </div>
    </div>
  );
}

export function SmartContractAnalysisShowcase() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-white via-[#f8fafc] to-[#F5F7FA] py-24 md:py-28"
      style={sectionFullBleedStyle}
      dir="rtl"
      aria-labelledby="smart-contract-analysis-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.4]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 15% 25%, rgba(17,82,212,0.08), transparent 52%),
              radial-gradient(circle at 85% 70%, rgba(13,36,71,0.07), transparent 48%)`,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
              מבוסס בינה מלאכותית
            </p>
            <h2
              id="smart-contract-analysis-heading"
              className="font-display text-3xl font-black tracking-tight text-[#111318] md:text-4xl lg:text-5xl"
            >
              ניתוח חוזים חכם
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              העלו מסמך חוזה (PDF / DOCX / XLSX) או הדביקו קישור — והמערכת תחלץ עבורכם
              את כל מה שחשוב לדעת לפני שמתחייבים.
            </p>

            <ul className="mt-8 space-y-4">
              {ANALYSIS_FEATURES.map(({ icon, title, description }) => (
                <li key={icon} className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[0_2px_8px_rgba(17,82,212,0.1)]">
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#111318]">{title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Button
                className="h-14 gap-2 rounded-xl px-8 text-base font-bold shadow-[0_8px_24px_rgba(17,82,212,0.25)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(17,82,212,0.35)]"
                asChild
              >
                <Link to="/tender-analysis">
                  <span>נתחו חוזה עכשיו</span>
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                </Link>
              </Button>
            </div>
          </div>

          <AnalysisReportPreview />
        </div>
      </div>
    </section>
  );
}
