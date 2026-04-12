import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonalAccompanimentShell } from "@/components/PersonalAccompanimentShell";
import { PERSONAL_ACCOMPANIMENT_WHATSAPP } from "@/config/personalAccompaniment";
import {
  buildPersonalAccompanimentWhatsappHref,
  type PersonalAccompanimentDetails,
} from "@/lib/personalAccompaniment";

const TERMS_REMINDER = ["מענה עד 24 שעות", "עד 2 שיחות", "ליווי עד 60 יום"] as const;

const emptyDetails: PersonalAccompanimentDetails = {
  budget: "",
  equity: "",
  area: "",
  goal: "",
};

export default function PersonalAccompanimentWelcomePage() {
  const [details, setDetails] = useState<PersonalAccompanimentDetails>(emptyDetails);

  const whatsappHref = useMemo(
    () =>
      buildPersonalAccompanimentWhatsappHref(PERSONAL_ACCOMPANIMENT_WHATSAPP, {
        budget: details.budget,
        equity: details.equity,
        area: details.area,
        goal: details.goal,
      }),
    [details],
  );

  const canOpenWhatsapp = whatsappHref !== "#";

  return (
    <PersonalAccompanimentShell breadcrumbTail="ברוכים הבאים">
      <section
        className="rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-6 md:p-8 shadow-sm mb-8 text-center"
        aria-labelledby="welcome-heading"
      >
        <p className="text-4xl mb-3" aria-hidden>
          🎉
        </p>
        <h1 id="welcome-heading" className="text-2xl md:text-3xl font-bold font-display text-[#111318]">
          ברוך הבא לליווי אישי
        </h1>
        <p className="mt-3 text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
          אפשר למלא את הפרטים למטה — הם יוצמדו להודעה בוואטסאפ. אפשר גם לפתוח שיחה עם תבנית ריקה.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6 mb-8 shadow-sm">
        <h2 className="text-base font-bold text-[#111318] mb-4">פרטים לשיחה (אופציונלי)</h2>
        <div className="grid gap-4">
          {(
            [
              ["budget", "תקציב"],
              ["equity", "הון עצמי"],
              ["area", "אזור"],
              ["goal", "מטרה"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`pa-${key}`}>{label}</Label>
              <Input
                id={`pa-${key}`}
                dir="rtl"
                value={details[key]}
                onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
                className="text-right"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col items-center gap-3 mb-10">
        {canOpenWhatsapp ? (
          <Button
            asChild
            size="lg"
            className="h-14 px-10 text-lg font-bold rounded-xl shadow-md w-full max-w-sm"
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              פתח שיחה בוואטסאפ
            </a>
          </Button>
        ) : (
          <p className="text-sm text-destructive text-center max-w-md">
            יש להגדיר את משתנה הסביבה <code className="text-xs bg-muted px-1 rounded">VITE_PERSONAL_ACCOMPANIMENT_WHATSAPP</code>{" "}
            (מספר טלפון) כדי לפתוח וואטסאפ.
          </p>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link to="/personal-accompaniment">חזרה לעמוד ההסבר</Link>
        </Button>
      </div>

      <section
        className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 md:p-5"
        aria-labelledby="terms-reminder-heading"
      >
        <h2 id="terms-reminder-heading" className="sr-only">
          תזכורת תנאים
        </h2>
        <p className="text-xs font-semibold text-slate-500 mb-2">תנאים</p>
        <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
          {TERMS_REMINDER.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
    </PersonalAccompanimentShell>
  );
}
