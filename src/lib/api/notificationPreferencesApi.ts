import { getToken } from './authApi';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export type NotificationPreferences = {
  notify_urban_renewal_new: boolean;
  notify_dangerous_buildings_new: boolean;
  notify_hot_investor_boards_new: boolean;
  updated_at: string | null;
};

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

const defaultPreferences = (): NotificationPreferences => ({
  notify_urban_renewal_new: false,
  notify_dangerous_buildings_new: false,
  notify_hot_investor_boards_new: false,
  updated_at: null,
});

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await fetch(`${BASE_URL}/api/me/notification-preferences`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      return defaultPreferences();
    }
    throw new Error('Failed to load notification preferences');
  }
  const data = (await res.json()) as {
    success?: boolean;
    preferences?: Partial<NotificationPreferences>;
  };
  const p = data.preferences;
  if (!p) return defaultPreferences();
  return {
    notify_urban_renewal_new: Boolean(p.notify_urban_renewal_new),
    notify_dangerous_buildings_new: Boolean(p.notify_dangerous_buildings_new),
    notify_hot_investor_boards_new: Boolean(p.notify_hot_investor_boards_new),
    updated_at: p.updated_at ?? null,
  };
}

export async function updateNotificationPreferences(
  prefs: Pick<
    NotificationPreferences,
    | 'notify_urban_renewal_new'
    | 'notify_dangerous_buildings_new'
    | 'notify_hot_investor_boards_new'
  >
): Promise<NotificationPreferences> {
  const res = await fetch(`${BASE_URL}/api/me/notification-preferences`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({
      notify_urban_renewal_new: prefs.notify_urban_renewal_new,
      notify_dangerous_buildings_new: prefs.notify_dangerous_buildings_new,
      notify_hot_investor_boards_new: prefs.notify_hot_investor_boards_new,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to save notification preferences');
  }
  const data = (await res.json()) as {
    preferences?: NotificationPreferences;
  };
  if (!data.preferences) {
    throw new Error('Invalid response');
  }
  return data.preferences;
}
