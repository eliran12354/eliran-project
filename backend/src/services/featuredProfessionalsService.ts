import { query, queryOne, execute } from '../config/database.js';

const SELECT_COLS =
  'id, created_at, updated_at, name, headline, description, city, phone, email, website_url, whatsapp, image_url, experience_label, rating, display_order, is_published';

export type FeaturedProfessionalRow = {
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
  experience_label: string | null;
  rating: number | null;
  display_order: number;
  is_published: boolean;
};

type CreateInput = {
  name: string;
  headline?: string | null;
  description?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  whatsapp?: string | null;
  image_url?: string | null;
  experience_label?: string | null;
  rating?: number | null;
  display_order?: number;
  is_published?: boolean;
};

type UpdateInput = Partial<CreateInput>;

function emptyToNull(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t.length ? t : null;
}

export async function listPublishedProfessionals(limit = 24): Promise<FeaturedProfessionalRow[]> {
  return query<FeaturedProfessionalRow>(
    `SELECT ${SELECT_COLS}
     FROM featured_professionals
     WHERE is_published = true
     ORDER BY display_order ASC, created_at DESC
     LIMIT $1`,
    [limit]
  );
}

export async function listAllProfessionalsForAdmin(limit = 200): Promise<FeaturedProfessionalRow[]> {
  return query<FeaturedProfessionalRow>(
    `SELECT ${SELECT_COLS}
     FROM featured_professionals
     ORDER BY display_order ASC, created_at DESC
     LIMIT $1`,
    [limit]
  );
}

export async function getProfessionalById(id: string): Promise<FeaturedProfessionalRow | null> {
  return queryOne<FeaturedProfessionalRow>(
    `SELECT ${SELECT_COLS} FROM featured_professionals WHERE id = $1`,
    [id]
  );
}

export async function createProfessional(input: CreateInput): Promise<FeaturedProfessionalRow> {
  const data = await queryOne<FeaturedProfessionalRow>(
    `INSERT INTO featured_professionals
       (name, headline, description, city, phone, email, website_url, whatsapp,
        image_url, experience_label, rating, display_order, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING ${SELECT_COLS}`,
    [
      input.name.trim(),
      emptyToNull(input.headline ?? null),
      emptyToNull(input.description ?? null),
      emptyToNull(input.city ?? null),
      emptyToNull(input.phone ?? null),
      emptyToNull(input.email ?? null),
      emptyToNull(input.website_url ?? null),
      emptyToNull(input.whatsapp ?? null),
      emptyToNull(input.image_url ?? null),
      emptyToNull(input.experience_label ?? null),
      input.rating === undefined ? null : input.rating,
      input.display_order ?? 0,
      input.is_published ?? false,
    ]
  );

  if (!data) {
    throw new Error('Insert failed');
  }
  return data;
}

export async function updateProfessional(
  id: string,
  input: UpdateInput,
): Promise<FeaturedProfessionalRow | null> {
  const patch: Record<string, unknown> = {};

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.headline !== undefined) patch.headline = emptyToNull(input.headline);
  if (input.description !== undefined) patch.description = emptyToNull(input.description);
  if (input.city !== undefined) patch.city = emptyToNull(input.city);
  if (input.phone !== undefined) patch.phone = emptyToNull(input.phone);
  if (input.email !== undefined) patch.email = emptyToNull(input.email);
  if (input.website_url !== undefined) patch.website_url = emptyToNull(input.website_url);
  if (input.whatsapp !== undefined) patch.whatsapp = emptyToNull(input.whatsapp);
  if (input.image_url !== undefined) patch.image_url = emptyToNull(input.image_url);
  if (input.experience_label !== undefined) patch.experience_label = emptyToNull(input.experience_label);
  if (input.rating !== undefined) patch.rating = input.rating;
  if (input.display_order !== undefined) patch.display_order = input.display_order;
  if (input.is_published !== undefined) patch.is_published = input.is_published;

  const columns = Object.keys(patch);
  if (columns.length === 0) {
    return getProfessionalById(id);
  }

  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  const values = columns.map((col) => patch[col]);

  return queryOne<FeaturedProfessionalRow>(
    `UPDATE featured_professionals
     SET ${setClause}, updated_at = now()
     WHERE id = $${columns.length + 1}
     RETURNING ${SELECT_COLS}`,
    [...values, id]
  );
}

export async function deleteProfessional(id: string): Promise<boolean> {
  const rowCount = await execute(`DELETE FROM featured_professionals WHERE id = $1`, [id]);
  return rowCount > 0;
}
