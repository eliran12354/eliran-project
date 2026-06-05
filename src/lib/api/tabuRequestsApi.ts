import { apiPost } from "./client";

export type TabuRequestInput = {
  identification_type: string;
  gush?: string | null;
  helka?: string | null;
  sub_helka?: string | null;
  city?: string | null;
  street?: string | null;
  house_number?: string | null;
  apartment?: string | null;
  document_type: string;
  email: string;
  full_name?: string | null;
};

/**
 * Submit a Tabu extract request to the backend (`/api/tabu-requests`).
 */
export function createTabuRequest(input: TabuRequestInput): Promise<{ id: string | number }> {
  return apiPost(`/api/tabu-requests`, input);
}
