import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ExternalLink,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchMavatPlanDetails,
  searchMavatPlans,
  type MavatPlan,
  type MavatPlanDetails,
} from "@/lib/api/mavatApi";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type LoadMode = "replace" | "append";

export default function MavatSearchPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<MavatPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MavatPlan | null>(null);
  const [details, setDetails] = useState<MavatPlanDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (q: string, targetPage: number, mode: LoadMode) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (mode === "replace") {
        setLoading(true);
        setResults([]);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const res = await searchMavatPlans(q, targetPage, PAGE_SIZE, controller.signal);

      if (controller.signal.aborted) return;

      if ("error" in res) {
        setError(res.error);
        setHasMore(false);
        if (mode === "replace") setResults([]);
      } else {
        setError(null);
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(res.page);
        setResults((prev) => (mode === "append" ? [...prev, ...res.results] : res.results));
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = input.trim();
    setQuery(trimmed);
    if (!trimmed) return;
    void runSearch(trimmed, 1, "replace");
  };

  const onLoadMore = () => {
    if (loading || loadingMore || !hasMore || !query) return;
    void runSearch(query, page + 1, "append");
  };

  const onClear = () => {
    abortRef.current?.abort();
    setInput("");
    setQuery("");
    setResults([]);
    setTotal(0);
    setHasMore(false);
    setError(null);
    setPage(1);
  };

  const openDetails = async (plan: MavatPlan) => {
    setSelected(plan);
    setDetails(null);
    setDetailsError(null);
    if (plan.id === null || plan.id === undefined) return;
    setDetailsLoading(true);
    const res = await fetchMavatPlanDetails(plan.id);
    setDetailsLoading(false);
    if ("details" in res) setDetails(res.details);
    else setDetailsError(res.error);
  };

  const closeDetails = () => {
    setSelected(null);
    setDetails(null);
    setDetailsError(null);
    setDetailsLoading(false);
  };

  const shownCount = results.length;
  /** רק אחרי לחיצה על "חיפוש" מעדכנים `query`, אז כאן לא מציגים "ריק" בזמן הקלדה */
  const emptyState =
    !loading &&
    !loadingMore &&
    !error &&
    query.trim().length > 0 &&
    results.length === 0;

  const totalLabel = useMemo(() => {
    if (!total || total < shownCount) return null;
    return `מציג ${shownCount} מתוך ${total}`;
  }, [shownCount, total]);

  return (
    <div className="w-full" dir="rtl">
      <div className="max-w-[1200px] mx-auto px-2 sm:px-6 py-6 sm:py-8">
        <nav className="flex items-center gap-2 mb-6">
          <Link
            className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors"
            to="/"
          >
            דף הבית
          </Link>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-foreground text-sm font-semibold">חיפוש תכנון</span>
        </nav>

        <header className="flex flex-col gap-2 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <Landmark className="size-7" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">
                חיפוש תכנון (מנהל התכנון)
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                חיפוש תוכניות במערכת Mavat של מנהל התכנון. החיפוש מתבצע לאחר לחיצה על כפתור החיפוש.
              </p>
            </div>
          </div>
        </header>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6"
          role="search"
          aria-label="חיפוש בתכנון"
        >
          <div className="relative flex-1">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-3 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="חפש לפי עיר / תוכנית"
              aria-label="חפש לפי עיר או תוכנית"
              className="pr-9 pl-9 h-11 text-base"
              autoFocus
            />
            {input && (
              <button
                type="button"
                onClick={onClear}
                className="absolute top-1/2 -translate-y-1/2 left-2 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="נקה חיפוש"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 gap-2"
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <SearchIcon className="size-4" aria-hidden />
            )}
            חיפוש
          </Button>
        </form>

        {totalLabel && (
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{totalLabel}</span>
          </div>
        )}

        {error && (
          <Card className="mb-4 border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </Card>
        )}

        {loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-10 animate-spin text-primary" aria-label="טוען" />
            <p className="text-sm text-muted-foreground">מחפש תוכניות…</p>
          </div>
        )}

        {emptyState && (
          <Card className="border-dashed p-10 text-center">
            <p className="text-muted-foreground">לא נמצאו תוצאות</p>
            <p className="mt-1 text-sm text-muted-foreground">
              נסו מילות חיפוש אחרות, לדוגמה: תל אביב, חיפה, תמ"א 38.
            </p>
          </Card>
        )}

        {results.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
            {results.map((plan, i) => (
              <li key={`${plan.id ?? plan.number ?? "plan"}-${i}`}>
                <PlanCard plan={plan} onOpen={() => void openDetails(plan)} />
              </li>
            ))}
          </ul>
        )}

        {hasMore && results.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="gap-2 min-w-48"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  טוען…
                </>
              ) : (
                <>עוד תוצאות</>
              )}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && closeDetails()}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {selected?.name || "פרטי תוכנית"}
            </DialogTitle>
            <DialogDescription className="text-right">
              מספר תוכנית: {selected?.number || "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <DetailRow label="מיקום" value={selected?.location} />
            <DetailRow label="גוף מאשר" value={selected?.authority} />
            <DetailRow label="סטטוס" value={selected?.status} />

            <div className="pt-2 border-t border-border/50">
              {detailsLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  טוען פרטים מלאים…
                </div>
              )}
              {detailsError && (
                <p className="text-destructive">{detailsError}</p>
              )}
              {details && (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground">
                    ניתן לעיין בתוכנית המלאה באתר מנהל התכנון:
                  </p>
                  <Button asChild variant="outline" className="gap-2 w-fit">
                    <a
                      href={details.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4" aria-hidden />
                      פתח באתר מנהל התכנון
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanCard({ plan, onOpen }: { plan: MavatPlan; onOpen: () => void }) {
  const canOpen = plan.id !== null && plan.id !== undefined;
  return (
    <Card
      className={cn(
        "flex h-full flex-col gap-3 p-4 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        canOpen && "cursor-pointer",
      )}
      role={canOpen ? "button" : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onClick={canOpen ? onOpen : undefined}
      onKeyDown={(e) => {
        if (!canOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug line-clamp-2">
            {plan.name || "תוכנית ללא שם"}
          </h3>
          {plan.number && (
            <p className="mt-1 text-xs font-medium text-primary/90 tabular-nums">
              מספר תוכנית: {plan.number}
            </p>
          )}
        </div>
        {plan.status && (
          <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
            {plan.status}
          </Badge>
        )}
      </div>

      <dl className="space-y-1.5 text-sm">
        {plan.location && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <dd className="min-w-0 break-words">{plan.location}</dd>
          </div>
        )}
        {plan.authority && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Building2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <dd className="min-w-0 break-words">{plan.authority}</dd>
          </div>
        )}
      </dl>

      {canOpen && (
        <div className="mt-auto pt-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <FileText className="size-3.5" aria-hidden />
            פרטים מלאים
          </span>
        </div>
      )}
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right break-words">{value || "—"}</dd>
    </div>
  );
}
