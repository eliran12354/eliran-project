import type { HotInvestorBoardCategory } from "@/lib/api/hotInvestorBoardsApi";

export const HOT_INVESTOR_CATEGORY_ORDER: HotInvestorBoardCategory[] = [
  "pinui_binui",
  "up_to_1m",
  "land_thaw",
];

export const HOT_INVESTOR_CATEGORY_LABELS: Record<HotInvestorBoardCategory, string> = {
  pinui_binui: "דירות לפינוי־בינוי",
  up_to_1m: "נדל״ן עד מיליון ש״ח",
  land_thaw: "קרקעות בשלבי הפשרה",
};

/** טקסטי הסבר קבועים לפי דרישת המוצר */
export const HOT_INVESTOR_CATEGORY_INTROS: Record<
  HotInvestorBoardCategory,
  { headline: string; body: string }
> = {
  pinui_binui: {
    headline: "למכירה — דירות לפינוי־בינוי בלבד",
    body: "מאגר דירות למכירה להשקעה עם תוכנית פינוי־בינוי.",
  },
  up_to_1m: {
    headline: "נדל״ן למכירה עד מיליון ש״ח",
    body: "מאגר מיוחד למשקיעים בתחילת דרכם או להשקעות קטנות.",
  },
  land_thaw: {
    headline: "קרקעות למכירה בשלבי הפשרה",
    body: "מאגר עיסקאות חמות של קרקעות למשקיעים.",
  },
};

export function categoryBadgeClass(cat: HotInvestorBoardCategory): string {
  switch (cat) {
    case "pinui_binui":
      return "bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "up_to_1m":
      return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
    case "land_thaw":
      return "bg-amber-600/15 text-amber-900 dark:text-amber-200 border-amber-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}
