import { supabase } from '../config/database.js';

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
  let q = supabase
    .from('hot_investor_board_listings')
    .select(selectCols)
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200);

  if (category) {
    q = q.eq('category', category);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as HotInvestorBoardRow[];
}

export async function listAllBoardsForAdmin(): Promise<HotInvestorBoardRow[]> {
  const { data, error } = await supabase
    .from('hot_investor_board_listings')
    .select(selectCols)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as HotInvestorBoardRow[];
}

export async function getBoardById(id: string): Promise<HotInvestorBoardRow | null> {
  const { data, error } = await supabase
    .from('hot_investor_board_listings')
    .select(selectCols)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as HotInvestorBoardRow | null;
}

export async function createBoard(input: CreateInput): Promise<HotInvestorBoardRow> {
  const row = {
    category: input.category,
    title: input.title.trim(),
    subtitle: emptyToNull(input.subtitle ?? null),
    description: emptyToNull(input.description ?? null),
    price_label: emptyToNull(input.price_label ?? null),
    location_label: emptyToNull(input.location_label ?? null),
    contact_phone: emptyToNull(input.contact_phone ?? null),
    contact_email: emptyToNull(input.contact_email ?? null),
    external_link: emptyToNull(input.external_link ?? null),
    image_url: emptyToNull(input.image_url ?? null),
    display_order: input.display_order ?? 0,
    is_published: input.is_published ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('hot_investor_board_listings')
    .insert(row)
    .select(selectCols)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Insert failed');
  return data as HotInvestorBoardRow;
}

export async function updateBoard(
  id: string,
  input: UpdateInput,
): Promise<HotInvestorBoardRow | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

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

  const keys = Object.keys(patch).filter((k) => k !== 'updated_at');
  if (keys.length === 0) {
    return getBoardById(id);
  }

  const { data, error } = await supabase
    .from('hot_investor_board_listings')
    .update(patch)
    .eq('id', id)
    .select(selectCols)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as HotInvestorBoardRow | null;
}

export async function deleteBoard(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('hot_investor_board_listings')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}
