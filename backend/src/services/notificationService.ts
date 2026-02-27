/**
 * Notification service – CRUD for user notifications
 */

import { supabase } from '../config/database.js';

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
  let query = supabase
    .from('user_notifications')
    .select('id, user_id, type, title, body, link, read_at, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as UserNotification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw error;
  return count ?? 0;
}

export async function markAsRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw error;
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
  const { data, error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      metadata: input.metadata ?? null,
    })
    .select('id, user_id, type, title, body, link, read_at, metadata, created_at')
    .single();

  if (error) throw error;
  return data as UserNotification;
}
