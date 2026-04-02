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
  LogOut
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginDialog } from "@/components/LoginDialog";

export function Sidebar() {
  const location = useLocation();
  const [openHotTenders, setOpenHotTenders] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  const currentTab = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get("tab");
  }, [location.search]);

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col overflow-y-auto border-r border-border/50 bg-gradient-card p-6 shadow-lg animate-slide-up"
      aria-label="תפריט ניווט"
    >
      {/* Logo and Header */}
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

      {/* Auth – התחברות / משתמש מחובר */}
      <div className="mb-6 pb-4 border-b border-border/50">
        {user ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg">
            <NotificationBell />
            <User className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-sm font-medium truncate min-w-0 flex-1" title={profile?.email || user.email}>
              {profile?.email || user.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="shrink-0 h-8 w-8"
              title="התנתק"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setLoginDialogOpen(true)}
            className="w-full gap-2"
          >
            <User className="w-4 h-4" />
            התחבר
          </Button>
        )}
      </div>

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />

      {/* Main Navigation */}
      <nav className="space-y-4">
        {/* עמוד ראשי - כפתור רגיל */}
        <div className="mb-4">
          <Link to="/">
            <Button 
              className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                isActive("/") 
                  ? "bg-blue-600 shadow-md text-white" 
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <Home className="w-6 h-6" />
              עמוד ראשי
            </Button>
          </Link>
        </div>
        
        {/* מפת GovMap - כפתור רגיל */}
        <div className="mb-4">
          <Link to="/govmap">
            <Button 
              className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                isActive("/govmap") 
                  ? "bg-blue-600 shadow-md text-white" 
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <MapPin className="w-6 h-6" />
              מפת מידע נדל"ן GovMap
            </Button>
          </Link>
        </div>

        {/* מכרזים חמים - תת תפריט */}
        <div className="mb-2">
          <Button 
            variant="default"
            onClick={() => setOpenHotTenders((v) => !v)}
            className="w-full justify-between gap-4 h-14 text-base transition-all duration-300 bg-blue-600 shadow-md text-white hover:shadow-lg"
          >
            <span className="flex items-center gap-4">
              <FileText className="w-6 h-6" />
              מכרזים חמים
            </span>
            {openHotTenders ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
          {openHotTenders && (
            <div className="mt-2 space-y-2 pr-2">
              <Link to="/listings?tab=rami">
                <Button 
                  className={`w-full justify-start gap-3 h-16 text-base transition-all duration-300 text-blue-600 ${
                    location.pathname === "/listings" && currentTab !== "execution"
                      ? "bg-blue-500/10"
                      : "hover:bg-blue-500/5 hover-lift"
                  }`}
                  variant="ghost"
                >
                  <Hammer className="w-5 h-5" />
                  מכרזי רמ"י
                </Button>
              </Link>
              <Link to="/listings?tab=execution">
                <Button 
                  className={`w-full justify-start gap-3 h-16 text-base transition-all duration-300 text-blue-600 ${
                    location.pathname === "/listings" && currentTab === "execution"
                      ? "bg-blue-500/10"
                      : "hover:bg-blue-500/5 hover-lift"
                  }`}
                  variant="ghost"
                >
                  <Hammer className="w-5 h-5" />
                  מכרזי הוצאה לפועל
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* אזורים חמים למעקב - כפתור רגיל */}
        <div className="mb-4">
          <Link to="/hot-areas">
            <Button className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
              isActive("/hot-areas")
                ? "bg-gradient-to-r from-orange-500 to-red-500 shadow-glow text-white"
                : "hover:bg-orange-500/5 hover:text-orange-600 hover-lift"
            }`}>
              <Flame className="w-6 h-6" />
              אזורים חמים למעקב
            </Button>
          </Link>
        </div>

        {/* פרויקטי התחדשות עירונית - כפתור רגיל */}
        <div className="mb-4">
          <Link to="/urban-renewal">
            <Button className="w-full justify-start gap-4 h-14 text-base hover:bg-blue-500/5 hover:text-blue-600 hover-lift transition-all duration-300">
              <Building2 className="w-6 h-6" />
              מתחמי התחדשות עירונית
            </Button>
          </Link>
        </div>

              {/* תוכניות בנייה - כפתור רגיל */}
              <div className="mb-4">
                <Link to="/plans">
                  <Button className="w-full justify-start gap-4 h-14 text-base hover:bg-blue-500/5 hover:text-blue-600 hover-lift transition-all duration-300">
                    <Search className="w-6 h-6" />
                    תוכניות בנייה
                  </Button>
                </Link>
              </div>

              {/* איתור מבנים מסוכנים - כפתור רגיל */}
              <div className="mb-4">
                <Link to="/dangerous-buildings">
                  <Button className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                    isActive("/dangerous-buildings")
                      ? "bg-blue-600 shadow-md text-white"
                      : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
                  }`}>
                    <AlertTriangle className="w-6 h-6" />
                    איתור מבנים מסוכנים
                  </Button>
                </Link>
              </div>

              {/* הפקת נסח טאבו - כפתור רגיל */}
              <div className="mb-4">
                <Link to="/tabu-request">
                  <Button className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                    isActive("/tabu-request")
                      ? "bg-blue-600 shadow-md text-white"
                      : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
                  }`}>
                    <FileText className="w-6 h-6" />
                    הפקת נסח טאבו
                  </Button>
                </Link>
              </div>

              {/* בדיקת קרקע מתקדמת - כפתור רגיל */}
              <div className="mb-4">
                <Link to="/land-check">
                  <Button className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                    isActive("/land-check")
                      ? "bg-blue-600 shadow-md text-white"
                      : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
                  }`}>
                    <FileSearch className="w-6 h-6" />
                    בדיקת קרקע מתקדמת
                  </Button>
                </Link>
              </div>

              {/* מלאי תכנוני למגורים - כפתור רגיל */}
              <div className="mb-4">
                <Link to="/residential-inventory">
                  <Button className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                    isActive("/residential-inventory")
                      ? "bg-blue-600 shadow-md text-white"
                      : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
                  }`}>
                    <Warehouse className="w-6 h-6" />
                    מלאי תכנוני למגורים
                  </Button>
                </Link>
              </div>

              {/* דשבורד ניהול - כפתור רגיל */}
              <div className="mb-4">
                <Link to="/admin-dashboard">
                  <Button className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                    isActive("/admin-dashboard")
                      ? "bg-blue-600 shadow-md text-white"
                      : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
                  }`}>
                    <LayoutDashboard className="w-6 h-6" />
                    דשבורד ניהול
                  </Button>
                </Link>
              </div>

        {/* הגדרות - כפתור רגיל */}
        <div className="mb-4">
          <Link to="/settings">
            <Button
              className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                isActive("/settings")
                  ? "bg-blue-600 shadow-md text-white"
                  : "hover:bg-blue-500/5 hover:text-blue-600 hover-lift"
              }`}
            >
              <Settings className="w-6 h-6" />
              הגדרות
            </Button>
          </Link>
        </div>
      </nav>
    </aside>
  );
}