import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { MenuItem, MenuItemWrapper } from "./menuItem";
import { Thunk } from "../ducks/thunks";
import { MenuItemEditable } from "./menuItemEditable";
import { lb } from "lens-shmens";
import { InternalLink } from "../internalLink";
import { IUser } from "../models/user";
import { ClipboardUtils } from "../utils/clipboard";
import { Share } from "../models/share";
import { useEffect, useState } from "preact/hooks";
import { ILengthUnit, ISettings, IStats, ISubscription, IUnit } from "../types";
import { WhatsNew } from "../models/whatsnew";
import { ImporterStorage } from "./importerStorage";
import { ImporterProgram } from "./importerProgram";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
import { GroupHeader } from "./groupHeader";
import { HelpSettings } from "./help/helpSettings";
import { StringUtils } from "../utils/string";
import { IconDiscord } from "./icons/iconDiscord";
import { SendMessage } from "../utils/sendMessage";
import { IconSpeaker } from "./icons/iconSpeaker";
import { ModalImportFromOtherApps } from "./modalImportFromOtherApps";
import { ImporterLiftosaurCsv } from "./importerLiftosaurCsv";
import { Subscriptions } from "../utils/subscriptions";
import { HealthSync } from "../lib/healthSync";
import { INavCommon } from "../models/state";
import { Stats } from "../models/stats";
import { Weight } from "../models/weight";
import { ImagePreloader } from "../utils/imagePreloader";

interface IProps {
  dispatch: IDispatch;
  subscription: ISubscription;
  stats: IStats;
  user?: IUser;
  currentProgramName?: string;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenSettings(props: IProps): JSX.Element {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showImportFromOtherAppsModal, setShowImportFromOtherAppsModal] = useState(false);
  const currentBodyweight = Stats.getCurrentBodyweight(props.stats);
  const currentBodyfat = Stats.getCurrentBodyfat(props.stats);

