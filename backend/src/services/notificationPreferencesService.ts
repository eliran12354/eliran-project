/**
 * User notification preferences (table: user_notification_preferences).
 * FK user_id must reference public.users — app auth uses that table, not auth.users.
 */

import { query, queryOne } from '../config/database.js';

export type NotificationPreferences = {
  notify_urban_renewal_new: boolean;
  notify_dangerous_buildings_new: boolean;
  notify_hot_investor_boards_new: boolean;
  updated_at: string | null;
};

function rowToPreferences(row: {
  notify_urban_renewal_new: unknown;
  notify_dangerous_buildings_new?: unknown;
  notify_hot_investor_boards_new?: unknown;
  updated_at: string | null;
}): NotificationPreferences {
  return {
    notify_urban_renewal_new: Boolean(row.notify_urban_renewal_new),
    notify_dangerous_buildings_new: Boolean(row.notify_dangerous_buildings_new),
    notify_hot_investor_boards_new: Boolean(row.notify_hot_investor_boards_new),
    updated_at: row.updated_at,
  };
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const data = await queryOne<{
    notify_urban_renewal_new: unknown;
    notify_dangerous_buildings_new: unknown;
    notify_hot_investor_boards_new: unknown;
    updated_at: string | null;
  }>(
    `SELECT notify_urban_renewal_new, notify_dangerous_buildings_new,
            notify_hot_investor_boards_new, updated_at
     FROM user_notification_preferences
     WHERE user_id = $1`,
    [userId]
  );

  if (!data) {
    return {
      notify_urban_renewal_new: false,
      notify_dangerous_buildings_new: false,
      notify_hot_investor_boards_new: false,
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
    notify_hot_investor_boards_new: boolean;
  }
): Promise<NotificationPreferences> {
  const data = await queryOne<{
    notify_urban_renewal_new: unknown;
    notify_dangerous_buildings_new: unknown;
    notify_hot_investor_boards_new: unknown;
    updated_at: string | null;
  }>(
    `INSERT INTO user_notification_preferences
       (user_id, notify_urban_renewal_new, notify_dangerous_buildings_new,
        notify_hot_investor_boards_new, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       notify_urban_renewal_new = EXCLUDED.notify_urban_renewal_new,
       notify_dangerous_buildings_new = EXCLUDED.notify_dangerous_buildings_new,
       notify_hot_investor_boards_new = EXCLUDED.notify_hot_investor_boards_new,
       updated_at = EXCLUDED.updated_at
     RETURNING notify_urban_renewal_new, notify_dangerous_buildings_new,
               notify_hot_investor_boards_new, updated_at`,
    [
      userId,
      prefs.notify_urban_renewal_new,
      prefs.notify_dangerous_buildings_new,
      prefs.notify_hot_investor_boards_new,
      new Date().toISOString(),
    ]
  );

  if (!data) throw new Error('Failed to upsert notification preferences');
  return rowToPreferences(data);
}

/** User IDs that opted in to urban renewal "new data" notifications. */
export async function listUserIdsWithUrbanRenewalNotificationsEnabled(): Promise<
  string[]
> {
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM user_notification_preferences WHERE notify_urban_renewal_new = true`
  );
  return rows.map((row) => row.user_id);
}

/** User IDs that opted in to dangerous buildings notifications. */
export async function listUserIdsWithDangerousBuildingsNotificationsEnabled(): Promise<
  string[]
> {
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM user_notification_preferences WHERE notify_dangerous_buildings_new = true`
  );
  return rows.map((row) => row.user_id);
}

/** User IDs that opted in to hot investor board listing notifications. */
export async function listUserIdsWithHotInvestorBoardsNotificationsEnabled(): Promise<
  string[]
> {
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM user_notification_preferences WHERE notify_hot_investor_boards_new = true`
  );
  return rows.map((row) => row.user_id);
}
