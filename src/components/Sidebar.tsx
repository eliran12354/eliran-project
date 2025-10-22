import { 
  Home, 
  MapPin, 
  FileText, 
  Search, 
  Settings,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

export function Sidebar() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

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
              מפת נכסים
            </Button>
          </Link>
        </div>

        {/* מכרזים חמים - כפתור ירוק קבוע */}
        <div className="mb-4">
          <Link to="/listings">
            <Button 
              variant="default"
              className="w-full justify-start gap-4 h-14 text-base transition-all duration-300 bg-gradient-primary shadow-glow text-white hover:shadow-large"
            >
              <FileText className="w-6 h-6" />
              מכרזים חמים
            </Button>
          </Link>
        </div>

        {/* עסקאות נדל״ן - כפתור ירוק קבוע */}
        <div className="mb-4">
          <Link to="/deals">
            <Button 
              variant="default"
              className="w-full justify-start gap-4 h-14 text-base transition-all duration-300 bg-gradient-primary shadow-glow text-white hover:shadow-large"
            >
              <TrendingUp className="w-6 h-6" />
              עסקאות נדל״ן
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