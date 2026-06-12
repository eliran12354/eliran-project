import { count, query } from '../config/database.js';

export type AdminDashboardStats = {
  usersCount: number;
  propertiesCount: number;
  contactSubmissionsCount: number;
  tenderAnalysesCount: number;
  tenderTokensUsed: number;
};

export type AdminMonthlyStat = {
  /** מפתח חודש בפורמט YYYY-MM (UTC) */
  month: string;
  /** סך משתמשים מצטבר עד סוף החודש */
  totalUsers: number;
  /** כמות פעולות שתועדו במערכת באותו חודש */
  activityCount: number;
};

// Table names are hardcoded constants (never user input), so interpolation is safe here.
const COUNTABLE_TABLES = ['users', 'properties', 'contact_submissions', 'tender_analyses'] as const;
type CountableTable = (typeof COUNTABLE_TABLES)[number];

async function countRows(table: CountableTable): Promise<number> {
  try {
    return await count(`SELECT count(*)::int AS count FROM ${table}`);
  } catch (err) {
    console.error(`adminStats count ${table}:`, err);
    return 0;
  }
}

async function sumTenderTokens(): Promise<number> {
  try {
    return await count(
      `SELECT COALESCE(sum(total_tokens_used), 0)::int AS count FROM tender_analyses`,
    );
  } catch (err) {
    console.error('adminStats sum tender tokens:', err);
    return 0;
  }
}

// טבלאות שמתעדות פעולות משתמשים במערכת — לכולן יש עמודת created_at
const ACTIVITY_TABLES = [
  'tender_analyses',
  'calculation_logs',
  'saved_calculations',
  'portfolio_items',
  'contact_submissions',
] as const;
type ActivityTable = (typeof ACTIVITY_TABLES)[number];

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function countRowsPerMonth(
  table: ActivityTable | 'users',
  windowStart: Date,
): Promise<Map<string, number>> {
  try {
    const rows = await query<{ month: string; count: number | string }>(
      `SELECT to_char(created_at AT TIME ZONE 'utc', 'YYYY-MM') AS month, count(*)::int AS count
       FROM ${table}
       WHERE created_at >= $1
       GROUP BY 1`,
      [windowStart.toISOString()],
    );
    return new Map(rows.map((row) => [row.month, Number(row.count)]));
  } catch (err) {
    console.error(`adminStats monthly count ${table}:`, err);
    return new Map();
  }
}

async function countUsersBefore(date: Date): Promise<number> {
  try {
    return await count(`SELECT count(*)::int AS count FROM users WHERE created_at < $1`, [
      date.toISOString(),
    ]);
  } catch (err) {
    console.error('adminStats count users before window:', err);
    return 0;
  }
}

/**
 * סדרה חודשית עבור גרף הדשבורד: סך משתמשים מצטבר וכמות פעילות בכל חודש,
 * עבור monthsBack החודשים האחרונים (כולל החודש הנוכחי).
 */
export async function getMonthlyDashboardStats(monthsBack = 8): Promise<AdminMonthlyStat[]> {
  const now = new Date();
  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1),
  );

  const [usersBeforeWindow, newUsersByMonth, ...activityByTable] = await Promise.all([
    countUsersBefore(windowStart),
    countRowsPerMonth('users', windowStart),
    ...ACTIVITY_TABLES.map((table) => countRowsPerMonth(table, windowStart)),
  ]);

  let runningTotalUsers = usersBeforeWindow;
  return Array.from({ length: monthsBack }, (_, i) => {
    const month = monthKey(
      new Date(Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth() + i, 1)),
    );
    runningTotalUsers += newUsersByMonth.get(month) ?? 0;
    const activityCount = activityByTable.reduce((sum, table) => sum + (table.get(month) ?? 0), 0);
    return { month, totalUsers: runningTotalUsers, activityCount };
  });
}

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const [usersCount, propertiesCount, contactSubmissionsCount, tenderAnalysesCount, tenderTokensUsed] =
    await Promise.all([
      countRows('users'),
      countRows('properties'),
      countRows('contact_submissions'),
      countRows('tender_analyses'),
      sumTenderTokens(),
    ]);

  return {
    usersCount,
    propertiesCount,
    contactSubmissionsCount,
    tenderAnalysesCount,
    tenderTokensUsed,
  };
}
