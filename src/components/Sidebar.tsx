import {
  AlertTriangle,
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  FileSearch,
  FileText,
  Flame,
  Hammer,
  HeartHandshake,
  Home,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  ScrollText,
  Search,
  Settings,
  User,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginDialog } from "@/components/LoginDialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsLgUp } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface NavLink {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  adminOnly?: boolean;
  /** ברירת מחדל: התאמה מדויקת ל-pathname */
  isActive?: (pathname: string, tab: string | null) => boolean;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  badge?: string;
  children: NavLink[];
}

type NavEntry = NavLink | NavGroup;

interface NavSection {
  label: string;
  entries: NavEntry[];
}

const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

const navSections: NavSection[] = [
  {
    label: "ראשי",
    entries: [
      { to: "/", label: "עמוד ראשי", icon: Home },
      { to: "/professionals", label: "בעלי מקצוע מומלצים", icon: Briefcase },
      {
        to: "/personal-accompaniment",
        label: "ליווי אישי עד קנייה",
        icon: HeartHandshake,
        isActive: (pathname) => pathname.startsWith("/personal-accompaniment"),
      },
      { to: "/govmap", label: "מפת מידע נדל״ן GovMap", icon: MapPin },
    ],
  },
  {
    label: "חיפוש ומכרזים",
    entries: [
      { to: "/gush-helka-search", label: "חיפוש לפי גוש וחלקה", icon: MapPinned },
      {
        label: "מכרזים חמים",
        icon: FileText,
        badge: "חדש",
        children: [
          {
            to: "/listings?tab=rami",
            label: "מכרזי רמ״י",
            icon: Hammer,
            isActive: (pathname, tab) => pathname === "/listings" && tab !== "execution",
          },
          {
            to: "/listings?tab=execution",
            label: "מכרזי הוצאה לפועל",
            icon: Hammer,
            isActive: (pathname, tab) => pathname === "/listings" && tab === "execution",
          },
        ],
      },
      { to: "/tender-analysis", label: "ניתוח חוזים חכם", icon: ScrollText },
      { to: "/hot-areas", label: "אזורים חמים למעקב", icon: Flame },
    ],
  },
  {
    label: "השקעות ותכנון",
    entries: [
      { to: "/hot-investor-boards", label: "לוחות נדל״ן חמים למשקיעים", icon: LayoutGrid },
      { to: "/urban-renewal", label: "מתחמי התחדשות עירונית", icon: Building2 },
      { to: "/plans", label: "תוכניות בנייה", icon: Search },
      { to: "/mavat-search", label: "חיפוש תכנון (מנהל התכנון)", icon: Landmark },
      { to: "/dangerous-buildings", label: "איתור מבנים מסוכנים", icon: AlertTriangle },
    ],
  },
  {
    label: "מסמכים ובדיקות",
    entries: [
      { to: "/tabu-request", label: "הפקת נסח טאבו", icon: FileText },
      { to: "/land-check", label: "בדיקת קרקע מתקדמת", icon: FileSearch },
      { to: "/residential-inventory", label: "מלאי תכנוני למגורים", icon: Warehouse },
      { to: "/tax", label: "מחשבון מס רכישה", icon: Calculator },
    ],
  },
  {
    label: "ניהול וחשבון",
    entries: [
      { to: "/admin-dashboard", label: "דשבורד ניהול", icon: LayoutDashboard, adminOnly: true },
      { to: "/settings", label: "הגדרות", icon: Settings },
    ],
  },
];

function NavBadge({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] font-semibold text-primary">
      {children}
    </span>
  );
}

function NavItemLink({
  item,
  active,
  nested = false,
}: {
  item: NavLink;
  active: boolean;
  nested?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm leading-snug transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        nested && "py-1.5",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "font-medium text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-[1.125rem] shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className="min-w-0 flex-1 break-words text-right">{item.label}</span>
      {item.badge && <NavBadge>{item.badge}</NavBadge>}
    </Link>
  );
}

