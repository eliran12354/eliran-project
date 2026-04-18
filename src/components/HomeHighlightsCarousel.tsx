import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { FileText, HeartHandshake, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CardDef = {
  to: string;
  badge: string;
  title: string;
  description: string;
  cta: string;
  variant: "blue" | "amber" | "violet";
  Icon: LucideIcon;
};

const CARDS: CardDef[] = [
  {
    to: "/personal-accompaniment",
    badge: "ליווי מקצועי",
    title: "ליווי אישי עד קנייה",
    description:
      "ליווי צמוד משלב האיתור וההבנה — ועד קניית הנכס. מתאימים לכם מסלול מותאם, מלווים בתהליך ומקדמים אתכם בביטחון עד החתימה.",
    cta: "לפרטים ורכישת ליווי",
    variant: "blue",
    Icon: HeartHandshake,
  },
  {
    to: "/hot-investor-boards",
    badge: "למשקיעים",
    title: "לוחות נדל״ן חמים למשקיעים",
    description:
      "שלושה לוחות ממוקדים: דירות לפינוי־בינוי, נכסים עד מיליון ש״ח, וקרקעות בשלבי הפשרה — מודעות מהאתר, עם אפשרות להתראות כשמתפרסם משהו חדש.",
    cta: "ללוחות וסינון לפי קטגוריה",
    variant: "amber",
    Icon: LayoutGrid,
  },
  {
    to: "/listings",
    badge: "מכרזים",
    title: "מכרזים חמים",
    description:
      "מכרזי רמ״י והוצאה לפועל — נכסים, קרקעות ועסקאות בממשק אחד, עם מעבר מהיר בין סוגי המכרזים וסינון לפי הצורך.",
    cta: "למכרזים",
    variant: "violet",
    Icon: FileText,
  },
];

function HighlightCard({ card }: { card: CardDef }) {
  const { to, badge, title, description, cta, variant, Icon } = card;

  const shell =
    variant === "blue"
      ? "border-slate-200/80 bg-gradient-to-br from-white via-[#f8fafc] to-blue-50/80 hover:border-primary/35 hover:shadow-[0_20px_50px_rgba(17,82,212,0.14)] focus-visible:ring-primary"
      : variant === "amber"
        ? "border-slate-200/80 bg-gradient-to-br from-white via-[#fffbf5] to-amber-50/70 hover:border-amber-400/40 hover:shadow-[0_20px_50px_rgba(234,88,12,0.12)] focus-visible:ring-amber-500"
        : "border-slate-200/80 bg-gradient-to-br from-white via-[#f5f3ff] to-violet-50/80 hover:border-violet-400/45 hover:shadow-[0_20px_50px_rgba(109,40,217,0.12)] focus-visible:ring-violet-600";

  const topBar =
    variant === "blue"
      ? "from-primary via-blue-500 to-cyan-500"
      : variant === "amber"
        ? "from-amber-500 via-orange-500 to-rose-600"
        : "from-violet-600 via-fuchsia-500 to-indigo-600";

  const iconWrap =
    variant === "blue"
      ? "bg-primary/10 text-primary ring-primary/15"
      : variant === "amber"
        ? "bg-amber-500/12 text-amber-800 ring-amber-500/20 dark:text-amber-300"
        : "bg-violet-500/12 text-violet-800 ring-violet-500/25 dark:text-violet-200";

  const badgeCls =
    variant === "blue"
      ? "bg-primary/10 text-primary"
      : variant === "amber"
        ? "bg-amber-500/12 text-amber-900 dark:text-amber-200"
        : "bg-violet-500/12 text-violet-900 dark:text-violet-100";

  const titleHover =
    variant === "blue"
      ? "group-hover:text-primary"
      : variant === "amber"
        ? "group-hover:text-amber-800 dark:group-hover:text-amber-300"
        : "group-hover:text-violet-800 dark:group-hover:text-violet-200";

  const ctaCls =
    variant === "blue"
      ? "text-primary"
      : variant === "amber"
        ? "text-amber-800 dark:text-amber-300"
        : "text-violet-800 dark:text-violet-200";

  const borderFoot =
    variant === "blue"
      ? "border-slate-200/60"
      : variant === "amber"
        ? "border-amber-200/50"
        : "border-violet-200/50";

  const chevronHover =
    variant === "blue"
      ? "group-hover:text-primary/60"
      : variant === "amber"
        ? "group-hover:text-amber-600/70"
        : "group-hover:text-violet-600/70";

  return (
    <Link
      to={to}
      className={cn(
        "group relative flex h-full min-h-[300px] flex-col rounded-2xl border p-6 text-right shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-[320px] sm:p-8",
        shell,
      )}
    >
      <div
        className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-l opacity-90", topBar)}
        aria-hidden
      />
      <div className="flex items-start gap-4 mb-5">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner ring-1 transition-transform duration-300 group-hover:scale-105",
            iconWrap,
          )}
        >
          <Icon className="size-7" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <span className={cn("inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold", badgeCls)}>
            {badge}
          </span>
          <h3 className={cn("text-lg font-black text-[#111318] leading-snug sm:text-xl md:text-2xl", titleHover)}>
            {title}
          </h3>
        </div>
      </div>
      <p className="text-slate-600 leading-relaxed text-[15px] sm:text-base mb-6 flex-1">{description}</p>
      <div className={cn("flex items-center justify-between gap-3 pt-2 border-t", borderFoot)}>
        <span className={cn("text-sm font-bold inline-flex items-center gap-1 transition-all group-hover:gap-2", ctaCls)}>
          {cta}
          <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-0.5" aria-hidden>
            arrow_back
          </span>
        </span>
        <span className={cn("material-symbols-outlined text-slate-300 text-2xl transition-colors", chevronHover)} aria-hidden>
          chevron_left
        </span>
      </div>
    </Link>
  );
}

