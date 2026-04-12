import { getToken } from "@/lib/api/authApi";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

export type FeaturedProfessional = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  headline: string | null;
  description: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  whatsapp: string | null;
  image_url: string | null;
  display_order: number;
  is_published: boolean;
};

export async function fetchFeaturedProfessionalsPublic(): Promise<
  { success: true; professionals: FeaturedProfessional[] } | { success: false; error: string }
> {
  try {
    const res = await fetch(`${BASE_URL}/api/featured-professionals`);
    const data = (await res.json()) as { professionals?: FeaturedProfessional[]; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || "שגיאה בטעינת הנתונים" };
    }
    return { success: true, professionals: data.professionals ?? [] };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export async function fetchFeaturedProfessionalsAdmin(
  token: string,
): Promise<{ success: true; professionals: FeaturedProfessional[] } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/featured-professionals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { professionals?: FeaturedProfessional[]; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || "לא ניתן לטעון את הרשימה" };
    }
    return { success: true, professionals: data.professionals ?? [] };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export type FeaturedProfessionalInput = {
  name: string;
  headline?: string | null;
  description?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  whatsapp?: string | null;
  image_url?: string | null;
  display_order?: number;
  is_published?: boolean;
};

export async function createFeaturedProfessional(
  token: string,
  body: FeaturedProfessionalInput,
): Promise<{ success: true; professional: FeaturedProfessional } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/featured-professionals`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      success?: boolean;
      professional?: FeaturedProfessional;
      error?: string;
    };
    if (!res.ok) {
      return { success: false, error: data.error || "יצירה נכשלה" };
    }
    if (data.success && data.professional) {
      return { success: true, professional: data.professional };
    }
    return { success: false, error: "תגובה לא צפויה מהשרת" };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export async function updateFeaturedProfessional(
  token: string,
  id: string,
  body: Partial<FeaturedProfessionalInput>,
): Promise<{ success: true; professional: FeaturedProfessional } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/featured-professionals/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      success?: boolean;
      professional?: FeaturedProfessional;
      error?: string;
    };
    if (!res.ok) {
      return { success: false, error: data.error || "עדכון נכשל" };
    }
    if (data.success && data.professional) {
      return { success: true, professional: data.professional };
    }
    return { success: false, error: "תגובה לא צפויה מהשרת" };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export async function deleteFeaturedProfessional(
  token: string,
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/featured-professionals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || "מחיקה נכשלה" };
    }
    if (data.success) {
      return { success: true };
    }
    return { success: false, error: "תגובה לא צפויה מהשרת" };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export function getAdminFeaturedToken(): string | null {
  return getToken();
}
