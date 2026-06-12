/**
 * חיפוש גוש וחלקה — מפת Leaflet שלנו + אותו מקור נתונים ש-GovMap/tabanet משתמשים בו בדפדפן
 * (autocomplete → entitiesByPoint עם x-trace-id / x-user-id).
 *
 * UX: תוך כדי החיפוש נפתח דיאלוג עם 4 שלבי טעינה אנימטיביים. בסיומו אותו
 * דיאלוג מתחלף לתצוגת תוצאות עם Accordion לכל אחד מארבעת מקורות הנתונים
 * (מבא״ת, התחדשות עירונית, מכרזי רמ״י, מלאי תכנוני למגורים).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON as LeafletGeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  Hammer,
  Layers,
  Loader2,
  MapPin,
  MapPinned,
  Search as SearchIcon,
  Sparkles,
  Warehouse,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  buildGovMapGushHelkaEmbedUrl,
  resolveGushHelkaForOwnMap,
  type GovMapLandUseEntry,
  type GovMapPointLayerEntry,
  type ResolveGushHelkaStep,
} from "@/lib/api/govmapApi";

import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const parcelGeoStyle: L.PathOptions = {
  color: "#059669",
  weight: 2,
  fillOpacity: 0.2,
  fillColor: "#10b981",
  opacity: 0.95,
};

function FitMapToParcel({ parcel }: { parcel: Feature<Polygon | MultiPolygon> | null }) {
  const map = useMap();
  useEffect(() => {
    if (!parcel) return;
    try {
      const box = turf.bbox(parcel);
      const bounds: L.LatLngBoundsExpression = [
        [box[1], box[0]],
        [box[3], box[2]],
      ];
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 18 });
    } catch {
      /* ignore invalid geometry */
    }
  }, [parcel, map]);
  return null;
}

type SuccessState = {
  kind: "success";
  gush: number;
  helka: number;
  label: string;
  parcel: Feature<Polygon | MultiPolygon>;
  fieldsForDisplay: { label: string; value: string }[];
  landUse: GovMapLandUseEntry[];
  urbanRenewal: GovMapPointLayerEntry[];
  ramiTenders: GovMapPointLayerEntry[];
  residentialInventory: GovMapPointLayerEntry[];
};

type SearchState =
  | { kind: "idle" }
  | {
      kind: "loading";
      gush: number;
      helka: number;
      step: ResolveGushHelkaStep;
      percent: number;
    }
  | { kind: "error"; message: string }
  | SuccessState;

const LOADING_STEPS: ReadonlyArray<{
  id: ResolveGushHelkaStep;
  label: string;
  description: string;
}> = [
  {
    id: "searching",
    label: "איתור החלקה",
    description: "מצליבים גוש וחלקה ברשימת ההשלמה האוטומטית",
  },
  {
    id: "geometry",
    label: "טעינת גבולות",
    description: "מורידים את הגיאומטריה והפרטים הרשומים של החלקה",
  },
  {
    id: "cross-reference",
    label: "הצלבת מאגרי תכנון",
    description: "שואלים את שכבות מבא״ת, התחדשות עירונית, רמ״י ומלאי תכנוני",
  },
  {
    id: "rendering",
    label: "סידור תוצאות",
    description: "מארגנים את הנתונים להצגה ברורה",
  },
];

function stepIndex(id: ResolveGushHelkaStep) {
  return LOADING_STEPS.findIndex((s) => s.id === id);
}

