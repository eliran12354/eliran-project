import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Accessibility,
  Home,
  MapPin,
  FileText,
  Search,
  Settings,
  Building2,
  Hammer,
  AlertTriangle,
  FileSearch,
  LayoutDashboard,
  Flame,
  Warehouse,
  Mail,
  Minus,
  Plus,
  Contrast,
  ZapOff,
  X,
  Rows3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ContactDialog } from "@/components/ContactDialog";
import { AccessibilityStatementDialog } from "@/components/AccessibilityStatementDialog";
import { cn } from "@/lib/utils";

const LS_FONT = "a11y-font";
const LS_CONTRAST = "a11y-contrast";
const LS_MOTION = "a11y-motion";
const LS_LINE = "a11y-line";

const FONT_LEVELS = [0, 1, 2, 3] as const;
const FONT_LABELS: Record<(typeof FONT_LEVELS)[number], string> = {
  0: "רגיל",
  1: "בינוני",
  2: "גדול",
  3: "גדול מאוד",
};

const LINE_LEVELS = [0, 1, 2, 3] as const;
const LINE_LABELS: Record<(typeof LINE_LEVELS)[number], string> = {
  0: "רגיל",
  1: "מרווח בינוני",
  2: "מרווח גדול",
  3: "מרווח גדול מאוד",
};

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "עמוד ראשי", icon: Home },
  { to: "/govmap", label: 'מפת מידע נדל"ן GovMap', icon: MapPin },
  { to: "/listings?tab=rami", label: 'מכרזי רמ"י', icon: Hammer },
  { to: "/listings?tab=execution", label: "מכרזי הוצאה לפועל", icon: Hammer },
  { to: "/hot-areas", label: "אזורים חמים למעקב", icon: Flame },
  { to: "/urban-renewal", label: "מתחמי התחדשות עירונית", icon: Building2 },
  { to: "/plans", label: "תוכניות בנייה", icon: Search },
  { to: "/dangerous-buildings", label: "איתור מבנים מסוכנים", icon: AlertTriangle },
  { to: "/tabu-request", label: "הפקת נסח טאבו", icon: FileText },
  { to: "/land-check", label: "בדיקת קרקע מתקדמת", icon: FileSearch },
  { to: "/residential-inventory", label: "מלאי תכנוני למגורים", icon: Warehouse },
  { to: "/admin-dashboard", label: "דשבורד ניהול", icon: LayoutDashboard },
  { to: "/settings", label: "הגדרות", icon: Settings },
];

function applyHtmlPrefs(
  font: number,
  contrast: boolean,
  reduceMotion: boolean,
  line: number
) {
  const root = document.documentElement;
  root.setAttribute("data-a11y-font", String(font));
  root.setAttribute("data-a11y-line", String(line));
  if (contrast) root.setAttribute("data-a11y-contrast", "high");
  else root.removeAttribute("data-a11y-contrast");
  if (reduceMotion) root.setAttribute("data-a11y-motion", "reduce");
  else root.removeAttribute("data-a11y-motion");
}

function loadPrefsFromStorage(): {
  font: number;
  contrast: boolean;
  reduceMotion: boolean;
  line: number;
} {
  let font = Number.parseInt(localStorage.getItem(LS_FONT) ?? "0", 10);
  if (!FONT_LEVELS.includes(font as (typeof FONT_LEVELS)[number])) font = 0;
  let line = Number.parseInt(localStorage.getItem(LS_LINE) ?? "0", 10);
  if (!LINE_LEVELS.includes(line as (typeof LINE_LEVELS)[number])) line = 0;
  const contrast = localStorage.getItem(LS_CONTRAST) === "1";
  const reduceMotion = localStorage.getItem(LS_MOTION) === "1";
  return { font, contrast, reduceMotion, line };
}

