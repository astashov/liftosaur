import { JSX, useEffect, useState } from "react";
import { AppState, Linking, Platform, View } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { ISettings, ISettingsNotifications, ISubscription } from "../types";
import { useNavOptions } from "../navigation/useNavOptions";
import { GroupHeader } from "./groupHeader";
import { MenuItemEditable } from "./menuItemEditable";
import { Button } from "./button";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { NotificationPrefs_isOn, NotificationPrefs_statusRow } from "../models/notificationPrefs";
import { Thunk_readNotificationPermission, Thunk_setNotificationPref } from "../ducks/notificationThunks";
import { INotificationPermission } from "../utils/timerBridge";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  subscription: ISubscription;
}

const isNative = Platform.OS === "ios" || Platform.OS === "android";

export function ScreenNotifications(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Notifications" });
  const [permission, setPermission] = useState<INotificationPermission | undefined>(undefined);

  useEffect(() => {
    props.dispatch(Thunk_readNotificationPermission(setPermission));
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        props.dispatch(Thunk_readNotificationPermission(setPermission));
      }
    });
    return () => sub.remove();
  }, []);

  const statusRow = NotificationPrefs_statusRow(permission);
  const toggle = (key: keyof ISettingsNotifications, name: string, description: string): JSX.Element => (
    <MenuItemEditable
      type="boolean"
      name={name}
      value={NotificationPrefs_isOn(props.settings, key) ? "true" : "false"}
      nextLine={
        <View className="mb-2" style={{ marginTop: -8 }}>
          <Text className="text-xs text-text-secondary">{description}</Text>
        </View>
      }
      onChange={(newValue) => {
        props.dispatch(Thunk_setNotificationPref(key, newValue === "true", permission, setPermission));
      }}
    />
  );

  return (
    <View className="px-gutter">
      {statusRow.kind === "shown" && (
        <View
          className="p-4 mt-4 border rounded-2xl border-border-neutral bg-background-subtle"
          testID="notifications-status"
        >
          <Text className="font-semibold">{statusRow.title}</Text>
          <Text className="mt-1 mb-3 text-sm text-text-secondary">{statusRow.body}</Text>
          <Button
            kind="purple"
            name="notifications-permission"
            testID="notifications-permission"
            data-testid="notifications-permission"
            onClick={() => {
              if (statusRow.action === "openSettings") {
                Linking.openSettings();
              } else {
                props.dispatch(Thunk_readNotificationPermission(setPermission, true));
              }
            }}
          >
            {statusRow.buttonLabel}
          </Button>
        </View>
      )}
      {isNative && (
        <>
          <GroupHeader name="Workout" topPadding={true} />
          {toggle("restTimer", "Rest timer", "When the rest is over, and a reminder if a workout is left running")}
          {Subscriptions_hasSubscription(props.subscription) && Platform.OS === "android" && (
            <MenuItemEditable
              type="boolean"
              name="Ignore Do Not Disturb"
              value={props.settings.ignoreDoNotDisturb ? "true" : "false"}
              nextLine={
                <View className="mb-2" style={{ marginTop: -8 }}>
                  <Text className="text-xs text-text-secondary">
                    Rest timer will make a sound even in Silent or Do Not Disturb mode
                  </Text>
                </View>
              }
              onChange={(newValue) => {
                props.dispatch({
                  type: "UpdateSettings",
                  lensRecording: lb<ISettings>()
                    .p("ignoreDoNotDisturb")
                    .record(newValue === "true"),
                  desc: "Toggle ignore DND",
                });
              }}
            />
          )}
        </>
      )}
      <GroupHeader name="Friends" topPadding={true} />
      {toggle("reactions", "Reactions", "When a friend reacts to your workout")}
      {toggle("friendRequests", "Friend requests", "When someone wants to follow you, or accepts your request")}
      {toggle("programEdits", "Program edits", "When a friend you share programs with edits one of them")}
    </View>
  );
}