export default function GushHelkaSearchPage() {
  const [gush, setGush] = useState("");
  const [helka, setHelka] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  /** מאפשר למשתמש לסגור את הדיאלוג אחרי הצלחה מבלי לאפס את התוצאות מהמפה ברקע. */
  const [dialogOpen, setDialogOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const gushNum = parseInt(gush.trim(), 10);
      const helkaNum = parseInt(helka.trim(), 10);

      if (!Number.isFinite(gushNum) || gushNum <= 0) {
        setState({ kind: "error", message: "נא להזין מספר גוש תקין" });
        return;
      }
      if (!Number.isFinite(helkaNum) || helkaNum <= 0) {
        setState({ kind: "error", message: "נא להזין מספר חלקה תקין" });
        return;
      }

      setState({
        kind: "loading",
        gush: gushNum,
        helka: helkaNum,
        step: "searching",
        percent: 5,
      });
      setDialogOpen(true);

      void (async () => {
        try {
          const result = await resolveGushHelkaForOwnMap(
            gushNum,
            helkaNum,
            ac.signal,
            (progress) => {
              if (ac.signal.aborted) return;
              setState((prev) =>
                prev.kind === "loading"
                  ? { ...prev, step: progress.step, percent: progress.percent }
                  : prev,
              );
            },
          );

          if (ac.signal.aborted) return;

          if (result.ok === false) {
            setState({ kind: "error", message: result.error });
            setDialogOpen(false);
            return;
          }

          setState({
            kind: "success",
            gush: gushNum,
            helka: helkaNum,
            label: result.label,
            parcel: result.geojson,
            fieldsForDisplay: result.fieldsForDisplay,
            landUse: result.landUse,
            urbanRenewal: result.urbanRenewal,
            ramiTenders: result.ramiTenders,
            residentialInventory: result.residentialInventory,
          });
          setDialogOpen(true);
        } catch (err) {
          const er = err as Error;
          if (er.name === "AbortError") return;
          setState({
            kind: "error",
            message: er.message || "שגיאה לא צפויה",
          });
          setDialogOpen(false);
        }
      })();
    },
    [gush, helka],
  );

  const govMapFallbackUrl = useMemo(() => {
    const g = parseInt(gush.trim(), 10);
    const h = parseInt(helka.trim(), 10);
    if (!Number.isFinite(g) || !Number.isFinite(h) || g <= 0 || h <= 0) return null;
    return buildGovMapGushHelkaEmbedUrl(g, h);
  }, [gush, helka]);

  const onClear = () => {
    abortRef.current?.abort();
    setGush("");
    setHelka("");
    setState({ kind: "idle" });
    setDialogOpen(false);
  };

  const onDialogOpenChange = (open: boolean) => {
    if (!open && state.kind === "loading") {
      abortRef.current?.abort();
      setState({ kind: "idle" });
    }
    setDialogOpen(open);
  };

  const mapCenter: [number, number] = [32.0749, 34.7668];
  const parcelFeature = state.kind === "success" ? state.parcel : null;

  return (
    <div className="relative w-full min-h-full" dir="rtl">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-primary/8 via-primary/3 to-transparent"
        aria-hidden
      />
      <div className="pointer-events-none absolute top-20 left-8 size-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute top-40 right-12 size-56 rounded-full bg-teal-400/10 blur-3xl" aria-hidden />

      <div className="relative max-w-[1280px] mx-auto px-2 sm:px-6 py-6 sm:py-8">
        <nav className="flex items-center gap-2 mb-6 animate-slide-up">
          <Link
            className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors"
            to="/"
          >
            דף הבית
          </Link>
          <span className="text-muted-foreground/60 text-sm">/</span>
          <span className="text-foreground text-sm font-semibold">חיפוש לפי גוש וחלקה</span>
        </nav>

        <header className="flex flex-col gap-4 mb-8 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-lg animate-glow" aria-hidden />
                <div className="relative flex size-14 items-center justify-center rounded-2xl stats-gradient text-primary-foreground shadow-lg">
                  <MapPinned className="size-7" aria-hidden />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display text-foreground mb-1.5">
                  חיפוש לפי גוש וחלקה
                </h1>
                <p className="text-sm sm:text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
                  הזינו גוש וחלקה — וקבלו בתוך שניות את מה שלוקח לאחרים שעות לאסוף:
                  גבולות החלקה על מפה חיה, מוצלבים מ
                  <span className="font-semibold text-foreground">ארבעה מאגרים ממשלתיים</span>
                  {" "}לדוח תכנוני אחד וברור.
                </p>
                <ul className="flex flex-wrap items-center gap-2 mt-3.5" aria-label="מקורות המידע">
                  {[
                    { icon: Layers, label: "ייעודי קרקע ותב״ע", classes: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
                    { icon: Building2, label: "התחדשות עירונית", classes: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
                    { icon: Hammer, label: "מכרזי רמ״י", classes: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
                    { icon: Warehouse, label: "מלאי תכנוני למגורים", classes: "border-purple-500/25 bg-purple-500/10 text-purple-700 dark:text-purple-300" },
                  ].map(({ icon: Icon, label, classes }) => (
                    <li
                      key={label}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
                        "text-xs font-semibold whitespace-nowrap",
                        "transition-transform hover:-translate-y-0.5",
                        classes,
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </header>

        <SubscriptionGate>
        <Card className="card-gradient mb-6 overflow-hidden rounded-2xl border border-primary/10 shadow-medium animate-slide-up">
          <div className="h-1 w-full bg-gradient-to-l from-primary via-emerald-400 to-teal-500" aria-hidden />
          <form
            onSubmit={onSubmit}
            className="p-5 sm:p-6 flex flex-col gap-4"
            role="search"
            aria-label="חיפוש חלקה לפי גוש וחלקה"
          >
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex flex-1 flex-col sm:flex-row sm:items-end gap-3 sm:gap-2">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="gush" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    גוש
                  </Label>
                  <Input
                    id="gush"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={gush}
                    onChange={(e) => setGush(e.target.value)}
                    placeholder="6205"
                    className="h-12 text-lg tabular-nums rounded-xl border-primary/15 bg-background/80 focus-visible:ring-primary/40 shadow-sm"
                    dir="ltr"
                    autoFocus
                  />
                </div>
                <span
                  className="hidden sm:flex shrink-0 size-10 items-center justify-center rounded-full bg-muted text-muted-foreground font-light text-xl pb-0.5"
                  aria-hidden
                >
                  /
                </span>
                <div className="flex-1 min-w-0">
                  <Label htmlFor="helka" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    חלקה
                  </Label>
                  <Input
                    id="helka"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={helka}
                    onChange={(e) => setHelka(e.target.value)}
                    placeholder="581"
                    className="h-12 text-lg tabular-nums rounded-xl border-primary/15 bg-background/80 focus-visible:ring-primary/40 shadow-sm"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 flex-1 sm:flex-none gap-2 min-w-[9.5rem] rounded-xl bg-primary hover:bg-primary/90 shadow-soft hover:shadow-glow transition-all duration-300 hover-lift text-base font-semibold"
                  disabled={!gush.trim() || !helka.trim() || state.kind === "loading"}
                >
                  {state.kind === "loading" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <SearchIcon className="size-4" aria-hidden />
                  )}
                  הצג במפה
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl border-primary/20 hover:bg-primary/5"
                  onClick={onClear}
                  disabled={state.kind === "loading" || (!gush.trim() && !helka.trim() && state.kind === "idle")}
                >
                  נקה
                </Button>
              </div>
            </div>
            {state.kind === "success" && !dialogOpen && (
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto h-10 gap-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                onClick={() => setDialogOpen(true)}
              >
                <Sparkles className="size-4" aria-hidden />
                פתח דוח תכנוני
              </Button>
            )}
          </form>
        </Card>

        {state.kind === "error" && (
          <Card className="mb-4 rounded-2xl border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-start shadow-sm animate-slide-up">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-5 text-destructive" aria-hidden />
            </div>
            <div className="flex-1 text-sm text-destructive leading-relaxed">{state.message}</div>
            {govMapFallbackUrl && (
              <Button asChild variant="outline" size="sm" className="shrink-0 gap-2 rounded-xl border-destructive/30">
                <a href={govMapFallbackUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" aria-hidden />
                  מפה רשמית
                </a>
              </Button>
            )}
          </Card>
        )}

        <Card className="overflow-hidden p-0 h-[500px] lg:h-[640px] relative rounded-2xl border border-primary/10 shadow-large ring-1 ring-primary/5 animate-slide-up">
          <MapContainer
            center={mapCenter}
            zoom={13}
            className="h-full w-full z-0"
            zoomControl
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMapToParcel parcel={parcelFeature} />
            {parcelFeature && state.kind === "success" && (
              <LeafletGeoJSON
                key={`${state.label}-${state.gush}-${state.helka}`}
                data={parcelFeature}
                style={() => parcelGeoStyle}
              />
            )}
          </MapContainer>

          {state.kind === "idle" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-background/90 via-background/50 to-background/20 p-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary/70 animate-float">
                <MapPin className="size-8" aria-hidden />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground/80">המפה ממתינה לחיפוש</p>
                <p className="text-sm text-muted-foreground max-w-xs mt-1 leading-relaxed">
                  הזינו גוש וחלקה ולחצו &quot;הצג במפה&quot; — גבול החלקה ודוח התכנון ייטענו אוטומטית.
                </p>
              </div>
            </div>
          )}

          {state.kind === "success" && !dialogOpen && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Sparkles className="size-4" aria-hidden />
              צפה בדוח התכנוני
            </button>
          )}
        </Card>
        </SubscriptionGate>
      </div>

      <ResultsDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        state={state}
        govMapFallbackUrl={govMapFallbackUrl}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog: loading + results
// ---------------------------------------------------------------------------

function DialogBackdrop() {
  return (
    <>
      <div className="pointer-events-none absolute -top-32 -right-20 size-80 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute top-1/2 -left-24 size-64 rounded-full bg-teal-400/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-1/4 size-48 rounded-full bg-blue-400/10 blur-3xl" aria-hidden />
    </>
  );
}

/** z-index מעל Leaflet (~1000) ומעל רכיבי הממשק */
const DIALOG_LAYER = "z-[10050]";

function ResultsDialog({
  open,
  onOpenChange,
  state,
  govMapFallbackUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: SearchState;
  govMapFallbackUrl: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogPortal>
        <DialogOverlay
          className={cn(
            DIALOG_LAYER,
            "fixed inset-0 bg-black/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          dir="rtl"
          aria-describedby={undefined}
          className={cn(
            DIALOG_LAYER,
            "fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-4xl",
            "max-h-[min(92vh,820px)] -translate-x-1/2 -translate-y-1/2",
            "grid gap-0 overflow-hidden p-0 outline-none",
            "rounded-2xl border border-primary/15 bg-card shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:duration-200 data-[state=open]:duration-200",
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Close
            type="button"
            className={cn(
              "absolute left-4 top-4 z-20 rounded-lg p-1.5 opacity-70",
              "ring-offset-background transition-opacity hover:bg-muted hover:opacity-100",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            )}
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">סגור</span>
          </DialogPrimitive.Close>
          <DialogBackdrop />
          <div className="relative z-10 flex max-h-[min(92vh,820px)] flex-col overflow-hidden">
            {state.kind === "loading" && <LoadingPanel state={state} />}
            {state.kind === "success" && (
              <ResultsPanel state={state} govMapFallbackUrl={govMapFallbackUrl} />
            )}
            {state.kind !== "loading" && state.kind !== "success" && (
              <div className="p-8 text-sm text-muted-foreground">אין תוצאות להצגה.</div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Loading panel
// ---------------------------------------------------------------------------

function LoadingPanel({
  state,
}: {
  state: Extract<SearchState, { kind: "loading" }>;
}) {
  const activeIndex = stepIndex(state.step);

  return (
    <>
      <div className="h-1.5 w-full bg-gradient-to-l from-primary via-emerald-400 to-teal-400" aria-hidden />

      <DialogHeader className="px-6 sm:px-8 pt-7 pb-4 text-right">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-xl animate-pulse" aria-hidden />
            <div className="relative flex size-14 items-center justify-center rounded-2xl stats-gradient text-primary-foreground shadow-glow">
              <Loader2 className="size-7 animate-spin" aria-hidden />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-xl sm:text-2xl font-bold font-display tracking-tight">
              סורקים גוש{" "}
              <span className="tabular-nums text-primary">{state.gush.toLocaleString("he-IL")}</span>
              {" · "}
              חלקה{" "}
              <span className="tabular-nums text-primary">{state.helka.toLocaleString("he-IL")}</span>
            </DialogTitle>
            <DialogDescription className="text-sm mt-1.5 leading-relaxed">
              מצליבים ארבעה מאגרי תכנון — זה לוקח מספר שניות
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="px-6 sm:px-8 pb-2">
        <div className="rounded-2xl bg-muted/40 p-4 border border-primary/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              התקדמות
            </span>
            <span className="text-lg font-bold tabular-nums text-primary">{state.percent}%</span>
          </div>
          <Progress
            value={state.percent}
            className="h-3 rounded-full bg-primary/10 overflow-hidden [&>div]:rounded-full [&>div]:bg-gradient-to-l [&>div]:from-teal-500 [&>div]:via-primary [&>div]:to-emerald-400 [&>div]:transition-all [&>div]:duration-500"
          />
          <p className="mt-2 text-xs font-medium text-primary/90">
            {LOADING_STEPS[activeIndex]?.label ?? ""}
          </p>
        </div>
      </div>

      <ol className="relative px-6 sm:px-8 pb-8 pt-2 space-y-0">
        <div
          className="absolute top-6 bottom-8 right-[2.65rem] w-0.5 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent rounded-full"
          aria-hidden
        />
        {LOADING_STEPS.map((s, i) => {
          const status: "done" | "active" | "pending" =
            i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <li
              key={s.id}
              className={cn(
                "relative flex items-start gap-4 rounded-2xl p-4 transition-all duration-500",
                status === "done" && "opacity-90",
                status === "active" && "bg-primary/5 shadow-soft scale-[1.01]",
                status === "pending" && "opacity-45",
              )}
            >
              <span
                className={cn(
                  "relative z-[1] shrink-0 flex size-9 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300",
                  status === "done" && "bg-primary text-primary-foreground shadow-sm",
                  status === "active" && "stats-gradient text-primary-foreground shadow-glow",
                  status === "pending" && "bg-muted border border-border text-muted-foreground",
                )}
              >
                {status === "done" ? (
                  <Check className="size-4" aria-hidden />
                ) : status === "active" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <span className="tabular-nums text-xs">{i + 1}</span>
                )}
                {status === "active" && (
                  <span className="absolute -inset-1 rounded-xl ring-2 ring-primary/30 animate-pulse" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-bold",
                    status === "active" && "text-primary",
                    status === "done" && "text-foreground",
                    status === "pending" && "text-muted-foreground",
                  )}
                >
                  {s.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

// ---------------------------------------------------------------------------
// Results panel
// ---------------------------------------------------------------------------

type AccentName = "emerald" | "blue" | "amber" | "purple";

const ACCENT_CLASSES: Record<
  AccentName,
  {
    statCard: string;
    statIcon: string;
    iconBg: string;
    iconText: string;
    triggerHover: string;
    openBg: string;
    openBorder: string;
    countBg: string;
    countText: string;
    entryBorder: string;
    shortLabel: string;
  }
> = {
  emerald: {
    statCard: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5",
    statIcon: "text-emerald-600",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25 shadow-md",
    iconText: "text-white",
    triggerHover: "hover:bg-emerald-500/5",
    openBg: "data-[state=open]:bg-gradient-to-l data-[state=open]:from-emerald-500/8 data-[state=open]:to-transparent",
    openBorder: "data-[state=open]:border-s-4 data-[state=open]:border-s-emerald-500",
    countBg: "bg-emerald-500/15",
    countText: "text-emerald-700 dark:text-emerald-300",
    entryBorder: "border-emerald-500/15 hover:border-emerald-500/30",
    shortLabel: "מבא״ת",
  },
  blue: {
    statCard: "border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/5",
    statIcon: "text-blue-600",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25 shadow-md",
    iconText: "text-white",
    triggerHover: "hover:bg-blue-500/5",
    openBg: "data-[state=open]:bg-gradient-to-l data-[state=open]:from-blue-500/8 data-[state=open]:to-transparent",
    openBorder: "data-[state=open]:border-s-4 data-[state=open]:border-s-blue-500",
    countBg: "bg-blue-500/15",
    countText: "text-blue-700 dark:text-blue-300",
    entryBorder: "border-blue-500/15 hover:border-blue-500/30",
    shortLabel: "התחדשות",
  },
  amber: {
    statCard: "border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5",
    statIcon: "text-amber-600",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25 shadow-md",
    iconText: "text-white",
    triggerHover: "hover:bg-amber-500/5",
    openBg: "data-[state=open]:bg-gradient-to-l data-[state=open]:from-amber-500/8 data-[state=open]:to-transparent",
    openBorder: "data-[state=open]:border-s-4 data-[state=open]:border-s-amber-500",
    countBg: "bg-amber-500/15",
    countText: "text-amber-700 dark:text-amber-300",
    entryBorder: "border-amber-500/15 hover:border-amber-500/30",
    shortLabel: "רמ״י",
  },
  purple: {
    statCard: "border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5",
    statIcon: "text-purple-600",
    iconBg: "bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-purple-500/25 shadow-md",
    iconText: "text-white",
    triggerHover: "hover:bg-purple-500/5",
    openBg: "data-[state=open]:bg-gradient-to-l data-[state=open]:from-purple-500/8 data-[state=open]:to-transparent",
    openBorder: "data-[state=open]:border-s-4 data-[state=open]:border-s-purple-500",
    countBg: "bg-purple-500/15",
    countText: "text-purple-700 dark:text-purple-300",
    entryBorder: "border-purple-500/15 hover:border-purple-500/30",
    shortLabel: "מלאי",
  },
};

type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>;

type Topic = {
  id: string;
  icon: LucideIcon;
  accent: AccentName;
  label: string;
  layerBadge: string;
  emptyMessage: string;
  fallbackTitle: string;
  entries: GovMapPointLayerEntry[];
};

function ResultsPanel({
  state,
  govMapFallbackUrl,
}: {
  state: SuccessState;
  govMapFallbackUrl: string | null;
}) {
  const topics: Topic[] = useMemo(
    () => [
      {
        id: "mavat",
        icon: Layers,
        accent: "emerald",
        label: "יעודי קרקע — מבא״ת",
        layerBadge: "שכבה 14",
        emptyMessage: "לא נמצאו רישומי מבא״ת בנקודה זו.",
        fallbackTitle: "ייעוד ללא שם",
        entries: state.landUse.map((e) => ({
          objectId: e.objectId,
          title: e.title,
          subtitle: e.planNumber,
          fieldsForDisplay: e.fieldsForDisplay,
        })),
      },
      {
        id: "urbanRenewal",
        icon: Building2,
        accent: "blue",
        label: "התחדשות עירונית",
        layerBadge: "שכבה 200720",
        emptyMessage: "אין מתחמי התחדשות עירונית בנקודה זו.",
        fallbackTitle: "מתחם ללא שם",
        entries: state.urbanRenewal,
      },
      {
        id: "ramiTenders",
        icon: Hammer,
        accent: "amber",
        label: "מכרזי מקרקעין — רמ״י",
        layerBadge: "שכבה 363",
        emptyMessage: "אין מכרזי רמ״י פעילים בנקודה זו.",
        fallbackTitle: "מכרז ללא שם",
        entries: state.ramiTenders,
      },
      {
        id: "residentialInventory",
        icon: Warehouse,
        accent: "purple",
        label: "מלאי תכנוני למגורים",
        layerBadge: "שכבה 340",
        emptyMessage: "אין רישום של מלאי תכנוני למגורים בנקודה זו.",
        fallbackTitle: "תוכנית ללא שם",
        entries: state.residentialInventory,
      },
    ],
    [state.landUse, state.urbanRenewal, state.ramiTenders, state.residentialInventory],
  );

  /** פותחים אוטומטית את הנושא הראשון שיש בו נתונים. */
  const defaultOpen = useMemo(
    () => topics.find((t) => t.entries.length > 0)?.id ?? topics[0].id,
    [topics],
  );

  const totalItems = topics.reduce((acc, t) => acc + t.entries.length, 0);

  return (
    <>
      <div className="h-1.5 w-full bg-gradient-to-l from-primary via-emerald-400 to-teal-400" aria-hidden />

      <DialogHeader className="relative px-6 sm:px-8 pt-7 pb-5 text-right border-b border-primary/10 bg-gradient-to-l from-primary/10 via-transparent to-transparent">
        <div className="flex items-start gap-4">
          <div className="shrink-0 relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/35 blur-xl" aria-hidden />
            <div className="relative flex size-14 items-center justify-center rounded-2xl stats-gradient text-primary-foreground shadow-glow ring-2 ring-background/80">
              <CheckCircle2 className="size-7" aria-hidden />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-xl sm:text-2xl font-bold font-display tracking-tight leading-snug">
              {state.label}
            </DialogTitle>
            <DialogDescription className="text-sm mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span>
                גוש{" "}
                <span className="font-bold text-foreground tabular-nums">{state.gush.toLocaleString("he-IL")}</span>
              </span>
              <span className="text-muted-foreground/50" aria-hidden>
                |
              </span>
              <span>
                חלקה{" "}
                <span className="font-bold text-foreground tabular-nums">{state.helka.toLocaleString("he-IL")}</span>
              </span>
              <span className="text-muted-foreground/50" aria-hidden>
                |
              </span>
              <span className="text-primary font-semibold">{totalItems} פריטים</span>
            </DialogDescription>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
          {topics.map((topic) => {
            const accent = ACCENT_CLASSES[topic.accent];
            const Icon = topic.icon;
            return (
              <div
                key={topic.id}
                className={cn(
                  "rounded-xl border p-3 transition-transform hover:scale-[1.02]",
                  accent.statCard,
                  topic.entries.length === 0 && "opacity-50",
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <Icon className={cn("size-4", accent.statIcon)} aria-hidden />
                  <span className={cn("text-xl font-black tabular-nums", accent.countText)}>
                    {topic.entries.length}
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground leading-tight">
                  {accent.shortLabel}
                </p>
              </div>
            );
          })}
        </div>
      </DialogHeader>

      <div className="max-h-[min(68vh,560px)] overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
        {state.fieldsForDisplay.length > 0 && (
          <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-background to-primary/5 p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="size-4" aria-hidden />
              </div>
              <h3 className="text-sm font-bold text-foreground">פרטי חלקה</h3>
            </div>
            <dl className="grid gap-2.5 sm:grid-cols-2">
              {state.fieldsForDisplay.map((row) => (
                <div
                  key={row.label}
                  className="group flex flex-col gap-1 rounded-xl border border-border/50 bg-card/80 px-3.5 py-2.5 transition-colors hover:border-primary/25 hover:bg-primary/5"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="text-sm font-semibold text-foreground break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-0.5">
            מאגרי תכנון — לחצו לפרטים
          </h3>
          <Accordion type="single" defaultValue={defaultOpen} collapsible className="space-y-2.5">
            {topics.map((topic) => (
              <TopicAccordionItem key={topic.id} topic={topic} />
            ))}
          </Accordion>
        </div>
      </div>

      {govMapFallbackUrl && (
        <div className="border-t border-primary/10 bg-muted/40 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
            לתצוגת מפה אינטראקטיבית מלאה — פתחו את הקישור הרשמי.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 shrink-0 rounded-xl border-primary/25 hover:bg-primary/5 hover:text-primary"
          >
            <a href={govMapFallbackUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              פתח במפה הרשמית
            </a>
          </Button>
        </div>
      )}
    </>
  );
}

function TopicAccordionItem({ topic }: { topic: Topic }) {
  const accent = ACCENT_CLASSES[topic.accent];
  const Icon = topic.icon;
  const isEmpty = topic.entries.length === 0;

  return (
    <AccordionItem
      value={topic.id}
      className={cn(
        "rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-300",
        "hover:shadow-soft data-[state=open]:shadow-medium",
        accent.openBorder,
        accent.openBg,
      )}
    >
      <AccordionTrigger
        className={cn(
          "px-4 sm:px-5 py-4 hover:no-underline font-normal group",
          accent.triggerHover,
          "[&>svg]:text-muted-foreground [&>svg]:size-5 [&>svg]:transition-transform",
        )}
      >
        <div className="flex flex-1 items-center gap-3.5 text-right pe-2">
          <div
            className={cn(
              "shrink-0 flex size-11 items-center justify-center rounded-xl",
              accent.iconBg,
              accent.iconText,
            )}
          >
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-foreground">{topic.label}</span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono px-2 py-0 h-5 border-border/50 bg-background/60"
              >
                {topic.layerBadge}
              </Badge>
            </div>
            <p
              className={cn(
                "text-xs mt-1 leading-relaxed",
                isEmpty ? "text-muted-foreground" : accent.countText,
              )}
            >
              {isEmpty
                ? topic.emptyMessage
                : topic.entries.length === 1
                  ? "פריט אחד נמצא בנקודה"
                  : `${topic.entries.length} פריטים נמצאו בנקודה`}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-sm font-black tabular-nums shadow-sm",
              isEmpty ? "bg-muted text-muted-foreground" : cn(accent.countBg, accent.countText),
            )}
          >
            {topic.entries.length}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 sm:px-5 pb-5 pt-0">
        {isEmpty ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-6 text-center">
            <Icon className={cn("size-8 mx-auto mb-2 opacity-30", accent.statIcon)} aria-hidden />
            <p className="text-sm text-muted-foreground">{topic.emptyMessage}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {topic.entries.map((entry, idx) => (
              <li
                key={`${entry.objectId}-${idx}`}
                className={cn(
                  "rounded-xl border bg-background/60 p-4 transition-all duration-200",
                  "hover:shadow-soft hover:-translate-y-0.5",
                  accent.entryBorder,
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-bold text-foreground leading-snug">
                    {entry.title ?? topic.fallbackTitle}
                  </p>
                  {entry.subtitle && (
                    <Badge
                      variant="secondary"
                      className={cn("font-mono text-[10px] shrink-0", accent.countBg, accent.countText)}
                    >
                      {entry.subtitle}
                    </Badge>
                  )}
                </div>
                {entry.fieldsForDisplay.length > 0 && (
                  <dl className="divide-y divide-border/40 rounded-lg overflow-hidden border border-border/30">
                    {entry.fieldsForDisplay.map((row) => (
                      <div
                        key={row.label}
                        className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4 px-3 py-2 bg-muted/20 even:bg-muted/35"
                      >
                        <dt className="text-[11px] font-medium text-muted-foreground shrink-0">
                          {row.label}
                        </dt>
                        <dd className="text-xs font-semibold text-foreground text-end sm:text-start break-words">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
