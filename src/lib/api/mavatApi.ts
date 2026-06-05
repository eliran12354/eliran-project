const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

export type MavatPlan = {
  id: string | number | null;
  name: string | null;
  number: string | null;
  location: string | null;
  authority: string | null;
  status: string | null;
};

export type MavatSearchSuccess = {
  success: true;
  query: string;
  results: MavatPlan[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type MavatSearchFailure = { success: false; error: string };

export async function searchMavatPlans(
  query: string,
  page = 1,
  pageSize = 20,
  signal?: AbortSignal,
): Promise<MavatSearchSuccess | MavatSearchFailure> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`${BASE_URL}/api/mavat-search?${params.toString()}`, { signal });
    const data = (await res.json().catch(() => ({}))) as Partial<MavatSearchSuccess> & {
      error?: string;
    };

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "שגיאה בטעינת תוצאות חיפוש" };
    }

    return {
      success: true,
      query: data.query ?? query,
      results: data.results ?? [],
      page: data.page ?? page,
      pageSize: data.pageSize ?? pageSize,
      total: data.total ?? (data.results?.length ?? 0),
      hasMore: data.hasMore ?? false,
    };
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") {
      return { success: false, error: "הבקשה בוטלה" };
    }
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}

export type MavatPlanDetails = {
  id: string | number;
  portalUrl: string;
  raw: unknown | null;
};

export async function fetchMavatPlanDetails(
  id: string | number,
): Promise<{ success: true; details: MavatPlanDetails } | { success: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/mavat-search/${encodeURIComponent(String(id))}`);
    const data = (await res.json().catch(() => ({}))) as Partial<MavatPlanDetails> & {
      success?: boolean;
      error?: string;
    };
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "שגיאה בטעינת פרטי התוכנית" };
    }
    return {
      success: true,
      details: {
        id: data.id ?? id,
        portalUrl: data.portalUrl ?? `https://mavat.iplan.gov.il/SV4/1/${id}/0`,
        raw: data.raw ?? null,
      },
    };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "שגיאת רשת" };
  }
}
