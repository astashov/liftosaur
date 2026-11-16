import { lb } from "lens-shmens";
import { IThunk } from "./types";
import { ISettings, ISettingsNotifications } from "../types";
import { NotificationPrefs_toggle } from "../models/notificationPrefs";
import { INotificationPermission } from "../utils/timerBridge";

export function Thunk_setNotificationPref(
  key: keyof ISettingsNotifications,
  value: boolean,
  permission: INotificationPermission | undefined,
  onPermission: (result: INotificationPermission) => void
): IThunk {
  return async (dispatch, getState, env) => {
    const { notifications, permissionAction } = NotificationPrefs_toggle(
      getState().storage.settings,
      key,
      value,
      permission
    );
    dispatch({
      type: "UpdateSettings",
      lensRecording: lb<ISettings>().p("notifications").record(notifications),
      desc: `Toggle ${key} notifications`,
    });
    if (permissionAction === "request") {
      onPermission(await env.timer.requestNotificationPermission());
    }
  };
}

export function Thunk_readNotificationPermission(
  onResult: (permission: INotificationPermission) => void,
  shouldRequest: boolean = false
): IThunk {
  return async (_dispatch, _getState, env) => {
    onResult(await (shouldRequest ? env.timer.requestNotificationPermission() : env.timer.getNotificationPermission()));
  };
}

export function Thunk_askNotificationPermission(): IThunk {
  return async (_dispatch, _getState, env) => {
    if ((await env.timer.getNotificationPermission()) === "notDetermined") {
      await env.timer.requestNotificationPermission();
    }
  };
}
