import { getToken } from './authApi';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export type Notification = {
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

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function getNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();

  const res = await fetch(
    `${BASE_URL}/api/notifications${qs ? `?${qs}` : ''}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error('Failed to load notifications');
  }
  const data = await res.json();
  return data.notifications ?? [];
}

export async function getUnreadCount(): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/notifications/unread-count`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) return 0;
    throw new Error('Failed to get unread count');
  }
  const data = await res.json();
  return data.count ?? 0;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to mark as read');
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to mark all as read');
}
