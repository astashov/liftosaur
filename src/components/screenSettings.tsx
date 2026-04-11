import { JSX, useEffect, useState } from "react";
import { View, Pressable, Linking } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { MenuItem, MenuItemWrapper } from "./menuItem";
import {
  Thunk_pushScreen,
  Thunk_exportStorage,
  Thunk_exportHistoryToCSV,
  Thunk_exportProgramsToText,
} from "../ducks/thunks";
import { MenuItemEditable } from "./menuItemEditable";
import { lb } from "lens-shmens";
import { InternalLink } from "../internalLink";
import { IUser } from "../models/user";
import { ClipboardUtils_copy } from "../utils/clipboard";
import { Share_generateProfileLink } from "../models/share";
import { ILengthUnit, ISettings, IStats, ISubscription, IUnit } from "../types";
import { WhatsNew_showWhatsNew } from "../models/whatsnewUtils";
import { ImporterStorage } from "./importerStorage";
import { ImporterProgram } from "./importerProgram";
import { useNavOptions } from "../navigation/useNavOptions";
import { GroupHeader } from "./groupHeader";
import { HelpSettings } from "./help/helpSettings";
import { StringUtils_truncate } from "../utils/string";
import { IconDiscord } from "./icons/iconDiscord";
import {
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
} from "../utils/sendMessage";
import { IconSpeaker } from "./icons/iconSpeaker";
import { ImporterLiftosaurCsv } from "./importerLiftosaurCsv";
import { navigationRef } from "../navigation/navigationRef";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../lib/healthSync";
import { INavCommon } from "../models/state";
import { Stats_getCurrentBodyweight, Stats_getCurrentBodyfat, Stats_isEmpty } from "../models/stats";
import { Weight_print } from "../models/weight";
import { ImagePreloader_preload, ImagePreloader_dynoflex } from "../utils/imagePreloader";
import { Settings_getTheme, Settings_applyTheme } from "../models/settings";
import { TextSize_apply } from "../utils/textSize";
import { Features_isEnabled } from "../utils/features";
import { Slider } from "./primitives/slider";

interface IProps {
  dispatch: IDispatch;
  subscription: ISubscription;
  tempUserId?: string;
  stats: IStats;
  user?: IUser;
  currentProgramName?: string;
  settings: ISettings;
  navCommon: INavCommon;
}

function openExternal(url: string): void {
  Linking.openURL(url).catch(() => undefined);
}

