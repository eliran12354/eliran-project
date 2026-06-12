import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Break out of Layout `main` horizontal padding; document `overflow-x: hidden` avoids 100vw scrollbar overflow. */
const sectionFullBleedStyle = {
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  width: "100vw",
} as const;

const REPORT_FEATURES = [
  {
    icon: "map",
    title: "סטטוס תכנוני",
    description: "ייעוד הקרקע, תוכניות חלות וזכויות בנייה עדכניות",
  },
  {
    icon: "paid",
    title: "הערכת שווי",
    description: "אינדיקציית שווי על בסיס עסקאות אמיתיות ונתוני שוק",
  },
  {
    icon: "shield",
    title: "ניתוח סיכונים",
    description: "חשיפות תכנוניות, משפטיות וסביבתיות שכדאי להכיר מראש",
  },
  {
    icon: "trending_up",
    title: "יתרונות והזדמנויות",
    description: "פוטנציאל השבחה ונקודות חוזק ייחודיות של הקרקע",
  },
] as const;

const PREVIEW_METRICS = [
  { label: "ייעוד קרקע — מגורים", badge: "מאושר", badgeClassName: "bg-emerald-50 text-emerald-600 border-emerald-200", barWidth: "w-[90%]" },
  { label: "פוטנציאל השבחה", badge: "גבוה", badgeClassName: "bg-blue-50 text-blue-600 border-blue-200", barWidth: "w-[75%]" },
  { label: "רמת סיכון כוללת", badge: "נמוכה", badgeClassName: "bg-amber-50 text-amber-600 border-amber-200", barWidth: "w-[30%]" },
] as const;

/** תצוגה מקדימה דקורטיבית של דוח בדיקת קרקע — ויזואלית בלבד */
function LandReportPreview() {
  return (
    <div className="relative" aria-hidden>
      {/* הילה רכה מאחורי הכרטיס */}
      <div className="absolute -inset-4 rounded-[24px] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-2xl" />

      <div className="relative rounded-[20px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_rgba(13,36,71,0.12)]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-xl">travel_explore</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#111318]">דוח בדיקת קרקע</p>
              <p className="text-xs text-slate-500">גוש 6638 · חלקה 142</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            הושלם
          </span>
        </div>

        <ul className="mt-4 space-y-3">
          {PREVIEW_METRICS.map(({ label, badge, badgeClassName, barWidth }) => (
            <li key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111318]">{label}</span>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-bold ${badgeClassName}`}>
                  {badge}
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
            דוח מלא עם שווי, סיכונים ויתרונות — מוכן להצגה תוך דקות
          </p>
        </div>
      </div>
    </div>
  );
}

export function LandCheckShowcase() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-[#F5F7FA] via-[#f8fafc] to-white py-24 md:py-28"
      style={sectionFullBleedStyle}
      dir="rtl"
      aria-labelledby="land-check-showcase-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.4]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 85% 25%, rgba(17,82,212,0.08), transparent 52%),
              radial-gradient(circle at 15% 70%, rgba(13,36,71,0.07), transparent 48%)`,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* התצוגה המקדימה בצד ימין במסכים רחבים — מראה לסקשן ניתוח החוזים */}
          <div className="order-last lg:order-first">
            <LandReportPreview />
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
              דוח מקיף בלחיצה אחת
            </p>
            <h2
              id="land-check-showcase-heading"
              className="font-display text-3xl font-black tracking-tight text-[#111318] md:text-4xl lg:text-5xl"
            >
              בדיקת קרקע מתקדמת
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              הזינו כתובת או גוש וחלקה — והמערכת תפיק עבורכם דוח מקצועי מקיף על
              הקרקע, עם כל מה שצריך לדעת לפני שמשקיעים.
            </p>

            <ul className="mt-8 space-y-4">
              {REPORT_FEATURES.map(({ icon, title, description }) => (
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
                <Link to="/land-check">
                  <span>בדקו קרקע עכשיו</span>
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
