import {
  Home,
  MapPin,
  FileText,
  Search,
  Settings,
  Building2,
  ChevronDown,
  ChevronUp,
  Hammer,
  AlertTriangle,
  FileSearch,
  LayoutDashboard,
  Flame,
  Warehouse,
  User,
  LogOut,
  Menu,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { type Dispatch, type ReactNode, type SetStateAction, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginDialog } from "@/components/LoginDialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsLgUp } from "@/hooks/use-media-query";

/** מרווח פנימי + שבירת שורות — לעקוף whitespace-nowrap של Button שלא יידחק הכיתוב לקצה */
/** dir=ltr על הכפתור: סדר flex [טקסט, אייקון] ⇒ אייקון מימין; הטקסט ב-NavLabel עם dir=rtl */
const sidebarNavBtnClass =
  "flex h-auto min-h-14 w-full min-w-0 flex-row items-start justify-start gap-3 px-3.5 py-3 text-sm font-medium leading-snug whitespace-normal transition-all duration-300 sm:text-[0.9375rem] [&>svg]:shrink-0 [&>svg]:mt-0.5";

const sidebarNavSubBtnClass =
  "flex h-auto min-h-16 w-full min-w-0 flex-row items-start justify-start gap-3 px-3.5 py-3 text-sm font-medium leading-snug whitespace-normal transition-all duration-300 sm:text-[0.9375rem] [&>svg]:shrink-0 [&>svg]:mt-0.5";

const sidebarNavTogglerClass =
  "flex h-auto min-h-14 w-full min-w-0 flex-row items-start justify-between gap-3 px-3.5 py-3 text-sm font-medium leading-snug whitespace-normal transition-all duration-300 sm:text-[0.9375rem] [&>svg]:shrink-0";

function NavLabel({ children }: { children: ReactNode }) {
  return (
    <span className="min-w-0 flex-1 break-words text-right leading-inherit" dir="rtl">
      {children}
    </span>
  );
}

function SidebarNavBody({
  isActive,
  currentTab,
  location,
  openHotTenders,
  setOpenHotTenders,
  setLoginDialogOpen,
  user,
  profile,
  logout,
  showNotificationBell,
}: {
  isActive: (path: string) => boolean;
  currentTab: string | null;
  location: ReturnType<typeof useLocation>;
  openHotTenders: boolean;
  setOpenHotTenders: Dispatch<SetStateAction<boolean>>;
  setLoginDialogOpen: (v: boolean) => void;
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  logout: () => void;
  showNotificationBell: boolean;
}) {
  return (
    <>
      <div className="text-center mb-10">
        <Link to="/" className="flex items-center justify-center gap-3 mb-4 group">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
            <Home className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-blue-600">נדל״ן חכם</h1>
        </Link>
        <p className="text-sm text-muted-foreground leading-relaxed">
          מערכת אינטרנטית חכמה למכרזים, נכסים והשקעות נדל״ן
        </p>
      </div>

      <div className="mb-6 pb-4 border-b border-border/50">
        {user ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg">
            {showNotificationBell && <NotificationBell />}
            <User className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-sm font-medium truncate min-w-0 flex-1" title={profile?.email || user.email}>
              {profile?.email || user.email}
            </span>
            <Button variant="ghost" size="icon" onClick={logout} className="shrink-0 h-8 w-8" title="התנתק">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            dir="ltr"
            onClick={() => setLoginDialogOpen(true)}
            className="flex h-auto min-h-10 w-full flex-row items-center justify-start gap-2 whitespace-normal px-3.5 py-3 text-sm"
          >
            <span className="min-w-0 flex-1 text-right" dir="rtl">
              התחבר
            </span>
            <User className="h-4 w-4 shrink-0" />
          </Button>
        )}
      </div>

      <nav className="space-y-2.5">
        <div>
          <Link to="/">
            <Button
              dir="ltr"
              className={`${sidebarNavBtnClass} ${
                isActive("/") ? "bg-blue-600 shadow-md text-white" : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <NavLabel>עמוד ראשי</NavLabel>
              <Home className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Link to="/govmap">
            <Button
              dir="ltr"
              className={`${sidebarNavBtnClass} ${
                isActive("/govmap")
                  ? "bg-blue-600 shadow-md text-white"
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <NavLabel>מפת מידע נדל״ן GovMap</NavLabel>
              <MapPin className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Button
            dir="ltr"
            variant="default"
            onClick={() => setOpenHotTenders((v) => !v)}
            className={`${sidebarNavTogglerClass} bg-blue-600 shadow-md text-white hover:shadow-lg`}
          >
            <span className="flex min-w-0 flex-1 flex-row items-start gap-3" dir="ltr">
              <NavLabel>מכרזים חמים</NavLabel>
              <FileText className="size-5 shrink-0 mt-0.5" />
            </span>
            {openHotTenders ? <ChevronUp className="size-5 shrink-0" /> : <ChevronDown className="size-5 shrink-0" />}
          </Button>
          {openHotTenders && (
            <div className="mt-1.5 space-y-1.5 pr-2">
              <Link to="/listings?tab=rami">
                <Button
                  dir="ltr"
                  className={`${sidebarNavSubBtnClass} text-blue-600 ${
                    location.pathname === "/listings" && currentTab !== "execution"
                      ? "bg-blue-500/10"
                      : "hover:bg-blue-500/5 hover-lift"
                  }`}
                  variant="ghost"
                >
                  <NavLabel>מכרזי רמ״י</NavLabel>
                  <Hammer className="size-5 shrink-0" />
                </Button>
              </Link>
              <Link to="/listings?tab=execution">
                <Button
                  dir="ltr"
                  className={`${sidebarNavSubBtnClass} text-blue-600 ${
                    location.pathname === "/listings" && currentTab === "execution"
                      ? "bg-blue-500/10"
                      : "hover:bg-blue-500/5 hover-lift"
                  }`}
                  variant="ghost"
                >
                  <NavLabel>מכרזי הוצאה לפועל</NavLabel>
                  <Hammer className="size-5 shrink-0" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div>
          <Link to="/hot-areas">
            <Button
              dir="ltr"
              className={`${sidebarNavBtnClass} ${
                isActive("/hot-areas")
                  ? "bg-gradient-to-r from-orange-500 to-red-500 shadow-glow text-white"
                  : "hover:bg-orange-500/5 hover:text-orange-600 hover-lift"
              }`}
            >
              <NavLabel>אזורים חמים למעקב</NavLabel>
              <Flame className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Link to="/urban-renewal">
            <Button dir="ltr" className={`${sidebarNavBtnClass} hover:bg-blue-500/5 hover:text-blue-600 hover-lift`}>
              <NavLabel>מתחמי התחדשות עירונית</NavLabel>
              <Building2 className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Link to="/plans">
            <Button dir="ltr" className={`${sidebarNavBtnClass} hover:bg-blue-500/5 hover:text-blue-600 hover-lift`}>
              <NavLabel>תוכניות בנייה</NavLabel>
              <Search className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Link to="/dangerous-buildings">
            <Button
              dir="ltr"
              className={`${sidebarNavBtnClass} ${
                isActive("/dangerous-buildings")
                  ? "bg-blue-600 shadow-md text-white"
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <NavLabel>איתור מבנים מסוכנים</NavLabel>
              <AlertTriangle className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Link to="/tabu-request">
            <Button
              dir="ltr"
              className={`${sidebarNavBtnClass} ${
                isActive("/tabu-request")
                  ? "bg-blue-600 shadow-md text-white"
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <NavLabel>הפקת נסח טאבו</NavLabel>
              <FileText className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Link to="/land-check">
            <Button
              dir="ltr"
              className={`${sidebarNavBtnClass} ${
                isActive("/land-check")
                  ? "bg-blue-600 shadow-md text-white"
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <NavLabel>בדיקת קרקע מתקדמת</NavLabel>
              <FileSearch className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Link to="/residential-inventory">
            <Button
              dir="ltr"
              className={`${sidebarNavBtnClass} ${
                isActive("/residential-inventory")
                  ? "bg-blue-600 shadow-md text-white"
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <NavLabel>מלאי תכנוני למגורים</NavLabel>
              <Warehouse className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Link to="/admin-dashboard">
            <Button
              dir="ltr"
              className={`${sidebarNavBtnClass} ${
                isActive("/admin-dashboard")
                  ? "bg-blue-600 shadow-md text-white"
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <NavLabel>דשבורד ניהול</NavLabel>
              <LayoutDashboard className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>

        <div>
          <Link to="/settings">
            <Button
              dir="ltr"
              className={`${sidebarNavBtnClass} ${
                isActive("/settings")
                  ? "bg-blue-600 shadow-md text-white"
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <NavLabel>הגדרות</NavLabel>
              <Settings className="size-5 shrink-0" />
            </Button>
          </Link>
        </div>
      </nav>
    </>
  );
}

export function Sidebar() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isLgUp = useIsLgUp();
  /** עמוד הבית: תמיד מסך מלא בלי סרגל צד קבוע (כמו landing) */
  const showCompactHeader = !isLgUp || isHome;
  const showDesktopAside = isLgUp && !isHome;
  const [openHotTenders, setOpenHotTenders] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, profile, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const currentTab = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get("tab");
  }, [location.search]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  const navPropsDesktop = {
    isActive,
    currentTab,
    location,
    openHotTenders,
    setOpenHotTenders,
    setLoginDialogOpen,
    user,
    profile,
    logout,
    showNotificationBell: true as const,
  };

  const navPropsMobileSheet = { ...navPropsDesktop, showNotificationBell: false as const };

  return (
    <>
      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />

      {showCompactHeader && (
        <>
          <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-border/50 bg-gradient-card px-4 shadow-md">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="פתח תפריט ניווט"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" className="min-w-0 flex-1 truncate text-center text-lg font-bold text-blue-600">
              נדל״ן חכם
            </Link>
            <div className="flex w-10 shrink-0 justify-end">{user ? <NotificationBell /> : <span className="inline-block w-10" aria-hidden />}</div>
          </header>

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent
              side="left"
              className="flex w-[min(100vw,18rem)] max-w-[18rem] flex-col overflow-y-auto border-r border-border/50 bg-gradient-card p-6 sm:max-w-[18rem]"
            >
              <SidebarNavBody {...navPropsMobileSheet} />
            </SheetContent>
          </Sheet>
        </>
      )}

      {showDesktopAside && (
        <aside
          className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col overflow-y-auto border-r border-border/50 bg-gradient-card p-6 shadow-lg animate-slide-up"
          aria-label="תפריט ניווט"
        >
          <SidebarNavBody {...navPropsDesktop} />
        </aside>
      )}
    </>
  );
}
