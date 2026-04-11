import * as notificationService from './notificationService.js';
import * as notificationPreferencesService from './notificationPreferencesService.js';
import * as dataSnapshotService from './dataSnapshotService.js';
import { fetchAllUrbanRenewalStableIds } from './dataGovService.js';

const NOTIFICATION_TYPE = 'urban_renewal_new_data';
const LINK_PATH = '/urban-renewal';

export type UrbanRenewalSyncResult = {
  success: true;
  baselineOnly: boolean;
  totalIds: number;
  newCount: number;
  notifiedUsers: number;
};

export type UrbanRenewalSyncFailure = {
  success: false;
  error: string;
};

/**
 * Fetches full urban-renewal dataset IDs from data.gov, diffs against last snapshot,
 * notifies subscribed users, then updates snapshot. First successful run only establishes baseline.
 */
export async function runUrbanRenewalNotificationSync(): Promise<
  UrbanRenewalSyncResult | UrbanRenewalSyncFailure
> {
  try {
    const currentIds = await fetchAllUrbanRenewalStableIds();
    if (currentIds.length === 0) {
      return {
        success: false,
        error: 'No records fetched from data.gov (empty or failed). Snapshot not updated.',
      };
    }

    const currentSet = new Set(currentIds);
    const previous = await dataSnapshotService.getKnownIds(
      dataSnapshotService.URBAN_RENEWAL_SNAPSHOT_KEY
    );

    if (previous === null) {
      await dataSnapshotService.saveKnownIds(
        dataSnapshotService.URBAN_RENEWAL_SNAPSHOT_KEY,
        currentIds
      );
      return {
        success: true,
        baselineOnly: true,
        totalIds: currentIds.length,
        newCount: 0,
        notifiedUsers: 0,
      };
    }

    const previousSet = new Set(previous);
    const newIds: string[] = [];
    for (const id of currentSet) {
      if (!previousSet.has(id)) newIds.push(id);
    }

    if (newIds.length === 0) {
      await dataSnapshotService.saveKnownIds(
        dataSnapshotService.URBAN_RENEWAL_SNAPSHOT_KEY,
        currentIds
      );
      return {
        success: true,
        baselineOnly: false,
        totalIds: currentIds.length,
        newCount: 0,
        notifiedUsers: 0,
      };
    }

    const userIds =
      await notificationPreferencesService.listUserIdsWithUrbanRenewalNotificationsEnabled();

    const title =
      newIds.length === 1
        ? 'מתחם התחדשות עירונית חדש במאגר'
        : `${newIds.length} מתחמי התחדשות עירונית חדשים במאגר`;
    const body = 'התפרסם מידע חדש בנתוני data.gov — לחץ לצפייה בעמוד מתחמי התחדשות עירונית.';

    let notifiedUsers = 0;
    for (const userId of userIds) {
      try {
        await notificationService.createNotification({
          user_id: userId,
          type: NOTIFICATION_TYPE,
          title,
          body,
          link: LINK_PATH,
          metadata: {
            new_count: newIds.length,
            snapshot_key: dataSnapshotService.URBAN_RENEWAL_SNAPSHOT_KEY,
          },
        });
        notifiedUsers += 1;
      } catch (e) {
        console.error(
          `urbanRenewalNotificationSync: failed notification for user ${userId}:`,
          e
        );
      }
    }

    const shouldAdvanceSnapshot =
      userIds.length === 0 || notifiedUsers > 0;
    if (shouldAdvanceSnapshot) {
      await dataSnapshotService.saveKnownIds(
        dataSnapshotService.URBAN_RENEWAL_SNAPSHOT_KEY,
        currentIds
      );
    } else {
      console.error(
        'urbanRenewalNotificationSync: snapshot not updated (all notification inserts failed)'
      );
    }

    return {
      success: true,
      baselineOnly: false,
      totalIds: currentIds.length,
      newCount: newIds.length,
      notifiedUsers,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('runUrbanRenewalNotificationSync:', e);
    return { success: false, error: msg };
  }
}
