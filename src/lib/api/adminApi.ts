import { getToken } from "@/lib/api/authApi";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

export type AdminDashboardStats = {
  usersCount: number;
  propertiesCount: number;
  contactSubmissionsCount: number;
};

export async function fetchAdminStats(): Promise<
  { success: true; stats: AdminDashboardStats } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) {
    return { success: false, error: "לא מחובר" };
  }
  try {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as AdminDashboardStats & { error?: string; success?: boolean };
    if (!res.ok) {
      return { success: false, error: data.error || "שגיאה בטעינת נתונים" };
    }
    return {
      success: true,
      stats: {
        usersCount: data.usersCount ?? 0,
        propertiesCount: data.propertiesCount ?? 0,
        contactSubmissionsCount: data.contactSubmissionsCount ?? 0,
      },
    };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}
