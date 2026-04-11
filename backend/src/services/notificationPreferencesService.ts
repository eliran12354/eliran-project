/**
 * User notification preferences (Supabase: user_notification_preferences).
 * FK user_id must reference public.users — app auth uses that table, not auth.users.
 */

import { supabase } from '../config/database.js';

export type NotificationPreferences = {
  notify_urban_renewal_new: boolean;
  notify_dangerous_buildings_new: boolean;
  updated_at: string | null;
};

function rowToPreferences(row: {
  notify_urban_renewal_new: unknown;
  notify_dangerous_buildings_new?: unknown;
  updated_at: string | null;
}): NotificationPreferences {
  return {
    notify_urban_renewal_new: Boolean(row.notify_urban_renewal_new),
    notify_dangerous_buildings_new: Boolean(row.notify_dangerous_buildings_new),
    updated_at: row.updated_at,
  };
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('notify_urban_renewal_new, notify_dangerous_buildings_new, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      notify_urban_renewal_new: false,
      notify_dangerous_buildings_new: false,
      updated_at: null,
    };
  }
  return rowToPreferences(data);
}

export async function upsertNotificationPreferences(
  userId: string,
  prefs: {
    notify_urban_renewal_new: boolean;
    notify_dangerous_buildings_new: boolean;
  }
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .upsert(
      {
        user_id: userId,
        notify_urban_renewal_new: prefs.notify_urban_renewal_new,
        notify_dangerous_buildings_new: prefs.notify_dangerous_buildings_new,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select(
      'notify_urban_renewal_new, notify_dangerous_buildings_new, updated_at'
    )
    .single();

  if (error) throw error;
  return rowToPreferences(data);
}

/** User IDs that opted in to urban renewal "new data" notifications. */
export async function listUserIdsWithUrbanRenewalNotificationsEnabled(): Promise<
  string[]
> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('user_id')
    .eq('notify_urban_renewal_new', true);

  if (error) throw error;
  return (data ?? []).map((row: { user_id: string }) => row.user_id);
}

/** User IDs that opted in to dangerous buildings notifications. */
export async function listUserIdsWithDangerousBuildingsNotificationsEnabled(): Promise<
  string[]
> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('user_id')
    .eq('notify_dangerous_buildings_new', true);

  if (error) throw error;
  return (data ?? []).map((row: { user_id: string }) => row.user_id);
}
