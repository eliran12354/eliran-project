import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Break out of Layout `main` horizontal padding; document `overflow-x: hidden` avoids 100vw scrollbar overflow. */
const sectionFullBleedStyle = {
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  width: "100vw",
} as const;

const DATA_SOURCES = [
  {
    icon: "layers",
    title: "מבא״ת",
    description: "תוכניות בנייה ומסמכים תכנוניים החלים על החלקה",
  },
  {
    icon: "location_city",
    title: "התחדשות עירונית",
    description: "מתחמי פינוי-בינוי ותמ״א בסביבת החלקה",
  },
  {
    icon: "gavel",
    title: "מכרזי רמ״י",
    description: "מכרזים פעילים והיסטוריים על הקרקע ובסביבתה",
  },
  {
    icon: "warehouse",
    title: "מלאי תכנוני",
    description: "פוטנציאל יחידות דיור ומלאי תכנוני למגורים",
  },
] as const;

/** דמוי שורת חיפוש דקורטיבי — הקליק מוביל לעמוד החיפוש המלא */
function SearchBarMock() {
  return (
    <Link
      to="/gush-helka-search"
      className="group mx-auto block max-w-3xl rounded-2xl border border-white/15 bg-white/[0.07] p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all hover:border-primary/50 hover:bg-white/10 hover:shadow-[0_0_40px_rgba(17,82,212,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1a3a]"
      aria-label="מעבר לחיפוש לפי גוש וחלקה"
    >
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3.5">
          <span className="material-symbols-outlined text-xl text-primary" aria-hidden>grid_on</span>
          <div className="text-right">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">גוש</p>
            <p className="text-sm font-bold text-white">לדוגמה: 6638</p>
          </div>
        </div>

        <div className="hidden h-10 w-px bg-white/10 sm:block" aria-hidden />

        <div className="flex flex-1 items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3.5">
          <span className="material-symbols-outlined text-xl text-primary" aria-hidden>crop_square</span>
          <div className="text-right">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">חלקה</p>
            <p className="text-sm font-bold text-white">לדוגמה: 142</p>
          </div>
        </div>

        <div className="flex h-[3.25rem] shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-7 font-bold text-white shadow-[0_8px_24px_rgba(17,82,212,0.4)] transition-transform group-hover:scale-[1.03]">
          <span className="material-symbols-outlined text-xl" aria-hidden>search</span>
          <span>חיפוש</span>
        </div>
      </div>
    </Link>
  );
}

export function GushHelkaSearchShowcase() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-[#0a1a3a] via-[#0d2447] to-[#0a1a3a] py-24 md:py-28"
      style={sectionFullBleedStyle}
      dir="rtl"
      aria-labelledby="gush-helka-search-heading"
    >
      {/* רשת קווים עדינה + הילות צבע לרקע */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 15%, rgba(17,82,212,0.25), transparent 45%),
              radial-gradient(circle at 80% 85%, rgba(17,82,212,0.18), transparent 42%)`,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <header className="mb-12 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
            איתור מדויק במפה
          </p>
          <h2
            id="gush-helka-search-heading"
            className="font-display text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl"
          >
            חיפוש לפי גוש וחלקה
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
            הזינו מספר גוש וחלקה — והמערכת תאתר את הקרקע במפה ותצליב עבורכם
            ארבעה מקורות מידע ממשלתיים בלחיצה אחת.
          </p>
        </header>

        <SearchBarMock />

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DATA_SOURCES.map(({ icon, title, description }) => (
            <div
              key={icon}
              className="group rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-white/[0.08]"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/20 text-blue-300 transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">{icon}</span>
              </div>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            className="h-12 gap-2 rounded-xl border-2 border-white/20 bg-white/5 px-8 text-base font-bold text-white backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link to="/gush-helka-search">
              <span>לעמוד החיפוש המלא</span>
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
