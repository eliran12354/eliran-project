import { getToken } from "@/lib/api/authApi";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

export type HotInvestorBoardCategory = "pinui_binui" | "up_to_1m" | "land_thaw";

export type HotInvestorBoardListing = {
  id: string;
  created_at: string;
  updated_at: string;
  category: HotInvestorBoardCategory;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_label: string | null;
  location_label: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  external_link: string | null;
  image_url: string | null;
  display_order: number;
  is_published: boolean;
};

export async function fetchHotInvestorBoardsPublic(
  category?: HotInvestorBoardCategory | null,
): Promise<{ success: true; listings: HotInvestorBoardListing[] } | { success: false; error: string }> {
  try {
    const q = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await fetch(`${BASE_URL}/api/hot-investor-boards${q}`);
    const data = (await res.json()) as { listings?: HotInvestorBoardListing[]; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || "שגיאה בטעינת הנתונים" };
    }
    return { success: true, listings: data.listings ?? [] };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export async function fetchHotInvestorBoardsAdmin(
  token: string,
): Promise<{ success: true; listings: HotInvestorBoardListing[] } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/hot-investor-boards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { listings?: HotInvestorBoardListing[]; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || "לא ניתן לטעון את הרשימה" };
    }
    return { success: true, listings: data.listings ?? [] };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export type HotInvestorBoardInput = {
  category: HotInvestorBoardCategory;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  price_label?: string | null;
  location_label?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  external_link?: string | null;
  image_url?: string | null;
  display_order?: number;
  is_published?: boolean;
};

export async function createHotInvestorBoard(
  token: string,
  body: HotInvestorBoardInput,
): Promise<{ success: true; listing: HotInvestorBoardListing } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/hot-investor-boards`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { listing?: HotInvestorBoardListing; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || "לא ניתן ליצור" };
    }
    if (!data.listing) return { success: false, error: "תשובה לא תקינה" };
    return { success: true, listing: data.listing };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export async function updateHotInvestorBoard(
  token: string,
  id: string,
  body: Partial<HotInvestorBoardInput>,
): Promise<{ success: true; listing: HotInvestorBoardListing } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/hot-investor-boards/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { listing?: HotInvestorBoardListing; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || "לא ניתן לעדכן" };
    }
    if (!data.listing) return { success: false, error: "תשובה לא תקינה" };
    return { success: true, listing: data.listing };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export async function deleteHotInvestorBoard(
  token: string,
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/hot-investor-boards/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return { success: false, error: data.error || "לא ניתן למחוק" };
    }
    return { success: true };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}
