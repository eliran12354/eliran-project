import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FEATURED_PROFESSION_CATEGORIES,
  FEATURED_PROFESSION_CATEGORY_ALL,
  type FeaturedProfessionalsFilterState,
} from "@/lib/featuredProfessionalsFilter";
import { Search } from "lucide-react";

type Props = {
  value: FeaturedProfessionalsFilterState;
  onChange: (next: FeaturedProfessionalsFilterState) => void;
  /** ערכי עיר מהנתונים — להשלמה מהירה בסינון אזור */
  citySuggestions?: string[];
  /** מזהה ייחודי לשדות (כשיש כמה ברים בעמוד) */
  idPrefix?: string;
  compact?: boolean;
};

export function FeaturedProfessionalsFilterBar({
  value,
  onChange,
  citySuggestions = [],
  idPrefix = "fp-filter",
  compact = false,
}: Props) {
  const set = (patch: Partial<FeaturedProfessionalsFilterState>) =>
    onChange({ ...value, ...patch });

  const uniqueCities = [...new Set(citySuggestions.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "he"),
  );

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-4 rounded-xl border border-slate-200/90 bg-white/90 p-4 shadow-sm md:flex-row md:flex-wrap md:items-end"
          : "mb-10 grid gap-5 rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-4"
      }
    >
      <div className={compact ? "min-w-0 flex-1 md:min-w-[200px]" : "space-y-2"}>
        <Label htmlFor={`${idPrefix}-query`} className="text-slate-700">
          חיפוש
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id={`${idPrefix}-query`}
            type="search"
            dir="rtl"
            placeholder="שם, תיאור, עיר..."
            className="pr-10"
            value={value.query}
            onChange={(e) => set({ query: e.target.value })}
            autoComplete="off"
          />
        </div>
      </div>

      <div className={compact ? "min-w-0 flex-1 md:min-w-[180px]" : "space-y-2"}>
        <Label htmlFor={`${idPrefix}-category`} className="text-slate-700">
          סוג בעל מקצוע
        </Label>
        <Select value={value.category} onValueChange={(v) => set({ category: v })}>
          <SelectTrigger id={`${idPrefix}-category`} className="text-right">
            <SelectValue placeholder="הכל" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value={FEATURED_PROFESSION_CATEGORY_ALL}>כל הסוגים</SelectItem>
            {FEATURED_PROFESSION_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={compact ? "min-w-0 flex-1 md:min-w-[180px]" : "space-y-2 md:col-span-2 lg:col-span-1"}>
        <Label htmlFor={`${idPrefix}-area`} className="text-slate-700">
          אזור / עיר
        </Label>
        <Input
          id={`${idPrefix}-area`}
          dir="rtl"
          placeholder="למשל: תל אביב, חיפה..."
          value={value.area}
          onChange={(e) => set({ area: e.target.value })}
          list={uniqueCities.length ? `${idPrefix}-cities` : undefined}
          autoComplete="off"
        />
        {uniqueCities.length > 0 && (
          <datalist id={`${idPrefix}-cities`}>
            {uniqueCities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        )}
      </div>
    </div>
  );
}
