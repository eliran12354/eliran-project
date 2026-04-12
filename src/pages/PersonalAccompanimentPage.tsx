import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PersonalAccompanimentShell } from "@/components/PersonalAccompanimentShell";
import { PERSONAL_ACCOMPANIMENT_PRICE_LABEL } from "@/config/personalAccompaniment";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const INCLUDES = [
  "בדיקות נכסים",
  "צ׳אט אישי",
  "הכוונה ובחירת נכסים",
  "עזרה בהחלטה משא ומתן",
  "שיחות לפי צורך",
] as const;

const TERMS = ["מענה עד 24 שעות", "עד 2 שיחות", "ליווי עד 60 יום"] as const;

export default function PersonalAccompanimentPage() {
  return (
    <PersonalAccompanimentShell>
      <header className="mb-8 text-center">
        <p className="text-sm font-medium text-primary mb-2">אל תקבל החלטה לבד</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight font-display text-[#111318] mb-3">
          לא קונים דירה לבד
        </h1>
        <p className="text-lg text-slate-600 font-medium">ליווי אישי עד קנייה</p>
      </header>

      <section
        className={cn(
          "rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-slate-50",
          "p-6 md:p-8 shadow-sm mb-8",
        )}
        aria-labelledby="includes-heading"
      >
        <h2 id="includes-heading" className="text-xl font-bold text-[#111318] mb-5">
          מה כולל
        </h2>
        <ul className="space-y-3 list-none p-0 m-0">
          {INCLUDES.map((line) => (
            <li key={line} className="flex items-start gap-3 text-slate-700 leading-relaxed">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-4 w-4 stroke-[2.5]" aria-hidden />
              </span>
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-6 pt-5 border-t border-slate-200/80 text-slate-800 font-medium">
          חיבור לאנשי מקצוע נכונים
        </p>
      </section>

      <div className="flex flex-col items-center gap-4 mb-10">
        <p className="text-sm text-slate-500">מחיר</p>
        <p className="text-3xl font-black font-display text-[#111318] tabular-nums">
          {PERSONAL_ACCOMPANIMENT_PRICE_LABEL}
        </p>
        <Button
          asChild
          size="lg"
          className="h-14 px-10 text-lg font-bold rounded-xl shadow-md"
        >
          <Link to="/personal-accompaniment/checkout">התחל ליווי אישי</Link>
        </Button>
      </div>

      <section
        id="terms"
        className="rounded-xl border border-amber-200/70 bg-amber-50/80 p-5 md:p-6"
        aria-labelledby="terms-heading"
      >
        <h2 id="terms-heading" className="text-lg font-bold text-amber-950 mb-3 flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            ⚠️
          </span>
          תנאים
        </h2>
        <ul className="list-disc list-inside space-y-1.5 text-amber-950/90 text-sm leading-relaxed">
          {TERMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
    </PersonalAccompanimentShell>
  );
}
