import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LEMONSQUEEZY_CHECKOUT_URL } from "@/config/lemonsqueezy";
import { cn } from "@/lib/utils";

const BENEFITS: { icon: string; title: string; description: string; to: string }[] = [
  {
    icon: "map",
    title: "מפות ונתונים תכנוניים",
    description: "שכבות ייעוד, תוכניות ומידע ממשלתי בממשק אחד — כמו ב־GovMap.",
    to: "/govmap",
  },
  {
    icon: "description",
    title: "תוכניות בנייה והיתרים",
    description: "מעקב אחר תב״עות, היתרים וצפי התקדמות פרויקטים.",
    to: "/plans",
  },
  {
    icon: "location_city",
    title: "התחדשות עירונית",
    description: "זיהוי מתחמים עם פוטנציאל פינוי־בינוי ותמ״א.",
    to: "/urban-renewal",
  },
  {
    icon: "payments",
    title: "מודיעין עסקאות",
    description: "נתונים היסטוריים ועדכניים על מחירים ועסקאות באזורים.",
    to: "/listings",
  },
  {
    icon: "science",
    title: "בדיקות קרקע ודוחות",
    description: "הערכות, ניתוחים וכלים לבדיקת יעוד ושווי.",
    to: "/land-check",
  },
  {
    icon: "report_problem",
    title: "סיכוני מבנים",
    description: "ניטור ומידע לניהול סיכונים פיזיים ופיננסיים.",
    to: "/dangerous-buildings",
  },
];

/** Same subtle noise as Index Value Proposition — depth without a photo background. */
const SUBTLE_NOISE_BG = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V4h4V2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V4h4V2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

export default function BusinessAccountPage() {
  return (
    <div
      className="relative w-full min-h-screen bg-[#F5F7FA] overflow-hidden"
      dir="rtl"
    >
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: SUBTLE_NOISE_BG }}
        aria-hidden
      />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-8">
        <nav className="flex items-center gap-2 mb-6" aria-label="מיקום בעמוד">
          <Link
            className="text-[#617589] dark:text-gray-400 text-sm font-medium hover:text-primary transition-colors"
            to="/"
          >
            דף הבית
          </Link>
          <span className="material-symbols-outlined text-sm text-[#617589]">chevron_left</span>
          <span className="text-[#111418] dark:text-white text-sm font-semibold">חשבון עסקי</span>
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined text-3xl">business_center</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight font-display text-[#111318]">
              חשבון עסקי
            </h1>
          </div>
          <p className="text-slate-600 text-lg max-w-2xl leading-relaxed">
            המנוי העסקי נועד לצוותים ולעסקים שצריכים גישה מלאה לכלים המקצועיים של המערכת — נתונים,
            תכנון, עסקאות והתראות במקום אחד, כדי לקבל החלטות לפני המתחרים.
          </p>
        </header>

        <section className="mb-12" aria-labelledby="benefits-heading">
          <h2 id="benefits-heading" className="text-xl font-bold text-[#111318] mb-6">
            מה כלול במנוי
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0 m-0">
            {BENEFITS.map(({ icon, title, description, to }) => (
              <li key={title}>
                <Link
                  to={to}
                  className="flex gap-4 p-5 rounded-[16px] bg-white border border-slate-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-primary/30 transition-colors group h-full"
                >
                  <span className="material-symbols-outlined text-primary text-3xl shrink-0 group-hover:scale-105 transition-transform">
                    {icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-[#111318] mb-1 group-hover:text-primary transition-colors">
                      {title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-[16px] bg-gradient-to-br from-[#0a1a3a] via-[#0d2447] to-[#0a1a3a] p-8 md:p-10 text-center"
          aria-labelledby="checkout-heading"
        >
          <h2 id="checkout-heading" className="text-2xl md:text-3xl font-black text-white font-display mb-3">
            מעבר לתשלום
          </h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto leading-relaxed">
            לאחר התשלום תוכלו להשלים את הגדרת החשבון העסקי. התשלום מאובטח דרך Lemon Squeezy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className={cn(
                "lemonsqueezy-button h-14 px-10 text-lg font-bold rounded-xl",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "shadow-[0_8px_24px_rgba(17,82,212,0.3)]",
              )}
            >
              <a href={LEMONSQUEEZY_CHECKOUT_URL}>המשך לתשלום מאובטח</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 px-8 border-white/25 text-white bg-white/5 hover:bg-white/10 rounded-xl"
            >
              <Link to="/">חזרה לדף הבית</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
