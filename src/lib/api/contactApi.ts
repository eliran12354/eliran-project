const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export type ContactSubmission = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
};

export async function submitContact(payload: {
  name: string;
  email: string;
  message: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { success?: boolean; id?: string; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || 'שגיאה בשליחת הפנייה' };
    }
    if (data.success && data.id) {
      return { success: true, id: data.id };
    }
    return { success: false, error: 'תגובה לא צפויה מהשרת' };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || 'שגיאת רשת' };
  }
}

export async function fetchContactSubmissions(
  token: string,
): Promise<{ success: true; submissions: ContactSubmission[] } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/contact-submissions`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as {
      submissions?: ContactSubmission[];
      error?: string;
    };
    if (!res.ok) {
      return { success: false, error: data.error || 'לא ניתן לטעון פניות' };
    }
    return { success: true, submissions: data.submissions ?? [] };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || 'שגיאת רשת' };
  }
}