function NavGroupItem({
  group,
  open,
  onToggle,
  isItemActive,
}: {
  group: NavGroup;
  open: boolean;
  onToggle: () => void;
  isItemActive: (item: NavLink) => boolean;
}) {
  const Icon = group.icon;
  const childActive = group.children.some(isItemActive);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium leading-snug transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          childActive
            ? "font-semibold text-primary"
            : "text-foreground/80 hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "size-[1.125rem] shrink-0 transition-colors",
            childActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span className="min-w-0 flex-1 break-words text-right">{group.label}</span>
        {group.badge && <NavBadge>{group.badge}</NavBadge>}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="mt-1 space-y-0.5 border-r border-border pr-3.5 mr-[1.375rem]">
          {group.children.map((child) => (
            <NavItemLink key={child.to} item={child} active={isItemActive(child)} nested />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarHeader({
  user,
  profile,
  logout,
  setLoginDialogOpen,
  showNotificationBell,
}: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  logout: () => void;
  setLoginDialogOpen: (v: boolean) => void;
  showNotificationBell: boolean;
}) {
  const email = profile?.email || user?.email || "";
  const avatarInitial = email.charAt(0).toUpperCase() || "?";

  return (
    <div className="border-b border-border px-4 pb-4 pt-5">
      <Link to="/" className="group flex items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary shadow-soft transition-shadow duration-200 group-hover:shadow-medium">
          <Home className="size-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground">נדל״ן חכם</span>
      </Link>
      <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
        מערכת אינטרנטית חכמה למכרזים, נכסים והשקעות נדל״ן
      </p>

      <div className="mt-3.5">
        {user ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {avatarInitial}
            </div>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground" title={email}>
              {email}
            </span>
            {showNotificationBell && <NotificationBell />}
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              title="התנתק"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button onClick={() => setLoginDialogOpen(true)} className="h-9 w-full gap-2 text-sm">
            <User className="size-4 shrink-0" />
            התחבר
          </Button>
        )}
      </div>
    </div>
  );
}

function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const location = useLocation();
  const currentTab = useMemo(
    () => new URLSearchParams(location.search).get("tab"),
    [location.search],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isItemActive = (item: NavLink) =>
    item.isActive ? item.isActive(location.pathname, currentTab) : location.pathname === item.to;

  const isGroupOpen = (group: NavGroup) =>
    openGroups[group.label] ?? group.children.some(isItemActive);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="ניווט ראשי">
      {navSections.map((section, sectionIndex) => {
        const entries = section.entries.filter((entry) => isGroup(entry) || !entry.adminOnly || isAdmin);
        if (entries.length === 0) return null;

        return (
          <div key={section.label}>
            {sectionIndex > 0 && <div className="mx-2 my-2.5 h-px bg-border" />}
            <p className="mb-1.5 px-3 pt-1 text-[0.625rem] font-semibold tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {entries.map((entry) =>
                isGroup(entry) ? (
                  <NavGroupItem
                    key={entry.label}
                    group={entry}
                    open={isGroupOpen(entry)}
                    onToggle={() =>
                      setOpenGroups((prev) => ({ ...prev, [entry.label]: !isGroupOpen(entry) }))
                    }
                    isItemActive={isItemActive}
                  />
                ) : (
                  <NavItemLink key={entry.to} item={entry} active={isItemActive(entry)} />
                ),
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  showNotificationBell,
  className,
}: {
  showNotificationBell: boolean;
  className?: string;
}) {
  const { user, profile, logout, isAdmin } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)} dir="rtl">
      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
      <SidebarHeader
        user={user}
        profile={profile}
        logout={logout}
        setLoginDialogOpen={setLoginDialogOpen}
        showNotificationBell={showNotificationBell}
      />
      <SidebarNav isAdmin={isAdmin} />
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isLgUp = useIsLgUp();
  /** עמוד הבית: תמיד מסך מלא בלי סרגל צד קבוע (כמו landing) */
  const showCompactHeader = !isLgUp || isHome;
  const showDesktopAside = isLgUp && !isHome;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  return (
    <>
      {showCompactHeader && (
        <>
          <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-card px-4 shadow-soft">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="פתח תפריט ניווט"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <Link to="/" className="min-w-0 flex-1 truncate text-center text-lg font-bold text-primary">
              נדל״ן חכם
            </Link>
            <div className="flex w-10 shrink-0 justify-end">
              {user ? <NotificationBell /> : <span className="inline-block w-10" aria-hidden />}
            </div>
          </header>

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent
              side="right"
              className="flex w-[min(100vw,18rem)] max-w-[18rem] flex-col border-l border-border bg-card p-0 sm:max-w-[18rem]"
            >
              {/* pt-6 — מפנה מקום לכפתור הסגירה המובנה של ה-Sheet בפינה העליונה */}
              <SidebarBody showNotificationBell={false} className="pt-6" />
            </SheetContent>
          </Sheet>
        </>
      )}

      {showDesktopAside && (
        <aside
          className="fixed right-0 top-0 z-40 flex h-screen w-72 flex-col border-l border-border bg-card shadow-soft"
          aria-label="תפריט ניווט"
        >
          <SidebarBody showNotificationBell />
        </aside>
      )}
    </>
  );
}
