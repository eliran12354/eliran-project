import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  fetchHotInvestorBoardsPublic,
  type HotInvestorBoardCategory,
  type HotInvestorBoardListing,
} from "@/lib/api/hotInvestorBoardsApi";
import {
  HOT_INVESTOR_CATEGORY_INTROS,
  HOT_INVESTOR_CATEGORY_LABELS,
  HOT_INVESTOR_CATEGORY_ORDER,
  categoryBadgeClass,
} from "@/lib/hotInvestorBoards";
import { cn } from "@/lib/utils";
import { ExternalLink, Flame, Loader2, Mail, MapPin, Phone, Sparkles } from "lucide-react";

type FilterValue = "all" | HotInvestorBoardCategory;

export default function HotInvestorBoardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const categoryParam = searchParams.get("category") as HotInvestorBoardCategory | null;

  const initialFilter: FilterValue = useMemo(() => {
    if (
      categoryParam &&
      HOT_INVESTOR_CATEGORY_ORDER.includes(categoryParam as HotInvestorBoardCategory)
    ) {
      return categoryParam;
    }
    return "all";
  }, [categoryParam]);

  const [filter, setFilter] = useState<FilterValue>(initialFilter);
  const [listings, setListings] = useState<HotInvestorBoardListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const load = useCallback(async () => {
    setError(null);
    const cat = filter === "all" ? undefined : filter;
    const res = await fetchHotInvestorBoardsPublic(cat);
    if (res.success) {
      setListings(res.listings);
    } else {
      setListings([]);
      setError(res.error);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!highlightId || !listings?.length) return;
    const el = cardRefs.current[highlightId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, listings]);

  const onFilterChange = (next: FilterValue) => {
    setFilter(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === "all") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", next);
    }
    nextParams.delete("highlight");
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12 animate-fade-in">
      <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-orange-500/12 via-background to-blue-600/10 px-6 py-10 shadow-lg sm:px-10">
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-orange-500/40 bg-orange-500/10 text-orange-800 dark:text-orange-200"
            >
              <Flame className="ml-1 size-3.5" aria-hidden />
              למשקיעים
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3.5" aria-hidden />
              עודכן באופן שוטף
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            לוחות נדל״ן חמים למשקיעים
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            שלושה לוחות ממוקדים — סננו לפי סוג העסקה, צפו במודעות שפורסמו על ידי צוות האתר, וצרו קשר
            ישירות עם המפרסמים.
          </p>
        </div>
      </header>

      <section aria-labelledby="filter-heading" className="space-y-4">
        <h2 id="filter-heading" className="text-lg font-semibold">
          סינון לפי קטגוריה
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            className={filter === "all" ? "shadow-md" : ""}
            onClick={() => onFilterChange("all")}
          >
            הכל
          </Button>
          {HOT_INVESTOR_CATEGORY_ORDER.map((cat) => (
            <Button
              key={cat}
              type="button"
              variant={filter === cat ? "default" : "outline"}
              size="sm"
              className={filter === cat ? "shadow-md" : ""}
              onClick={() => onFilterChange(cat)}
            >
              {HOT_INVESTOR_CATEGORY_LABELS[cat]}
            </Button>
          ))}
        </div>

        {filter === "all" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {HOT_INVESTOR_CATEGORY_ORDER.map((cat) => (
              <Card
                key={cat}
                className="border-border/70 bg-muted/15 p-4 transition-colors hover:bg-muted/25"
              >
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {HOT_INVESTOR_CATEGORY_INTROS[cat].headline}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {HOT_INVESTOR_CATEGORY_INTROS[cat].body}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-muted/20 p-4 sm:p-5">
            <p className="text-sm font-medium text-foreground">
              {HOT_INVESTOR_CATEGORY_INTROS[filter].headline}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {HOT_INVESTOR_CATEGORY_INTROS[filter].body}
            </p>
          </Card>
        )}
      </section>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {listings === null && !error && (
        <div className="flex justify-center py-20">
          <Loader2 className="size-10 animate-spin text-primary" aria-label="טוען" />
        </div>
      )}

      {listings && listings.length === 0 && !error && (
        <Card className="border-dashed p-12 text-center">
          <p className="text-muted-foreground">אין מודעות פעילות בקטגוריה זו כרגע.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            חזרו בקרוב — או בחרו קטגוריה אחרת.
          </p>
        </Card>
      )}

      {listings && listings.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((item) => (
            <li
              key={item.id}
              ref={(el) => {
                cardRefs.current[item.id] = el;
              }}
            >
              <BoardListingCard listing={item} highlighted={highlightId === item.id} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-muted-foreground leading-relaxed max-w-2xl mx-auto">
        המידע מוצג כשירות לקהילה ואינו מהווה ייעוץ השקעות או תיווך. לפני כל עסקה יש לבדוק מול גורמים
        מוסמכים.
      </p>
    </div>
  );
}

function BoardListingCard({
  listing,
  highlighted,
}: {
  listing: HotInvestorBoardListing;
  highlighted?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl",
        highlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <div className="relative aspect-[16/10] w-full bg-muted">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Flame className="size-12 text-muted-foreground/40" aria-hidden />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <Badge variant="secondary" className={cn("shadow-sm", categoryBadgeClass(listing.category))}>
            {HOT_INVESTOR_CATEGORY_LABELS[listing.category]}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-semibold leading-snug">{listing.title}</h3>
          {listing.subtitle && (
            <p className="mt-1 text-sm font-medium text-primary/90">{listing.subtitle}</p>
          )}
        </div>
        {listing.description && (
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4 whitespace-pre-wrap">
            {listing.description}
          </p>
        )}
        <dl className="space-y-1.5 text-sm">
          {listing.price_label && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">מחיר</dt>
              <dd className="font-medium tabular-nums">{listing.price_label}</dd>
            </div>
          )}
          {listing.location_label && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <dd>{listing.location_label}</dd>
            </div>
          )}
        </dl>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {listing.contact_phone?.trim() && (
            <Button variant="secondary" size="sm" asChild>
              <a href={`tel:${listing.contact_phone.replace(/\s/g, "")}`} className="gap-1">
                <Phone className="size-3.5" aria-hidden />
                חיוג
              </a>
            </Button>
          )}
          {listing.contact_email?.trim() && (
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${listing.contact_email.trim()}`} className="gap-1">
                <Mail className="size-3.5" aria-hidden />
                אימייל
              </a>
            </Button>
          )}
          {listing.external_link?.trim() && (
            <Button variant="ghost" size="sm" asChild>
              <a
                href={listing.external_link.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                קישור
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
