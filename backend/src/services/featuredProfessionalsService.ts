import { supabase } from '../config/database.js';

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
  const { data, error } = await supabase
    .from('featured_professionals')
    .select(
      'id, created_at, updated_at, name, headline, description, city, phone, email, website_url, whatsapp, image_url, display_order, is_published',
    )
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as FeaturedProfessionalRow[];
}

export async function listAllProfessionalsForAdmin(limit = 200): Promise<FeaturedProfessionalRow[]> {
  const { data, error } = await supabase
    .from('featured_professionals')
    .select(
      'id, created_at, updated_at, name, headline, description, city, phone, email, website_url, whatsapp, image_url, display_order, is_published',
    )
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as FeaturedProfessionalRow[];
}

export async function createProfessional(input: CreateInput): Promise<FeaturedProfessionalRow> {
  const row = {
    name: input.name.trim(),
    headline: emptyToNull(input.headline ?? null),
    description: emptyToNull(input.description ?? null),
    city: emptyToNull(input.city ?? null),
    phone: emptyToNull(input.phone ?? null),
    email: emptyToNull(input.email ?? null),
    website_url: emptyToNull(input.website_url ?? null),
    whatsapp: emptyToNull(input.whatsapp ?? null),
    image_url: emptyToNull(input.image_url ?? null),
    display_order: input.display_order ?? 0,
    is_published: input.is_published ?? false,
  };

  const { data, error } = await supabase
    .from('featured_professionals')
    .insert(row)
    .select(
      'id, created_at, updated_at, name, headline, description, city, phone, email, website_url, whatsapp, image_url, display_order, is_published',
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Insert failed');
  }
  return data as FeaturedProfessionalRow;
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
  if (input.display_order !== undefined) patch.display_order = input.display_order;
  if (input.is_published !== undefined) patch.is_published = input.is_published;

  if (Object.keys(patch).length === 0) {
    const { data: existing } = await supabase
      .from('featured_professionals')
      .select(
        'id, created_at, updated_at, name, headline, description, city, phone, email, website_url, whatsapp, image_url, display_order, is_published',
      )
      .eq('id', id)
      .maybeSingle();
    return existing as FeaturedProfessionalRow | null;
  }

  const { data, error } = await supabase
    .from('featured_professionals')
    .update(patch)
    .eq('id', id)
    .select(
      'id, created_at, updated_at, name, headline, description, city, phone, email, website_url, whatsapp, image_url, display_order, is_published',
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data as FeaturedProfessionalRow | null;
}

export async function deleteProfessional(id: string): Promise<boolean> {
  const { data, error } = await supabase.from('featured_professionals').delete().eq('id', id).select('id');

  if (error) {
    throw new Error(error.message);
  }
  return Array.isArray(data) && data.length > 0;
}