const sectionFullBleedStyle = {
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  width: "100vw",
} as const;

/**
 * קרוסלת הדגשים לעמוד הבית — מובייל: כרטיס מלא + מגע; מסכים רחבים: 2–3 כרטיסים בפריים.
 */
export function HomeHighlightsCarousel() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28 bg-white overflow-hidden" style={sectionFullBleedStyle}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(17, 82, 212, 0.35), transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(234, 88, 12, 0.2), transparent 42%)`,
        }}
        aria-hidden
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center md:text-right mb-10 lg:mb-12">
          <p className="text-sm font-semibold text-primary mb-2 tracking-wide">ליווי, משקיעים ומכרזים</p>
          <h2 className="text-3xl md:text-4xl font-black text-[#111318] font-display mb-4">
            מהניתוח — לפעולה בשטח
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl md:mr-0 mx-auto leading-relaxed">
            ליווי אישי עד רכישה, לוחות נדל״ן למשקיעים ומכרזים חמים — כלים שמחברים בין ניתוח הנתונים לבין צעדים
            מעשיים בשוק.
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
            dragFree: false,
            direction: "rtl",
          }}
          className="w-full"
        >
          <CarouselContent>
            {CARDS.map((card) => (
              <CarouselItem
                key={card.to}
                className="basis-full sm:basis-1/2 lg:basis-1/3"
              >
                <HighlightCard card={card} />
              </CarouselItem>
            ))}
          </CarouselContent>

          <div
            className="mt-8 flex items-center justify-center gap-4"
            aria-label="ניווט בין כרטיסים"
          >
            <CarouselPrevious
              type="button"
              variant="outline"
              className="static h-11 w-11 translate-y-0 rounded-full border-slate-200 bg-white shadow-md hover:bg-slate-50"
            />
            <CarouselNext
              type="button"
              variant="outline"
              className="static h-11 w-11 translate-y-0 rounded-full border-slate-200 bg-white shadow-md hover:bg-slate-50"
            />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
