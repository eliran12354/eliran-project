import type { FeaturedProfessional } from "@/lib/api/featuredProfessionalsApi";

/** סוגי בעלי מקצוע נפוצים לסינון (התאמה חלקית בשדות השם, כותרת ותיאור). */
export const FEATURED_PROFESSION_CATEGORIES = [
  "עורך דין",
  "שמאי מקרקעין",
  "שמאי",
  "יועץ משכנתאות",
  "מתווך",
  "אדריכל",
  "מהנדס",
  "מפקח בנייה",
  "רואה חשבון",
  "מעצב פנים",
  "חשמלאי",
  "אינסטלטור",
  "קבלן",
] as const;

export const FEATURED_PROFESSION_CATEGORY_ALL = "__all__";

export type FeaturedProfessionalsFilterState = {
  category: string;
  area: string;
  query: string;
};

export const defaultFeaturedProfessionalsFilter: FeaturedProfessionalsFilterState = {
  category: FEATURED_PROFESSION_CATEGORY_ALL,
  area: "",
  query: "",
};

export function filterFeaturedProfessionals(
  list: FeaturedProfessional[],
  opts: Partial<FeaturedProfessionalsFilterState>,
): FeaturedProfessional[] {
  let out = [...list];

  const free = opts.query?.trim().toLowerCase();
  if (free) {
    out = out.filter((p) => {
      const hay = [p.name, p.headline, p.description, p.city].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(free);
    });
  }

  const area = opts.area?.trim().toLowerCase();
  if (area) {
    out = out.filter((p) => (p.city || "").toLowerCase().includes(area));
  }

  const cat = opts.category?.trim();
  if (cat && cat !== FEATURED_PROFESSION_CATEGORY_ALL) {
    const needle = cat.toLowerCase();
    out = out.filter((p) => {
      const hay = [p.name, p.headline, p.description].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }

  return out;
}
