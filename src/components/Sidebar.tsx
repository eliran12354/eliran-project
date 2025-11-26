import { 
  Home, 
  MapPin, 
  FileText, 
  Search, 
  Settings,
  TrendingUp,
  Building2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";

export function Sidebar() {
  const location = useLocation();
  const [openHotTenders, setOpenHotTenders] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  const currentTab = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get("tab");
  }, [location.search]);

  return (
    <div className="w-72 bg-gradient-card border-l border-border/50 p-6 space-y-6 shadow-medium animate-slide-up sticky top-0 h-screen overflow-y-auto">
      {/* Logo and Header */}
      <div className="text-center mb-10">
        <Link to="/" className="flex items-center justify-center gap-3 mb-4 group">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow group-hover:shadow-large transition-all duration-300">
            <Home className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">נדל״ן חכם</h1>
        </Link>
        <p className="text-sm text-muted-foreground leading-relaxed">
          מערכת אינטרנטית חכמה למכרזים, נכסים והשקעות נדל״ן
        </p>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-4">
        {/* עמוד ראשי - כפתור רגיל */}
        <div className="mb-4">
          <Link to="/">
            <Button 
              className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                isActive("/") 
                  ? "bg-gradient-primary shadow-glow text-white" 
                  : "hover:bg-primary/5 hover:text-primary hover-lift"
              }`}
            >
              <Home className="w-6 h-6" />
              עמוד ראשי
            </Button>
          </Link>
        </div>
        
        {/* מפת נכסים - כפתור ירוק קבוע */}
        <div className="mb-4">
          <Link to="/map">
            <Button 
              variant="default"
              className="w-full justify-start gap-4 h-14 text-base transition-all duration-300 bg-gradient-primary shadow-glow text-white hover:shadow-large"
            >
              <MapPin className="w-6 h-6" />
              מפת יעודי קרקע
            </Button>
          </Link>
        </div>

        {/* מפת GovMap - כפתור רגיל */}
        <div className="mb-4">
          <Link to="/govmap">
            <Button 
              className={`w-full justify-start gap-4 h-14 text-base transition-all duration-300 ${
                isActive("/govmap") 
                  ? "bg-gradient-primary shadow-glow text-white" 
                  : "hover:bg-primary/5 hover:text-primary hover-lift"
              }`}
            >
              <MapPin className="w-6 h-6" />
              מפת GovMap
            </Button>
          </Link>
        </div>

        {/* מכרזים חמים - תת תפריט */}
        <div className="mb-2">
          <Button 
            variant="default"
            onClick={() => setOpenHotTenders((v) => !v)}
            className="w-full justify-between gap-4 h-14 text-base transition-all duration-300 bg-gradient-primary shadow-glow text-white hover:shadow-large"
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
                  className={`w-full justify-start gap-3 h-12 text-sm transition-all duration-300 ${
                    location.pathname === "/listings" && currentTab !== "execution"
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-primary/5 hover:text-primary hover-lift"
                  }`}
                  variant="ghost"
                >
                  מכרזי רמ"י
                </Button>
              </Link>
              <Link to="/listings?tab=execution">
                <Button 
                  className={`w-full justify-start gap-3 h-12 text-sm transition-all duration-300 ${
                    location.pathname === "/listings" && currentTab === "execution"
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-primary/5 hover:text-primary hover-lift"
                  }`}
                  variant="ghost"
                >
                  מכרזי הוצאה לפועל
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* עסקאות נדל״ן - כפתור ירוק קבוע */}
        <div className="mb-4">
          <Link to="/deals">
            <Button 
              variant="default"
              className="w-full justify-start gap-4 h-14 text-base transition-all duration-300 bg-gradient-primary shadow-glow text-white hover:shadow-large"
            >
              <TrendingUp className="w-6 h-6" />
              עסקאות נדל"ן - רשות המיסים
            </Button>
          </Link>
        </div>

        {/* פרויקטי התחדשות עירונית - כפתור רגיל */}
        <div className="mb-4">
          <Link to="/urban-renewal">
            <Button className="w-full justify-start gap-4 h-14 text-base hover:bg-primary/5 hover:text-primary hover-lift transition-all duration-300">
              <Building2 className="w-6 h-6" />
              מתחמי התחדשות עירונית
            </Button>
          </Link>
        </div>

              {/* תוכניות בנייה - כפתור רגיל */}
              <div className="mb-4">
                <Link to="/plans">
                  <Button className="w-full justify-start gap-4 h-14 text-base hover:bg-primary/5 hover:text-primary hover-lift transition-all duration-300">
                    <Search className="w-6 h-6" />
                    תוכניות בנייה
                  </Button>
                </Link>
              </div>

        {/* הגדרות - כפתור רגיל */}
        <div className="mb-4">
          <Button className="w-full justify-start gap-4 h-14 text-base hover:bg-primary/5 hover:text-primary hover-lift transition-all duration-300">
            <Settings className="w-6 h-6" />
            הגדרות
          </Button>
        </div>
      </nav>
    </div>
  );
}