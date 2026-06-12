import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import { Brain, Building2, FileCheck, FileSearch, Mail, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { getToken } from "@/lib/api/authApi";
import { fetchContactSubmissions, type ContactSubmission } from "@/lib/api/contactApi";
import {
  fetchAdminMonthlyStats,
  fetchAdminStats,
  type AdminDashboardStats,
  type AdminMonthlyStat,
} from "@/lib/api/adminApi";
import { FeaturedProfessionalsAdminPanel } from "@/components/FeaturedProfessionalsAdminPanel";
import { HotInvestorBoardsAdminPanel } from "@/components/HotInvestorBoardsAdminPanel";

function formatStat(n: number) {
  return new Intl.NumberFormat("he-IL").format(n);
}

/* ---------- באנר ברכה ---------- */

function WelcomeBanner() {
  const { profile } = useAuth();
  const displayName = profile?.username || profile?.email || "מנהל";

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 md:p-8 text-primary-foreground shadow-medium">
      <div className="relative z-10 max-w-xl space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">שלום, {displayName}</h2>
        <p className="text-sm md:text-base text-primary-foreground/85">
          ברוך הבא לדשבורד הניהול — סקירה כללית וכלי ניהול למערכת
        </p>
      </div>
      {/* אלמנט עיצובי מופשט ברקע */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-1/3 bg-white/10 -skew-x-12 origin-top-left pointer-events-none"
      />
    </section>
  );
}

/* ---------- כרטיסיות סטטיסטיקה ---------- */

type StatCardConfig = {
  key: keyof AdminDashboardStats;
  title: string;
  icon: LucideIcon;
  iconClassName: string;
};

const STAT_CARDS: StatCardConfig[] = [
  { key: "usersCount", title: "סה״כ משתמשים", icon: Users, iconClassName: "bg-info/10 text-info" },
  { key: "propertiesCount", title: "סה״כ נכסים", icon: Building2, iconClassName: "bg-success/10 text-success" },
  { key: "contactSubmissionsCount", title: "פניות צור קשר", icon: Mail, iconClassName: "bg-warning/10 text-warning" },
  { key: "tenderAnalysesCount", title: "ניתוחי מכרזים", icon: FileSearch, iconClassName: "bg-accent text-accent-foreground" },
];

function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <Card className="p-5 rounded-2xl shadow-soft hover:shadow-medium transition-shadow">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconClassName}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

/* ---------- גרף משתמשים ופעילות לפי חודש (נתונים מ־API /api/admin/stats/monthly) ---------- */

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", { month: "short" }).format(new Date(year, month - 1, 1));
}

function UsersActivityChartCard({
  months,
  error,
}: {
  months: AdminMonthlyStat[] | null;
  error: string | null;
}) {
  const chartData = useMemo(
    () =>
      (months ?? []).map((point) => ({
        month: formatMonthLabel(point.month),
        totalUsers: point.totalUsers,
        activityCount: point.activityCount,
      })),
    [months],
  );
  const currentTotalUsers = months?.length ? months[months.length - 1].totalUsers : null;

  return (
    <Card className="p-6 rounded-2xl shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-2xl font-bold tabular-nums">
            {currentTotalUsers !== null ? formatStat(currentTotalUsers) : "…"}
          </h3>
          <p className="text-xs text-muted-foreground font-medium">סה״כ משתמשים במערכת</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-info" aria-hidden="true" />
            <span>סה״כ משתמשים</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success" aria-hidden="true" />
            <span>פעילות באתר</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-2" role="alert">
          {error}
        </p>
      )}
      {months === null && !error ? (
        <p className="text-sm text-muted-foreground py-16 text-center">טוען…</p>
      ) : (
        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="totalUsersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => formatStat(value)}
                contentStyle={{
                  borderRadius: "var(--radius)",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Area
                type="monotone"
                dataKey="totalUsers"
                name="סה״כ משתמשים"
                stroke="hsl(var(--info))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#totalUsersGradient)"
              />
              <Area
                type="monotone"
                dataKey="activityCount"
                name="פעילות באתר"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#activityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/* ---------- רשימת פניות צור קשר ---------- */

function ContactSubmissionsSection({
  items,
  error,
}: {
  items: ContactSubmission[] | null;
  error: string | null;
}) {
  return (
    <Card className="p-6 rounded-2xl shadow-soft">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold">פניות צור קשר</h3>
      </div>
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}
      {items === null && !error && (
        <p className="text-sm text-muted-foreground py-6 text-center">טוען…</p>
      )}
      {items && items.length === 0 && !error && (
        <p className="text-sm text-muted-foreground py-6 text-center">אין פניות עדיין</p>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
          {items.map((row) => (
            <li key={row.id} className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2">
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

/* ---------- העמוד ---------- */

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<ContactSubmission[] | null>(null);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<AdminMonthlyStat[] | null>(null);
  const [monthlyStatsError, setMonthlyStatsError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchAdminMonthlyStats();
      if (cancelled) return;
      if (res.success) {
        setMonthlyStats(res.months);
        setMonthlyStatsError(null);
      } else {
        setMonthlyStats([]);
        setMonthlyStatsError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setSubmissionsError("לא מחובר");
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetchContactSubmissions(token);
      if (cancelled) return;
      if (res.success) {
        setSubmissions(res.submissions);
        setSubmissionsError(null);
      } else {
        setSubmissions([]);
        setSubmissionsError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto animate-fade-in">
        <WelcomeBanner />

        {statsError && (
          <p className="text-sm text-destructive" role="alert">
            {statsError}
          </p>
        )}

        {/* Stats Grid — נתונים מ־API /api/admin/stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {STAT_CARDS.map(({ key, title, icon, iconClassName }) => (
            <StatCard
              key={key}
              title={title}
              value={stats ? formatStat(stats[key]) : "…"}
              icon={icon}
              iconClassName={iconClassName}
            />
          ))}
        </div>

        <UsersActivityChartCard months={monthlyStats} error={monthlyStatsError} />

        <ContactSubmissionsSection items={submissions} error={submissionsError} />

        <FeaturedProfessionalsAdminPanel />

        <HotInvestorBoardsAdminPanel />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI — נתוני שימוש מניתוחי מכרזים */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-info/10 text-info flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold">שימושים ב-AI</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">סה״כ טוקנים</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">
                  {stats ? formatStat(stats.tenderTokensUsed) : "…"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">בכל ניתוחי המכרזים</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">ניתוחי מכרזים</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">
                  {stats ? formatStat(stats.tenderAnalysesCount) : "…"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">סה״כ ניתוחים שבוצעו</p>
              </div>
            </div>
          </Card>

          {/* נסחי טאבו — אין מעקב מרוכז כרגע */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
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