  useEffect(() => {
    if (Stats.isEmpty(props.stats)) {
      ImagePreloader.preload(ImagePreloader.dynoflex);
    }
  }, []);

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          helpContent={<HelpSettings />}
          title="Settings"
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={
        <>
          <ModalImportFromOtherApps
            dispatch={props.dispatch}
            isHidden={!showImportFromOtherAppsModal}
            onClose={() => setShowImportFromOtherAppsModal(false)}
          />
        </>
      }
    >
      <section className="px-4">
        <MenuItem
          shouldShowRightArrow={true}
          name="Program"
          value={props.currentProgramName}
          onClick={() => {
            props.dispatch({ type: "PushScreen", screen: "programs" });
          }}
        />
        <GroupHeader name="Account" topPadding={true} />
        <MenuItem
          name="Account"
          value={
            props.user?.email == null ? (
              <span className="text-redv2-main">Not signed in</span>
            ) : props.user?.email === "noemail@example.com" ? (
              "Signed In"
            ) : (
              StringUtils.truncate(props.user?.email || "", 30)
            )
          }
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk.pushScreen("account"))}
        />
        <MenuItemEditable
          type="text"
          name="Nickname"
          value={props.settings.nickname || ""}
          nextLine={
            <div style={{ marginTop: "-0.5rem" }} className="pb-1 text-xs text-grayv2-main">
              Used for profile page if you have an account
            </div>
          }
          onChange={(newValue) => {
            props.dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("nickname")
                .record(newValue ? newValue : undefined),
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
                <div style={{ marginTop: "-0.5rem" }} className="pb-1">
                  <div className="flex">
                    <button
                      className="mr-auto text-xs text-left text-blue-700 underline nm-copy-profile-link-to-clipboard"
                      onClick={() => {
                        const text = Share.generateProfileLink(props.user!.id);
                        if (text != null) {
                          ClipboardUtils.copy(text);
                          setIsCopied(true);
                        }
                      }}
                    >
                      Copy Link To Clipboard
                    </button>
                    <InternalLink
                      name="public-profile-page"
                      href={`/profile/${props.user.id}`}
                      className="ml-4 text-xs text-right text-blue-700 underline"
                    >
                      Open Public Profile Page
                    </InternalLink>
                  </div>
                  {isCopied && <div className="text-xs italic text-green-600">Copied!</div>}
                </div>
              ) : undefined
            }
            onChange={(newValue) => {
              if (props.user != null) {
                props.dispatch({
                  type: "UpdateSettings",
                  lensRecording: lb<ISettings>()
                    .p("isPublicProfile")
                    .record(newValue === "true"),
                });
              } else {
                alert("You should be logged in to enable public profile");
              }
            }}
          />
        )}

        <GroupHeader name="My Measurements" topPadding={true} />
        {currentBodyweight && (
          <MenuItem
            name="Bodyweight"
            value={Weight.print(currentBodyweight)}
            shouldShowRightArrow={true}
            onClick={() => props.dispatch(Thunk.pushScreen("measurements", { key: "weight" }))}
          />
        )}
        {currentBodyfat && (
          <MenuItem
            name="Bodyfat"
            value={Weight.print(currentBodyfat)}
            shouldShowRightArrow={true}
            onClick={() => props.dispatch(Thunk.pushScreen("measurements", { key: "bodyfat" }))}
          />
        )}
        <MenuItem
          name="Measurements"
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk.pushScreen("measurements"))}
        />

        <GroupHeader name="Workout" topPadding={true} />
        <MenuItem
          name="Exercises"
          onClick={() => props.dispatch(Thunk.pushScreen("exercises"))}
          shouldShowRightArrow={true}
        />
        <MenuItem
          name="Timers"
          onClick={() => props.dispatch(Thunk.pushScreen("timers"))}
          shouldShowRightArrow={true}
        />
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
              props.dispatch(Thunk.pushScreen("gyms"));
            } else {
              props.dispatch(Thunk.pushScreen("plates"));
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
            });
          }}
        />
        {((SendMessage.isIos() && SendMessage.iosAppVersion() >= 6) ||
          (SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 13)) && (
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
              });
            }}
          />
        )}
        {((SendMessage.isIos() && SendMessage.iosAppVersion() >= 7) ||
          (SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 14)) && (
          <div>
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
                });
              }}
            />
            <MenuItemWrapper name="volume">
              <div className="flex items-center py-2">
                <div className="mr-2">
                  <IconSpeaker />
                </div>
                <div className="flex flex-1 leading-none">
                  <input
                    type="range"
                    className="w-full"
                    min="0"
                    max="1"
                    step="0.01"
                    value={props.settings.volume}
                    onChange={(e) => {
                      const valueStr = e.currentTarget.value;
                      const value = valueStr != null ? parseFloat(valueStr) : undefined;
                      if (value != null && !isNaN(value)) {
                        props.dispatch({
                          type: "UpdateSettings",
                          lensRecording: lb<ISettings>().p("volume").record(value),
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </MenuItemWrapper>
            {Subscriptions.hasSubscription(props.subscription) &&
              SendMessage.isAndroid() &&
              SendMessage.androidAppVersion() >= 17 && (
                <MenuItemEditable
                  type="boolean"
                  name="Ignore Do Not Disturb"
                  value={props.settings.ignoreDoNotDisturb ? "true" : "false"}
                  nextLine={
                    <div className="mb-2 text-xs text-grayv2-main" style={{ marginTop: "-0.5rem" }}>
                      Push notification will make a sound even in Silent or Do Not Disturb mode
                    </div>
                  }
                  onChange={(newValue) => {
                    props.dispatch({
                      type: "UpdateSettings",
                      lensRecording: lb<ISettings>()
                        .p("ignoreDoNotDisturb")
                        .record(newValue === "true"),
                    });
                  }}
                />
              )}
          </div>
        )}
        {(HealthSync.eligibleForAppleHealth() || HealthSync.eligibleForGoogleHealth()) && (
          <>
            <GroupHeader name="Sync" topPadding={true} />
            {HealthSync.eligibleForGoogleHealth() && (
              <MenuItem
                shouldShowRightArrow={true}
                name="Google Health Connect"
                onClick={() => props.dispatch(Thunk.pushScreen("googleHealth"))}
              />
            )}
            {HealthSync.eligibleForAppleHealth() && (
              <MenuItem
                shouldShowRightArrow={true}
                name="Apple Health"
                onClick={() => props.dispatch(Thunk.pushScreen("appleHealth"))}
              />
            )}
          </>
        )}
        <GroupHeader name="Appearance" topPadding={true} />
        <MenuItemWrapper name="text-size">
          <div className="flex items-center py-2">
            <div className="mr-2">
              <span className="text-xs">A</span>
              <span className="text-lg">A</span>
            </div>
            <div className="flex flex-1 leading-none">
              <input
                type="range"
                className="w-full"
                min="12"
                max="20"
                step="2"
                value={props.settings.textSize ?? "16"}
                onChange={(e) => {
                  const valueStr = e.currentTarget.value;
                  const value = valueStr != null ? parseInt(valueStr) : undefined;
                  if (value != null && !isNaN(value)) {
                    props.dispatch({
                      type: "UpdateSettings",
                      lensRecording: lb<ISettings>().p("textSize").record(value),
                    });
                  }
                }}
              />
            </div>
          </div>
        </MenuItemWrapper>

        <GroupHeader name="Import / Export" topPadding={true} />
        <div className="ls-export-data">
          <MenuItemWrapper name="Export data to JSON file" onClick={() => props.dispatch(Thunk.exportStorage())}>
            <button className="py-3 nm-export-data-to-json-file">Export data to JSON file</button>
          </MenuItemWrapper>
        </div>
        <div className="ls-export-history">
          <MenuItemWrapper name="Export history to CSV file" onClick={() => props.dispatch(Thunk.exportHistoryToCSV())}>
            <button className="py-3 nm-export-history-to-csv-file">Export history to CSV file</button>
          </MenuItemWrapper>
        </div>
        <div className="ls-import-csv-data">
          <ImporterLiftosaurCsv dispatch={props.dispatch} />
        </div>
        <div className="ls-import-data">
          <ImporterStorage dispatch={props.dispatch} />
        </div>
        <div className="ls-import-program">
          <ImporterProgram dispatch={props.dispatch} />
        </div>
        <div className="ls-import-other-apps">
          <MenuItemWrapper name="Import history from other apps" onClick={() => setShowImportFromOtherAppsModal(true)}>
            <button className="py-3 nm-import-history-from-other-apps">Import history from other apps</button>
          </MenuItemWrapper>
        </div>

        <GroupHeader name="Miscellaneous" topPadding={true} />
        <div className="ls-changelog">
          <MenuItem name="Changelog" onClick={() => WhatsNew.showWhatsNew(props.dispatch)} />
        </div>
        <InternalLink
          name="contact-us"
          href="mailto:info@liftosaur.com"
          className="block py-3 text-base text-left border-b border-gray-200"
        >
          Contact Us
        </InternalLink>
        <a
          href="https://discord.com/invite/AAh3cvdBRs"
          target="_blank"
          className="block py-3 text-base text-left border-b border-gray-200"
        >
          <IconDiscord className="inline-block mr-1" /> Discord Server
        </a>
        <InternalLink
          name="privacy-policy"
          href="/privacy.html"
          className="block py-3 text-base text-left border-b border-gray-200"
        >
          Privacy Policy
        </InternalLink>
        <InternalLink
          name="terms"
          href="/terms.html"
          className="block py-3 text-base text-left border-b border-gray-200"
        >
          Terms &amp; Conditions
        </InternalLink>
        <InternalLink
          name="licenses"
          href="/licenses.html"
          className="block py-3 text-base text-left border-b border-gray-200"
        >
          Licenses
        </InternalLink>
        <InternalLink
          name="documentation"
          href="/docs"
          className="block py-3 text-base text-left border-b border-gray-200"
        >
          Documentation
        </InternalLink>
        <a
          href="https://github.com/astashov/liftosaur"
          className="block py-3 text-base text-left border-b border-gray-200"
        >
          Source Code on Github
        </a>
        <a
          href="https://github.com/astashov/liftosaur/discussions"
          className="block py-3 text-base text-left border-b border-gray-200"
        >
          📍 Roadmap
        </a>
      </section>
    </Surface>
  );
}
