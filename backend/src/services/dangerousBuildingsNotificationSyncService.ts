import * as notificationService from './notificationService.js';
import * as notificationPreferencesService from './notificationPreferencesService.js';
import * as dataSnapshotService from './dataSnapshotService.js';
import { fetchAllDangerousBuildingIds } from './dangerousBuildingsDatasetService.js';

const NOTIFICATION_TYPE = 'dangerous_buildings_new_data';
const LINK_PATH = '/dangerous-buildings';

export type DangerousBuildingsSyncResult = {
  success: true;
  baselineOnly: boolean;
  totalIds: number;
  newCount: number;
  notifiedUsers: number;
};

export type DangerousBuildingsSyncFailure = {
  success: false;
  error: string;
};

export async function runDangerousBuildingsNotificationSync(): Promise<
  DangerousBuildingsSyncResult | DangerousBuildingsSyncFailure
> {
  try {
    const currentIds = await fetchAllDangerousBuildingIds();
    const snapshotKey = dataSnapshotService.DANGEROUS_BUILDINGS_SNAPSHOT_KEY;

    const currentSet = new Set(currentIds);
    const previous = await dataSnapshotService.getKnownIds(snapshotKey);

    if (previous === null) {
      await dataSnapshotService.saveKnownIds(snapshotKey, currentIds);
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
      await dataSnapshotService.saveKnownIds(snapshotKey, currentIds);
      return {
        success: true,
        baselineOnly: false,
        totalIds: currentIds.length,
        newCount: 0,
        notifiedUsers: 0,
      };
    }

    const userIds =
      await notificationPreferencesService.listUserIdsWithDangerousBuildingsNotificationsEnabled();

    const title =
      newIds.length === 1
        ? 'מבנה מסוכן חדש במאגר'
        : `${newIds.length} מבנים מסוכנים חדשים במאגר`;
    const body =
      'התעדכן מידע במאגר מבנים מסוכנים — לחץ לצפייה בעמוד איתור מבנים מסוכנים.';

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
            snapshot_key: snapshotKey,
          },
        });
        notifiedUsers += 1;
      } catch (e) {
        console.error(
          `dangerousBuildingsNotificationSync: failed notification for user ${userId}:`,
          e
        );
      }
    }

    const shouldAdvanceSnapshot =
      userIds.length === 0 || notifiedUsers > 0;
    if (shouldAdvanceSnapshot) {
      await dataSnapshotService.saveKnownIds(snapshotKey, currentIds);
    } else {
      console.error(
        'dangerousBuildingsNotificationSync: snapshot not updated (all notification inserts failed)'
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
    console.error('runDangerousBuildingsNotificationSync:', e);
    return { success: false, error: msg };
  }
}
