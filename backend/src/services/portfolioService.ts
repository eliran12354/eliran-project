/**
 * Portfolio (תיק המשקיע) – CRUD for saved items per user
 */

import { supabase } from '../config/database.js';

export type PortfolioItem = {
  id: string;
  user_id: string;
  item_type: string;
  source_id: string;
  snapshot: Record<string, unknown> | null;
  created_at: string;
};

export async function getItemsByUserId(userId: string): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('id, user_id, item_type, source_id, snapshot, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PortfolioItem[];
}

export async function addItem(
  userId: string,
  itemType: string,
  sourceId: string,
  snapshot?: Record<string, unknown> | null
): Promise<PortfolioItem> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .insert({
      user_id: userId,
      item_type: itemType,
      source_id: sourceId,
      snapshot: snapshot ?? null,
    })
    .select('id, user_id, item_type, source_id, snapshot, created_at')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('ALREADY_SAVED'); // unique violation
    throw error;
  }
  return data as PortfolioItem;
}

export async function removeItem(
  userId: string,
  itemType: string,
  sourceId: string
): Promise<void> {
  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .eq('source_id', sourceId);

  if (error) throw error;
}

export async function isItemSaved(
  userId: string,
  itemType: string,
  sourceId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('id')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .eq('source_id', sourceId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
