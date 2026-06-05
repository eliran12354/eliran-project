import { query, queryOne, execute } from '../config/database.js';

export type HotInvestorBoardCategory = 'pinui_binui' | 'up_to_1m' | 'land_thaw';

export type HotInvestorBoardRow = {
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

type CreateInput = {
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

type UpdateInput = Partial<CreateInput>;

function emptyToNull(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t.length ? t : null;
}

const selectCols =
  'id, created_at, updated_at, category, title, subtitle, description, price_label, location_label, contact_phone, contact_email, external_link, image_url, display_order, is_published';

export async function listPublishedBoards(
  category?: HotInvestorBoardCategory,
): Promise<HotInvestorBoardRow[]> {
  if (category) {
    return query<HotInvestorBoardRow>(
      `SELECT ${selectCols}
       FROM hot_investor_board_listings
       WHERE is_published = true AND category = $1
       ORDER BY display_order ASC, created_at DESC
       LIMIT 200`,
      [category]
    );
  }
  return query<HotInvestorBoardRow>(
    `SELECT ${selectCols}
     FROM hot_investor_board_listings
     WHERE is_published = true
     ORDER BY display_order ASC, created_at DESC
     LIMIT 200`
  );
}

export async function listAllBoardsForAdmin(): Promise<HotInvestorBoardRow[]> {
  return query<HotInvestorBoardRow>(
    `SELECT ${selectCols}
     FROM hot_investor_board_listings
     ORDER BY display_order ASC, created_at DESC
     LIMIT 500`
  );
}

export async function getBoardById(id: string): Promise<HotInvestorBoardRow | null> {
  return queryOne<HotInvestorBoardRow>(
    `SELECT ${selectCols} FROM hot_investor_board_listings WHERE id = $1`,
    [id]
  );
}

export async function createBoard(input: CreateInput): Promise<HotInvestorBoardRow> {
  const data = await queryOne<HotInvestorBoardRow>(
    `INSERT INTO hot_investor_board_listings
       (category, title, subtitle, description, price_label, location_label,
        contact_phone, contact_email, external_link, image_url, display_order,
        is_published, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
     RETURNING ${selectCols}`,
    [
      input.category,
      input.title.trim(),
      emptyToNull(input.subtitle ?? null),
      emptyToNull(input.description ?? null),
      emptyToNull(input.price_label ?? null),
      emptyToNull(input.location_label ?? null),
      emptyToNull(input.contact_phone ?? null),
      emptyToNull(input.contact_email ?? null),
      emptyToNull(input.external_link ?? null),
      emptyToNull(input.image_url ?? null),
      input.display_order ?? 0,
      input.is_published ?? false,
    ]
  );

  if (!data) throw new Error('Insert failed');
  return data;
}

export async function updateBoard(
  id: string,
  input: UpdateInput,
): Promise<HotInvestorBoardRow | null> {
  const patch: Record<string, unknown> = {};

  if (input.category !== undefined) patch.category = input.category;
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.subtitle !== undefined) patch.subtitle = emptyToNull(input.subtitle);
  if (input.description !== undefined) patch.description = emptyToNull(input.description);
  if (input.price_label !== undefined) patch.price_label = emptyToNull(input.price_label);
  if (input.location_label !== undefined) patch.location_label = emptyToNull(input.location_label);
  if (input.contact_phone !== undefined) patch.contact_phone = emptyToNull(input.contact_phone);
  if (input.contact_email !== undefined) patch.contact_email = emptyToNull(input.contact_email);
  if (input.external_link !== undefined) patch.external_link = emptyToNull(input.external_link);
  if (input.image_url !== undefined) patch.image_url = emptyToNull(input.image_url);
  if (input.display_order !== undefined) patch.display_order = input.display_order;
  if (input.is_published !== undefined) patch.is_published = input.is_published;

  const columns = Object.keys(patch);
  if (columns.length === 0) {
    return getBoardById(id);
  }

  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  const values = columns.map((col) => patch[col]);

  return queryOne<HotInvestorBoardRow>(
    `UPDATE hot_investor_board_listings
     SET ${setClause}, updated_at = now()
     WHERE id = $${columns.length + 1}
     RETURNING ${selectCols}`,
    [...values, id]
  );
}

export async function deleteBoard(id: string): Promise<boolean> {
  const rowCount = await execute(`DELETE FROM hot_investor_board_listings WHERE id = $1`, [id]);
  return rowCount > 0;
}