export function ScreenSettings(props: IProps): JSX.Element {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const currentBodyweight = Stats_getCurrentBodyweight(props.stats);
  const currentBodyfat = Stats_getCurrentBodyfat(props.stats);

  useEffect(() => {
    if (Stats_isEmpty(props.stats)) {
      ImagePreloader_preload(ImagePreloader_dynoflex);
    }
  }, []);

  useNavOptions({ navTitle: "Me", navHelpContent: <HelpSettings /> });

  return (
    <View className="px-4">
      <MenuItem
        shouldShowRightArrow={true}
        name="Program"
        value={props.currentProgramName}
        onClick={() => {
          props.dispatch(Thunk_pushScreen("programs"));
        }}
      />
      <GroupHeader name="Account" topPadding={true} />
      <MenuItem
        name="Account"
        value={
          props.user?.email == null ? (
            <Text className="text-text-error">Not signed in</Text>
          ) : props.user?.email === "noemail@example.com" ? (
            "Signed In"
          ) : (
            StringUtils_truncate(props.user?.email || "", 30)
          )
        }
        shouldShowRightArrow={true}
        onClick={() => props.dispatch(Thunk_pushScreen("account"))}
      />
      <MenuItemEditable
        type="text"
        name="Nickname"
        value={props.settings.nickname || ""}
        nextLine={
          <View className="pb-1" style={{ marginTop: -8 }}>
            <Text className="text-xs text-text-secondary">Used for profile page if you have an account</Text>
          </View>
        }
        onChange={(newValue) => {
          props.dispatch({
            type: "UpdateSettings",
            lensRecording: lb<ISettings>()
              .p("nickname")
              .record(newValue ? newValue : undefined),
            desc: "Update nickname",
          });
        }}
      />
      {props.user && (
        <MenuItemEditable
          type="boolean"
          name="Is Profile Page Public?"
          value={props.settings.isPublicProfile ? "true" : "false"}
          nextLine={
            props.user?.id && props.settings.isPublicProfile ? (
              <View className="pb-1" style={{ marginTop: -8 }}>
                <View className="flex-row">
                  <Pressable
                    className="mr-auto"
                    onPress={() => {
                      const text = Share_generateProfileLink(props.user!.id);
                      if (text != null) {
                        ClipboardUtils_copy(text);
                        setIsCopied(true);
                      }
                    }}
                  >
                    <Text className="text-xs underline text-text-link">Copy Link To Clipboard</Text>
                  </Pressable>
                  <View className="ml-4">
                    <InternalLink
                      name="public-profile-page"
                      href={`/profile/${props.user.id}`}
                      className="text-xs underline text-text-link"
                    >
                      Open Public Profile Page
                    </InternalLink>
                  </View>
                </View>
                {isCopied && <Text className="text-xs italic text-text-success">Copied!</Text>}
              </View>
            ) : undefined
          }
          onChange={(newValue) => {
            if (props.user != null) {
              props.dispatch({
                type: "UpdateSettings",
                lensRecording: lb<ISettings>()
                  .p("isPublicProfile")
                  .record(newValue === "true"),
                desc: "Toggle public profile",
              });
            }
          }}
        />
      )}

      <MenuItem
        name="API Keys"
        shouldShowRightArrow={true}
        onClick={() => props.dispatch(Thunk_pushScreen("apiKeys"))}
      />

      <GroupHeader name="My Measurements" topPadding={true} />
      {currentBodyweight && (
        <MenuItem
          name="Bodyweight"
          value={Weight_print(currentBodyweight)}
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk_pushScreen("measurements", { key: "weight" }))}
        />
      )}
      {currentBodyfat && (
        <MenuItem
          name="Bodyfat"
          value={Weight_print(currentBodyfat)}
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk_pushScreen("measurements", { key: "bodyfat" }))}
        />
      )}
      <MenuItem
        name="Measurements"
        shouldShowRightArrow={true}
        onClick={() => props.dispatch(Thunk_pushScreen("measurements"))}
      />

      <GroupHeader name="Workout" topPadding={true} />
      <MenuItem
        name="Exercises"
        onClick={() => props.dispatch(Thunk_pushScreen("exercises"))}
        shouldShowRightArrow={true}
      />
      <MenuItem
        name="Muscle Groups"
        onClick={() => props.dispatch(Thunk_pushScreen("muscleGroups"))}
        shouldShowRightArrow={true}
      />
      <MenuItem name="Timers" onClick={() => props.dispatch(Thunk_pushScreen("timers"))} shouldShowRightArrow={true} />
      {props.settings.gyms.length > 1 && (
        <MenuItemEditable
          type="select"
          name="Current Gym"
          value={props.settings.currentGymId ?? props.settings.gyms[0].id}
          values={props.settings.gyms.map((g) => [g.id, g.name])}
          onChange={(newValue) => {
            if (newValue != null) {
              props.dispatch({
                type: "UpdateSettings",
                lensRecording: lb<ISettings>().p("currentGymId").record(newValue),
                desc: "Change current gym",
              });
            }
          }}
        />
      )}
      <MenuItem
        shouldShowRightArrow={true}
        name="Available Equipment"
        onClick={() => {
          if (props.settings.gyms.length > 1) {
            props.dispatch(Thunk_pushScreen("gyms"));
          } else {
            props.dispatch(Thunk_pushScreen("plates"));
          }
        }}
      />
      <MenuItemEditable
        type="select"
        name="Weight Units"
        value={props.settings.units}
        values={[
          ["kg", "kg"],
          ["lb", "lb"],
        ]}
        onChange={(newValue) => {
          props.dispatch({
            type: "UpdateSettings",
            lensRecording: lb<ISettings>()
              .p("units")
              .record(newValue as IUnit),
            desc: "Change weight units",
          });
        }}
      />
      <MenuItemEditable
        type="select"
        name="Length Units"
        value={props.settings.lengthUnits}
        values={[
          ["cm", "cm"],
          ["in", "in"],
        ]}
        onChange={(newValue) => {
          props.dispatch({
            type: "UpdateSettings",
            lensRecording: lb<ISettings>()
              .p("lengthUnits")
              .record(newValue as ILengthUnit),
            desc: "Change length units",
          });
        }}
      />
      <MenuItemEditable
        type="select"
        name="Week starts from:"
        value={props.settings.startWeekFromMonday ? "true" : "false"}
        values={[
          ["false", "Sunday"],
          ["true", "Monday"],
        ]}
        onChange={(newValue) => {
          props.dispatch({
            type: "UpdateSettings",
            lensRecording: lb<ISettings>()
              .p("startWeekFromMonday")
              .record(newValue === "true"),
            desc: "Toggle week start day",
          });
        }}
      />
      {((SendMessage_isIos() && SendMessage_iosAppVersion() >= 6) ||
        (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 13)) && (
        <MenuItemEditable
          type="boolean"
          name="Always On Display"
          value={props.settings.alwaysOnDisplay ? "true" : "false"}
          onChange={(newValue) => {
            props.dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("alwaysOnDisplay")
                .record(newValue === "true"),
              desc: "Toggle always-on display",
            });
          }}
        />
      )}
      {((SendMessage_isIos() && SendMessage_iosAppVersion() >= 7) ||
        (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 14)) && (
        <View>
          <GroupHeader name="Sound" topPadding={true} />
          <MenuItemEditable
            type="boolean"
            name="Vibration"
            value={props.settings.vibration ? "true" : "false"}
            onChange={(newValue) => {
              props.dispatch({
                type: "UpdateSettings",
                lensRecording: lb<ISettings>()
                  .p("vibration")
                  .record(newValue === "true"),
                desc: "Toggle vibration",
              });
            }}
          />
          <MenuItemWrapper name="volume">
            <View className="flex-row items-center py-2">
              <View className="mr-2">
                <IconSpeaker />
              </View>
              <View className="flex-1 flex-row">
                <Slider
                  value={props.settings.volume}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(value) => {
                    props.dispatch({
                      type: "UpdateSettings",
                      lensRecording: lb<ISettings>().p("volume").record(value),
                      desc: "Change volume",
                    });
                  }}
                />
              </View>
            </View>
          </MenuItemWrapper>
          {Subscriptions_hasSubscription(props.subscription) &&
            SendMessage_isAndroid() &&
            SendMessage_androidAppVersion() >= 17 && (
              <MenuItemEditable
                type="boolean"
                name="Ignore Do Not Disturb"
                value={props.settings.ignoreDoNotDisturb ? "true" : "false"}
                nextLine={
                  <View className="mb-2" style={{ marginTop: -8 }}>
                    <Text className="text-xs text-text-secondary">
                      Push notification will make a sound even in Silent or Do Not Disturb mode
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
        </View>
      )}
      {(HealthSync_eligibleForAppleHealth() || HealthSync_eligibleForGoogleHealth()) && (
        <>
          <GroupHeader name="Sync" topPadding={true} />
          {HealthSync_eligibleForGoogleHealth() && (
            <MenuItem
              shouldShowRightArrow={true}
              name="Google Health Connect"
              onClick={() => props.dispatch(Thunk_pushScreen("googleHealth"))}
            />
          )}
          {HealthSync_eligibleForAppleHealth() && (
            <MenuItem
              shouldShowRightArrow={true}
              name="Apple Health"
              onClick={() => props.dispatch(Thunk_pushScreen("appleHealth"))}
            />
          )}
        </>
      )}
      <GroupHeader name="Appearance" topPadding={true} />
      <MenuItemWrapper name="text-size">
        <View className="flex-row items-center py-2">
          <View className="flex-row items-baseline mr-2">
            <Text className="text-xs">A</Text>
            <Text className="text-lg">A</Text>
          </View>
          <View className="flex-1 flex-row">
            <Slider
              value={props.settings.textSize ?? 16}
              min={12}
              max={20}
              step={2}
              onChange={(value) => {
                TextSize_apply(value);
                props.dispatch({
                  type: "UpdateSettings",
                  lensRecording: lb<ISettings>().p("textSize").record(value),
                  desc: "Change text size",
                });
              }}
            />
          </View>
        </View>
      </MenuItemWrapper>
      <MenuItemEditable
        type="boolean"
        name="Dark mode"
        value={Settings_getTheme(props.settings) === "dark" ? "true" : "false"}
        onChange={(newValue) => {
          const newTheme = newValue === "true" ? "dark" : "light";
          Settings_applyTheme(newTheme);
          props.dispatch({
            type: "UpdateSettings",
            lensRecording: lb<ISettings>().p("theme").record(newTheme),
            desc: "Toggle dark mode",
          });
        }}
      />
      {Features_isEnabled("affiliates", props.user?.id ?? props.tempUserId) && (
        <>
          <GroupHeader name="Earn money with Liftosaur" topPadding={true} />
          <MenuItem
            expandName={true}
            name="Affiliate Program"
            onClick={() => navigationRef.navigate("affiliateModal")}
            value={props.settings.affiliateEnabled ? "On" : "Off"}
            shouldShowRightArrow={true}
          />
        </>
      )}
      <GroupHeader name="Import / Export" topPadding={true} />
      <MenuItemWrapper name="Export data to JSON file" onClick={() => props.dispatch(Thunk_exportStorage())}>
        <View className="py-3">
          <Text className="text-base text-text-primary">Export data to JSON file</Text>
        </View>
      </MenuItemWrapper>
      <MenuItemWrapper name="Export history to CSV file" onClick={() => props.dispatch(Thunk_exportHistoryToCSV())}>
        <View className="py-3">
          <Text className="text-base text-text-primary">Export history to CSV file</Text>
        </View>
      </MenuItemWrapper>
      <MenuItemWrapper
        name="Export all programs to text file"
        onClick={() => props.dispatch(Thunk_exportProgramsToText())}
      >
        <View className="py-3">
          <Text className="text-base text-text-primary">Export all programs to text file</Text>
        </View>
      </MenuItemWrapper>
      <ImporterLiftosaurCsv dispatch={props.dispatch} />
      <ImporterStorage dispatch={props.dispatch} />
      <ImporterProgram dispatch={props.dispatch} />
      <MenuItemWrapper
        name="Import history from other apps"
        onClick={() => navigationRef.navigate("importFromOtherAppsModal")}
      >
        <View className="py-3">
          <Text className="text-base text-text-primary">Import history from other apps</Text>
        </View>
      </MenuItemWrapper>

      <GroupHeader name="Miscellaneous" topPadding={true} />
      <MenuItem name="Changelog" onClick={() => WhatsNew_showWhatsNew(props.dispatch)} />
      <Pressable
        className="py-3 border-b border-border-neutral"
        onPress={() => openExternal("mailto:info@liftosaur.com")}
      >
        <Text className="text-base text-text-primary">Contact Us</Text>
      </Pressable>
      <Pressable
        className="py-3 border-b border-border-neutral"
        onPress={() => openExternal("https://discord.com/invite/AAh3cvdBRs")}
      >
        <View className="flex-row items-center">
          <View className="mr-1">
            <IconDiscord />
          </View>
          <Text className="text-base text-text-primary">Discord Server</Text>
        </View>
      </Pressable>
      <Pressable
        className="py-3 border-b border-border-neutral"
        onPress={() => openExternal("https://www.liftosaur.com/privacy.html")}
      >
        <Text className="text-base text-text-primary">Privacy Policy</Text>
      </Pressable>
      <Pressable
        className="py-3 border-b border-border-neutral"
        onPress={() => openExternal("https://www.liftosaur.com/terms.html")}
      >
        <Text className="text-base text-text-primary">Terms & Conditions</Text>
      </Pressable>
      <Pressable
        className="py-3 border-b border-border-neutral"
        onPress={() => openExternal("https://www.liftosaur.com/licenses.html")}
      >
        <Text className="text-base text-text-primary">Licenses</Text>
      </Pressable>
      <Pressable
        className="py-3 border-b border-border-neutral"
        onPress={() => openExternal("https://www.liftosaur.com/doc")}
      >
        <Text className="text-base text-text-primary">Documentation</Text>
      </Pressable>
      <Pressable
        className="py-3 border-b border-border-neutral"
        onPress={() => openExternal("https://github.com/astashov/liftosaur")}
      >
        <Text className="text-base text-text-primary">Source Code on Github</Text>
      </Pressable>
      <Pressable
        className="py-3 border-b border-border-neutral"
        onPress={() => openExternal("https://github.com/astashov/liftosaur/discussions")}
      >
        <Text className="text-base text-text-primary">📍 Roadmap</Text>
      </Pressable>
    </View>
  );
}
