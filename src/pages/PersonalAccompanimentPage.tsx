import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PersonalAccompanimentShell } from "@/components/PersonalAccompanimentShell";
import {
  PERSONAL_ACCOMPANIMENT_PRICE_HEADING,
  PERSONAL_ACCOMPANIMENT_PRICE_LABEL,
} from "@/config/personalAccompaniment";
import { Check, Flame, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

const INCLUDES = [
  "בדיקות נכסים",
  "צ׳אט אישי",
  "הכוונה ובחירת נכסים",
  "עזרה בהחלטה משא ומתן",
  "שיחות לפי צורך",
] as const;

const TERMS = ["מענה עד 24 שעות", "עד 2 שיחות", "ליווי עד 60 יום"] as const;

const WHO_IS_IT_FOR = [
  "למי שרוצה לקנות דירה ראשונה",
  "למשקיעים שמחפשים הזדמנויות",
  "למי ששוקל לקנות קרקע ורוצה להימנע מטעויות",
  "למי שלא מבין מספיק ורוצה ליווי מקצועי",
] as const;

export default function PersonalAccompanimentPage() {
  return (
    <PersonalAccompanimentShell>
      <header className="mb-8 text-center">
        <p className="text-sm font-medium text-primary mb-2">אל תקבל החלטה לבד</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight font-display text-[#111318] mb-3">
          לא קונים נדל״ן לבד
        </h1>
        <p className="text-lg text-slate-600 font-medium">
          ליווי אישי עד לחתימת חוזה ללא טעויות יקרות
        </p>
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
        <p className="text-sm text-slate-600 font-medium text-center max-w-md leading-relaxed">
          {PERSONAL_ACCOMPANIMENT_PRICE_HEADING}
        </p>
        <p className="text-3xl font-black font-display text-[#111318] tabular-nums">
          {PERSONAL_ACCOMPANIMENT_PRICE_LABEL}
        </p>
        <section
          className="w-full max-w-lg rounded-xl border border-slate-200/90 bg-white/90 p-5 text-right shadow-sm"
          aria-labelledby="who-heading"
        >
          <h2 id="who-heading" className="text-base font-bold text-[#111318] mb-3">
            למי זה מתאים?
          </h2>
          <ul className="space-y-2.5 list-none p-0 m-0">
            {WHO_IS_IT_FOR.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </section>
        <Button
          asChild
          size="lg"
          className="h-14 px-10 text-lg font-bold rounded-xl shadow-md"
        >
          <Link to="/personal-accompaniment/checkout">התחל ליווי אישי</Link>
        </Button>
      </div>

      <section
        className="rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50/90 via-white to-slate-50 p-6 md:p-7 shadow-sm mb-8"
        aria-labelledby="hot-areas-promo-heading"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-md">
            <Flame className="h-6 w-6" aria-hidden />
          </div>
          <div className="text-right min-w-0">
            <h2 id="hot-areas-promo-heading" className="text-lg font-bold text-[#111318]">
              אזורים חמים למעקב
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              עקבו אחר תוכניות ומתחמים עם פוטנציאל — גם מהאתר.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-stretch sm:justify-end">
          <Button variant="outline" className="h-11 rounded-xl border-orange-300/80 bg-white font-semibold" asChild>
            <Link to="/hot-areas" className="gap-2 inline-flex items-center justify-center">
              <Flame className="h-4 w-4 shrink-0" />
              הוסף למעקב
            </Link>
          </Button>
          <Button className="h-11 rounded-xl font-semibold shadow-sm" asChild>
            <Link to="/plans" className="gap-2 inline-flex items-center justify-center">
              <MapPinned className="h-4 w-4 shrink-0" />
              גישה למסמכי התוכנית
            </Link>
          </Button>
        </div>
      </section>

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
