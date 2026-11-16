import { IHistoryRecord, ISettings, ISettingsNotifications } from "../types";
import { INativeEffect } from "./nativeEffects";
import { History_isPaused } from "./history";
import type { INotificationPermission } from "../utils/timerBridge";

export type INotificationPermissionAction = "none" | "request" | "openSettings";

export type INotificationStatusRow =
  | { kind: "none" }
  | { kind: "shown"; action: "request" | "openSettings"; title: string; body: string; buttonLabel: string };

export function NotificationPrefs_isOn(
  settings: Pick<ISettings, "notifications">,
  key: keyof ISettingsNotifications
): boolean {
  return settings.notifications?.[key] !== false;
}

export function NotificationPrefs_reminder(settings: ISettings): number | undefined {
  return NotificationPrefs_isOn(settings, "restTimer") ? settings.timers.reminder : undefined;
}

export function NotificationPrefs_statusRow(permission: INotificationPermission | undefined): INotificationStatusRow {
  switch (permission) {
    case "denied":
      return {
        kind: "shown",
        action: "openSettings",
        title: "Notifications are off for Liftosaur",
        body: "Turn them on in system settings to get rest timer alerts and friend updates.",
        buttonLabel: "Open settings",
      };
    case "notDetermined":
      return {
        kind: "shown",
        action: "request",
        title: "Notifications are not set up yet",
        body: "Allow notifications to get rest timer alerts and friend updates.",
        buttonLabel: "Turn on",
      };
    default:
      return { kind: "none" };
  }
}

export function NotificationPrefs_toggle(
  settings: Pick<ISettings, "notifications">,
  key: keyof ISettingsNotifications,
  value: boolean,
  permission: INotificationPermission | undefined
): { notifications: ISettingsNotifications; permissionAction: INotificationPermissionAction } {
  return {
    notifications: { ...settings.notifications, [key]: value },
    permissionAction: value && permission === "notDetermined" ? "request" : "none",
  };
}

export function NotificationPrefs_reconcile(
  before: ISettings,
  after: ISettings,
  progress: IHistoryRecord | undefined
): INativeEffect[] {
  const wasOn = NotificationPrefs_isOn(before, "restTimer");
  const isOn = NotificationPrefs_isOn(after, "restTimer");
  if (wasOn === isOn || progress == null) {
    return [];
  }
  if (!isOn) {
    return [{ type: "stopTimer" }, { type: "setWorkoutReminder", reminder: 0 }];
  }
  if (History_isPaused(progress.intervals)) {
    return [];
  }
  return [{ type: "setWorkoutReminder", reminder: after.timers.reminder || 0 }];
}
