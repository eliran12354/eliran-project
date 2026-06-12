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

/** Break out of Layout `main` horizontal padding; document `overflow-x: hidden` avoids 100vw scrollbar overflow. */
const sectionFullBleedStyle = {
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  width: "100vw",
} as const;

type Variant = "blue" | "amber" | "violet";

/** סגנונות לכל וריאנט צבע של כרטיס — מרוכזים במקום אחד */
const VARIANT_STYLES: Record<
  Variant,
  {
    shell: string;
    iconWrap: string;
    badge: string;
    titleHover: string;
    cta: string;
    footBorder: string;
    arrowCircle: string;
  }
> = {
  blue: {
    shell:
      "border-slate-200/80 bg-gradient-to-br from-white via-[#f8fafc] to-blue-50/80 hover:border-primary/35 hover:shadow-[0_24px_60px_rgba(17,82,212,0.16)] focus-visible:ring-primary",
    iconWrap: "bg-gradient-to-br from-primary to-blue-500 shadow-[0_8px_20px_rgba(17,82,212,0.35)]",
    badge: "bg-primary/10 text-primary",
    titleHover: "group-hover:text-primary",
    cta: "text-primary",
    footBorder: "border-slate-200/60",
    arrowCircle: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white",
  },
  amber: {
    shell:
      "border-slate-200/80 bg-gradient-to-br from-white via-[#fffbf5] to-amber-50/70 hover:border-amber-400/40 hover:shadow-[0_24px_60px_rgba(234,88,12,0.14)] focus-visible:ring-amber-500",
    iconWrap: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_8px_20px_rgba(234,88,12,0.3)]",
    badge: "bg-amber-500/12 text-amber-900",
    titleHover: "group-hover:text-amber-800",
    cta: "text-amber-800",
    footBorder: "border-amber-200/50",
    arrowCircle: "bg-amber-500/10 text-amber-700 group-hover:bg-amber-600 group-hover:text-white",
  },
  violet: {
    shell:
      "border-slate-200/80 bg-gradient-to-br from-white via-[#f5f3ff] to-violet-50/80 hover:border-violet-400/45 hover:shadow-[0_24px_60px_rgba(109,40,217,0.14)] focus-visible:ring-violet-600",
    iconWrap: "bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_8px_20px_rgba(109,40,217,0.3)]",
    badge: "bg-violet-500/12 text-violet-900",
    titleHover: "group-hover:text-violet-800",
    cta: "text-violet-800",
    footBorder: "border-violet-200/50",
    arrowCircle: "bg-violet-500/10 text-violet-700 group-hover:bg-violet-600 group-hover:text-white",
  },
};

type CardDef = {
  to: string;
  badge: string;
  title: string;
  description: string;
  cta: string;
  variant: Variant;
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
  const { to, badge, title, description, cta, Icon } = card;
  const styles = VARIANT_STYLES[card.variant];

  return (
    <Link
      to={to}
      className={cn(
        "group relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[20px] border p-6 text-right shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-[320px] sm:p-8",
        styles.shell,
      )}
    >
      {/* אייקון ענק דקורטיבי ברקע הכרטיס */}
      <Icon
        className="pointer-events-none absolute -bottom-7 -left-7 size-36 text-[#111318] opacity-[0.04] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"
        aria-hidden
      />

      <div className="mb-5 flex items-start gap-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white transition-transform duration-300 group-hover:scale-105",
            styles.iconWrap,
          )}
        >
          <Icon className="size-7" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <span className={cn("inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold", styles.badge)}>
            {badge}
          </span>
          <h3 className={cn("text-lg font-black leading-snug text-[#111318] transition-colors sm:text-xl md:text-2xl", styles.titleHover)}>
            {title}
          </h3>
        </div>
      </div>

      <p className="mb-6 flex-1 text-[15px] leading-relaxed text-slate-600 sm:text-base">{description}</p>

      <div className={cn("flex items-center justify-between gap-3 border-t pt-4", styles.footBorder)}>
        <span className={cn("inline-flex items-center gap-1 text-sm font-bold transition-all group-hover:gap-2", styles.cta)}>
          {cta}
        </span>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
            styles.arrowCircle,
          )}
          aria-hidden
        >
          <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-0.5">
            arrow_back
          </span>
        </span>
      </div>
    </Link>
  );
}

/**
 * קרוסלת הדגשים לעמוד הבית — מובייל: כרטיס מלא + מגע; מסכים רחבים: שלושת הכרטיסים גלויים.
 */
export function HomeHighlightsCarousel() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-white via-[#f8fafc] to-white py-20 sm:py-24 lg:py-28"
      style={sectionFullBleedStyle}
    >
      {/* הילות צבע רכות + רשת קווים עדינה לרקע */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(17, 82, 212, 0.35), transparent 45%),
              radial-gradient(circle at 80% 70%, rgba(234, 88, 12, 0.2), transparent 42%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(17, 82, 212, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(17, 82, 212, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <header className="mb-12 text-center lg:mb-14">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
            ליווי, משקיעים ומכרזים
          </p>
          <h2 className="font-display text-3xl font-black tracking-tight text-[#111318] md:text-4xl lg:text-5xl">
            מהניתוח — לפעולה בשטח
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            ליווי אישי עד רכישה, לוחות נדל״ן למשקיעים ומכרזים חמים — כלים שמחברים בין ניתוח הנתונים לבין צעדים
            מעשיים בשוק.
          </p>
        </header>

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

          {/* חיצי הניווט מוסתרים במסכים רחבים — שלושת הכרטיסים כבר גלויים */}
          <div
            className="mt-8 flex items-center justify-center gap-4 lg:hidden"
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
