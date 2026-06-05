/**
 * Tabu (land registry extract) requests (tabu_requests).
 */

import { queryOne } from '../config/database.js';

export type TabuRequestInput = {
  identification_type?: string;
  gush?: string | null;
  helka?: string | null;
  sub_helka?: string | null;
  city?: string | null;
  street?: string | null;
  house_number?: string | null;
  apartment?: string | null;
  document_type?: string;
  email?: string;
  full_name?: string | null;
};

const COLUMNS = [
  'identification_type',
  'gush',
  'helka',
  'sub_helka',
  'city',
  'street',
  'house_number',
  'apartment',
  'document_type',
  'email',
  'full_name',
] as const;

export async function insertTabuRequest(
  input: TabuRequestInput
): Promise<{ id: string | number } | null> {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const params: unknown[] = [];

  for (const col of COLUMNS) {
    const value = input[col];
    if (value !== undefined) {
      columns.push(col);
      params.push(value);
      placeholders.push(`$${params.length}`);
    }
  }

  return queryOne(
    `INSERT INTO tabu_requests (${columns.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING id`,
    params
  );
}