export function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [fontLevel, setFontLevel] = useState(0);
  const [lineLevel, setLineLevel] = useState(0);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const { font, contrast, reduceMotion: rm, line } = loadPrefsFromStorage();
    setFontLevel(font);
    setLineLevel(line);
    setHighContrast(contrast);
    setReduceMotion(rm);
    applyHtmlPrefs(font, contrast, rm, line);
  }, []);

  const syncApply = useCallback(
    (font: number, contrast: boolean, motion: boolean, line: number) => {
      setFontLevel(font);
      setLineLevel(line);
      setHighContrast(contrast);
      setReduceMotion(motion);
      localStorage.setItem(LS_FONT, String(font));
      localStorage.setItem(LS_LINE, String(line));
      localStorage.setItem(LS_CONTRAST, contrast ? "1" : "0");
      localStorage.setItem(LS_MOTION, motion ? "1" : "0");
      applyHtmlPrefs(font, contrast, motion, line);
    },
    []
  );

  const setFont = (level: number) => {
    const clamped = Math.max(0, Math.min(3, level)) as 0 | 1 | 2 | 3;
    syncApply(clamped, highContrast, reduceMotion, lineLevel);
  };

  const setLine = (level: number) => {
    const clamped = Math.max(0, Math.min(3, level)) as 0 | 1 | 2 | 3;
    syncApply(fontLevel, highContrast, reduceMotion, clamped);
  };

  const setContrast = (v: boolean) => {
    syncApply(fontLevel, v, reduceMotion, lineLevel);
  };

  const setMotion = (v: boolean) => {
    syncApply(fontLevel, highContrast, v, lineLevel);
  };

  const isActivePath = (to: string) => {
    const [path, query] = to.split("?");
    if (location.pathname !== path) return false;
    if (!query) return true;
    const params = new URLSearchParams(query);
    const tab = params.get("tab");
    if (tab) {
      const cur = new URLSearchParams(location.search).get("tab");
      return cur === tab;
    }
    return true;
  };

  return (
    <>
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />

      <div className="fixed right-4 bottom-6 z-[45] flex flex-col items-end gap-2" dir="rtl">
        <Button
          type="button"
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg border border-border/80 bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen(true)}
          aria-label="פתיחת תפריט נגישות"
          title="נגישות"
        >
          <Accessibility className="h-6 w-6" aria-hidden />
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:max-w-md overflow-y-auto",
            "text-right [&>button]:left-4 [&>button]:right-auto [&>button]:top-4"
          )}
          dir="rtl"
        >
          <SheetHeader className="space-y-1 pr-8 text-right sm:text-right">
            <SheetTitle className="flex w-full items-center justify-start gap-2 text-xl">
              <Accessibility className="h-6 w-6 text-primary shrink-0" aria-hidden />
              נגישות
            </SheetTitle>
            <SheetDescription className="text-right">
              ניווט מהיר, התאמת תצוגה, מידע על נגישות ויצירת קשר
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-8 pb-4">
            <section aria-labelledby="a11y-skip-heading" className="rounded-lg border bg-muted/35 p-3 space-y-2">
              <h3 id="a11y-skip-heading" className="text-sm font-semibold text-foreground">
                דלג לתוכן (מקלדת)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">מה זה?</strong> קישור שמופיע בלחיצה על{" "}
                <kbd className="rounded border bg-background px-1.5 py-0.5 text-[0.7rem] font-mono">Tab</kbd>{" "}
                בראש העמוד — מדלג על התפריט ומגיע ישר לתוכן העיקרי של העמוד. מתאים למשתמשי מקלדת וקוראי מסך.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setOpen(false);
                  window.setTimeout(() => {
                    const el = document.getElementById("main-content");
                    el?.focus({ preventScroll: true });
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 0);
                }}
              >
                קפיצה לתוכן העיקרי עכשיו
              </Button>
            </section>

            <section aria-labelledby="a11y-nav-heading">
              <h3 id="a11y-nav-heading" className="text-sm font-semibold text-muted-foreground mb-3">
                ניווט מהיר
              </h3>
              <nav className="flex flex-col gap-1 max-h-[min(40vh,320px)] overflow-y-auto pr-1 -mr-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <Button
                    key={to}
                    variant={isActivePath(to) ? "secondary" : "ghost"}
                    className="w-full justify-end gap-3 h-auto py-3 px-3 font-normal"
                    asChild
                  >
                    <Link to={to} onClick={() => setOpen(false)}>
                      <span className="flex-1 text-right leading-snug">{label}</span>
                      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    </Link>
                  </Button>
                ))}
              </nav>
            </section>

            <Separator />

            <section aria-labelledby="a11y-display-heading">
              <h3 id="a11y-display-heading" className="text-sm font-semibold text-muted-foreground mb-3">
                תצוגה
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm mb-2">גודל טקסט (זכוכית מגדלת)</p>
                  <div className="flex items-center justify-between gap-2 flex-row-reverse">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={fontLevel <= 0}
                      onClick={() => setFont(fontLevel - 1)}
                      aria-label="הקטן טקסט"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium tabular-nums min-w-[5rem] text-center">
                      {FONT_LABELS[fontLevel as keyof typeof FONT_LABELS]}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={fontLevel >= 3}
                      onClick={() => setFont(fontLevel + 1)}
                      aria-label="הגדל טקסט"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm mb-2 flex items-center gap-2 justify-end flex-row-reverse">
                    <Rows3 className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                    מרווח שורות
                  </p>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                    מרחק בין שורות טקסט — עוזר לקרוא פסקאות ארוכות בלי שהשורות יידבקו.
                  </p>
                  <div className="flex items-center justify-between gap-2 flex-row-reverse">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={lineLevel <= 0}
                      onClick={() => setLine(lineLevel - 1)}
                      aria-label="הקטן מרווח שורות"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium tabular-nums min-w-[6.5rem] text-center">
                      {LINE_LABELS[lineLevel as keyof typeof LINE_LABELS]}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={lineLevel >= 3}
                      onClick={() => setLine(lineLevel + 1)}
                      aria-label="הגדל מרווח שורות"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-row-reverse">
                  <div className="flex items-center gap-2 min-w-0">
                    <Contrast className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-sm">ניגודיות גבוהה</span>
                  </div>
                  <Button
                    type="button"
                    variant={highContrast ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContrast(!highContrast)}
                    aria-pressed={highContrast}
                  >
                    {highContrast ? "פעיל" : "כבוי"}
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-3 flex-row-reverse">
                  <div className="flex items-center gap-2 min-w-0">
                    <ZapOff className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-sm">הפחתת תנועה</span>
                  </div>
                  <Button
                    type="button"
                    variant={reduceMotion ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMotion(!reduceMotion)}
                    aria-pressed={reduceMotion}
                  >
                    {reduceMotion ? "פעיל" : "כבוי"}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    syncApply(0, false, false, 0);
                  }}
                >
                  <X className="h-4 w-4 ml-1" />
                  איפוס הגדרות תצוגה
                </Button>
              </div>
            </section>

            <Separator />

            <section aria-labelledby="a11y-statement-heading" className="space-y-3">
              <h3 id="a11y-statement-heading" className="text-sm font-semibold text-muted-foreground">
                הצהרת נגישות
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">מה זה?</strong> מסמך שמסביר את מחויבות האתר לנגישות, אילו התאמות קיימות, ואיך לפנות אם משהו לא עובד עבורך.
              </p>
              <AccessibilityStatementDialog
                trigger={
                  <Button type="button" variant="outline" className="w-full gap-2 justify-center">
                    <FileText className="h-4 w-4" />
                    צפייה בהצהרה המלאה
                  </Button>
                }
              />
            </section>

            <Separator />

            <section aria-labelledby="a11y-contact-heading">
              <h3 id="a11y-contact-heading" className="text-sm font-semibold text-muted-foreground mb-3">
                צריך עזרה?
              </h3>
              <Button
                type="button"
                className="w-full justify-center gap-2"
                variant="default"
                onClick={() => {
                  setOpen(false);
                  setContactOpen(true);
                }}
              >
                <Mail className="h-4 w-4" />
                צור קשר
              </Button>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
