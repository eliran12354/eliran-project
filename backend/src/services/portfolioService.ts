/**
 * Portfolio (תיק המשקיע) – CRUD for saved items per user
 */

import { query, queryOne, execute } from '../config/database.js';

export type PortfolioItem = {
  id: string;
  user_id: string;
  item_type: string;
  source_id: string;
  snapshot: Record<string, unknown> | null;
  created_at: string;
};

export async function getItemsByUserId(userId: string): Promise<PortfolioItem[]> {
  return query<PortfolioItem>(
    `SELECT id, user_id, item_type, source_id, snapshot, created_at
     FROM portfolio_items
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
}

export async function addItem(
  userId: string,
  itemType: string,
  sourceId: string,
  snapshot?: Record<string, unknown> | null
): Promise<PortfolioItem> {
  try {
    const data = await queryOne<PortfolioItem>(
      `INSERT INTO portfolio_items (user_id, item_type, source_id, snapshot)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, user_id, item_type, source_id, snapshot, created_at`,
      [userId, itemType, sourceId, snapshot != null ? JSON.stringify(snapshot) : null]
    );
    if (!data) throw new Error('Insert failed');
    return data;
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw new Error('ALREADY_SAVED'); // unique violation
    }
    throw err;
  }
}

export async function removeItem(
  userId: string,
  itemType: string,
  sourceId: string
): Promise<void> {
  await execute(
    `DELETE FROM portfolio_items
     WHERE user_id = $1 AND item_type = $2 AND source_id = $3`,
    [userId, itemType, sourceId]
  );
}

export async function isItemSaved(
  userId: string,
  itemType: string,
  sourceId: string
): Promise<boolean> {
  const data = await queryOne<{ id: string }>(
    `SELECT id FROM portfolio_items
     WHERE user_id = $1 AND item_type = $2 AND source_id = $3
     LIMIT 1`,
    [userId, itemType, sourceId]
  );
  return !!data;
}
