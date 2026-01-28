import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, User, Shield, LogOut, Palette, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginDialog } from "@/components/LoginDialog";
import { useState } from "react";

export default function SettingsPage() {
  const { user, profile, logout, loading } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">הגדרות</h2>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            פרופיל, אבטחה והעדפות
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">
          טוען...
        </Card>
      ) : !user ? (
        <>
          <Card className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-muted-foreground">
                התחבר כדי לצפות בהגדרות הפרופיל והאבטחה.
              </p>
              <Button onClick={() => setLoginDialogOpen(true)} className="gap-2">
                <User className="w-4 h-4" />
                התחבר
              </Button>
            </div>
          </Card>
          <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
        </>
      ) : (
        <>
          {/* פרופיל */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">פרופיל</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">אימייל</p>
                <p className="font-medium">{profile?.email || user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">תפקיד</p>
                <p className="font-medium">{user.role === "admin" ? "אדמין" : "משתמש"}</p>
              </div>
            </div>
          </Card>

          {/* התחברות ואבטחה */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">התחברות ואבטחה</h3>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="text-sm text-muted-foreground">
                מחובר כ־{profile?.email || user.email}
              </p>
              <Button variant="outline" onClick={logout} className="w-fit gap-2">
                <LogOut className="w-4 h-4" />
                התנתק
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* העדפות */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">העדפות</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          ערכת נושא, שפה והעדפות נוספות – יופיעו כאן בעדכונים הבאים.
        </p>
      </Card>

      {/* אודות */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">אודות</h3>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">נדל״ן חכם</p>
          <p className="text-muted-foreground">
            מערכת אינטרנטית חכמה למכרזים, נכסים והשקעות נדל״ן
          </p>
        </div>
      </Card>
    </div>
  );
}
