import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  LayoutDashboard,
  Users,
  Building2,
  Brain,
  FileCheck,
  Mail,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getToken } from "@/lib/api/authApi";
import { fetchContactSubmissions, type ContactSubmission } from "@/lib/api/contactApi";
import { fetchAdminStats } from "@/lib/api/adminApi";
import { FeaturedProfessionalsAdminPanel } from "@/components/FeaturedProfessionalsAdminPanel";
import { HotInvestorBoardsAdminPanel } from "@/components/HotInvestorBoardsAdminPanel";

function ContactSubmissionsSection() {
  const [items, setItems] = useState<ContactSubmission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("לא מחובר");
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetchContactSubmissions(token);
      if (cancelled) return;
      if (res.success) {
        setItems(res.submissions);
        setError(null);
      } else {
        setError(res.error);
        setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">פניות צור קשר</h3>
      </div>
      {error && (
        <p className="text-sm text-destructive mb-2">{error}</p>
      )}
      {items === null && !error && (
        <p className="text-sm text-muted-foreground py-6 text-center">טוען…</p>
      )}
      {items && items.length === 0 && !error && (
        <p className="text-sm text-muted-foreground py-6 text-center">אין פניות עדיין</p>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
          {items.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{row.name}</span>
                <time className="text-xs text-muted-foreground tabular-nums">
                  {new Date(row.created_at).toLocaleString("he-IL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </time>
              </div>
              <a
                href={`mailto:${row.email}`}
                className="text-primary hover:underline break-all block"
              >
                {row.email}
              </a>
              <p className="text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                {row.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatStat(n: number) {
  return new Intl.NumberFormat("he-IL").format(n);
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{
    usersCount: number;
    propertiesCount: number;
    contactSubmissionsCount: number;
  } | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchAdminStats();
      if (cancelled) return;
      if (res.success) {
        setStats(res.stats);
        setStatsError(null);
      } else {
        setStats(null);
        setStatsError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">דשבורד ניהול</h2>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            סקירה כללית וכלי ניהול למערכת
          </p>
        </div>
      </div>

      {statsError && (
        <p className="text-sm text-destructive" role="alert">
          {statsError}
        </p>
      )}

      {/* Stats Grid — נתונים מ־API /api/admin/stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">סה״כ משתמשים</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {stats ? formatStat(stats.usersCount) : "…"}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">סה״כ נכסים</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {stats ? formatStat(stats.propertiesCount) : "…"}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">פניות צור קשר</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {stats ? formatStat(stats.contactSubmissionsCount) : "…"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">סה״כ פניות שהתקבלו</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      <ContactSubmissionsSection />

      <FeaturedProfessionalsAdminPanel />

      <HotInvestorBoardsAdminPanel />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI — אין מעקב במסד נתונים כרגע */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">שימושים ב-AI</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            כרגע אין נתוני שימוש ב-AI שנשמרים במערכת (מסד נתונים / API), ולכן לא ניתן להציג מספרים אמיתיים.
            כשתתווסף תשתית מעקב — ניתן יהיה לחבר את הסעיף הזה לנתונים בפועל.
          </p>
        </Card>

        {/* נסחי טאבו — אין מעקב מרוכז כרגע */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">נסחי טאבו</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            כרגע אין דשבורד שמציג נתוני הפקות נסחי טאבו מהמערכת. אם תתווסף טבלת מעקב או API — ניתן יהיה לחבר כאן סטטיסטיקות אמיתיות.
          </p>
        </Card>
      </div>
      </div>
    </ProtectedRoute>
  );
}

