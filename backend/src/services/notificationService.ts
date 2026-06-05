/**
 * Notification service – CRUD for user notifications
 */

import { query, queryOne, execute, count } from '../config/database.js';

export type UserNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function getNotificationsByUserId(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<UserNotification[]> {
  const limit = options?.limit ?? 50;
  const unreadFilter = options?.unreadOnly ? 'AND read_at IS NULL' : '';
  return query<UserNotification>(
    `SELECT id, user_id, type, title, body, link, read_at, metadata, created_at
     FROM user_notifications
     WHERE user_id = $1 ${unreadFilter}
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
}

export async function getUnreadCount(userId: string): Promise<number> {
  return count(
    `SELECT count(*)::int AS count FROM user_notifications
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
}

export async function markAsRead(
  userId: string,
  notificationId: string
): Promise<void> {
  await execute(
    `UPDATE user_notifications SET read_at = $1 WHERE id = $2 AND user_id = $3`,
    [new Date().toISOString(), notificationId, userId]
  );
}

export async function markAllAsRead(userId: string): Promise<void> {
  await execute(
    `UPDATE user_notifications SET read_at = $1
     WHERE user_id = $2 AND read_at IS NULL`,
    [new Date().toISOString(), userId]
  );
}

export type CreateNotificationInput = {
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function createNotification(
  input: CreateNotificationInput
): Promise<UserNotification> {
  const data = await queryOne<UserNotification>(
    `INSERT INTO user_notifications (user_id, type, title, body, link, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, user_id, type, title, body, link, read_at, metadata, created_at`,
    [
      input.user_id,
      input.type,
      input.title,
      input.body ?? null,
      input.link ?? null,
      input.metadata != null ? JSON.stringify(input.metadata) : null,
    ]
  );

  if (!data) throw new Error('Failed to create notification');
  return data;
}
