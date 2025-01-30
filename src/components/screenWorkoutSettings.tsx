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
import { useState } from "preact/hooks";
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
import { MenuItemGroup } from "./menuItemGroup";
import { IconUser } from "./icons/iconUser";
import { IconDoc2 } from "./icons/iconDoc2";
import { IconFilter } from "./icons/iconFilter";
import { IconDumbbell2 } from "./icons/iconDumbbell2";
import { IconScale } from "./icons/iconScale";
import { Stats } from "../models/stats";
import { Weight } from "../models/weight";
import { IconBodyfat } from "./icons/iconBodyfat";
import { IconRuler } from "./icons/iconRuler";
import { IconImportExport } from "./icons/iconImportExport";
import { IconHealth } from "./icons/iconHealth";
import { IconLetter } from "./icons/iconLetter";
import { IconDocs } from "./icons/iconDocs";
import { IconSourceCode } from "./icons/iconSourceCode";
import { IconCog2 } from "./icons/iconCog2";

interface IProps {
  dispatch: IDispatch;
  subscription: ISubscription;
  user?: IUser;
  currentProgramName?: string;
  stats: IStats;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenSettings(props: IProps): JSX.Element {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showImportFromOtherAppsModal, setShowImportFromOtherAppsModal] = useState(false);
  const currentBodyweight = Stats.getCurrentBodyweight(props.stats);
  const currentBodyfat = Stats.getCurrentBodyfat(props.stats);
  const currentAccount =
    props.user?.email == null
      ? "Not signed in"
      : props.user?.email === "noemail@example.com"
      ? "Signed In"
      : StringUtils.truncate(props.user?.email || "", 30);

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
      <section className="flex flex-col gap-5 px-4">
        <MenuItemGroup
          title="My Account"
          name="settings-my-account"
          items={[
            {
              icon: <IconUser />,
              title: "Account",
              right: "arrow",
              value: currentAccount,
              onClick: () => props.dispatch(Thunk.pushScreen("account")),
            },
          ]}
        />

        <MenuItemGroup
          title="Workout"
          name="settings-workout"
          items={[
            {
              icon: <IconDoc2 />,
              title: "Program",
              right: "arrow",
              value: props.currentProgramName,
              onClick: () => props.dispatch(Thunk.pushScreen("programs")),
            },
            {
              icon: <IconDumbbell2 />,
              title: "Exercises",
              right: "arrow",
              onClick: () => props.dispatch(Thunk.pushScreen("exercises")),
            },
            {
              icon: <IconFilter />,
              title: "Workout Settings",
              subtitle: "Units, timers, and equipment",
              right: "arrow",
              onClick: () => props.dispatch(Thunk.pushScreen("exercises")),
            },
          ]}
        />

        <MenuItemGroup
          title="My Measurements"
          name="settings-measurements"
          items={[
            {
              icon: <IconScale />,
              title: "Bodyweight",
              right: "arrow",
              value: currentBodyweight ? Weight.print(currentBodyweight) : undefined,
              onClick: () => props.dispatch(Thunk.pushScreen("measurements")),
            },
            ...(currentBodyfat != null
              ? [
                  {
                    icon: <IconBodyfat />,
                    title: "Bodyfat",
                    right: "arrow" as const,
                    value: currentBodyfat ? Weight.print(currentBodyfat) : undefined,
                    onClick: () => props.dispatch(Thunk.pushScreen("measurements")),
                  },
                ]
              : []),
            {
              icon: <IconRuler />,
              title: "Measurements",
              right: "arrow",
              onClick: () => props.dispatch(Thunk.pushScreen("measurements")),
            },
          ]}
        />

        <MenuItemGroup
          title="App"
          name="settings-app"
          items={[
            {
              icon: <IconCog2 />,
              title: "Settings",
              right: "arrow",
              onClick: () => props.dispatch(Thunk.pushScreen("measurements")),
            },
            {
              icon: <IconImportExport />,
              title: "Import / Export",
              right: "arrow",
              onClick: () => props.dispatch(Thunk.pushScreen("measurements")),
            },
            ...(HealthSync.eligibleForAppleHealth()
              ? [
                  {
                    icon: <IconHealth />,
                    title: "Sync with Apple Health",
                    right: "arrow" as const,
                    onClick: () => props.dispatch(Thunk.pushScreen("appleHealth")),
                  },
                ]
              : HealthSync.eligibleForGoogleHealth()
              ? [
                  {
                    icon: <IconHealth />,
                    title: "Sync with Google Health",
                    right: "arrow" as const,
                    onClick: () => props.dispatch(Thunk.pushScreen("googleHealth")),
                  },
                ]
              : []),
          ]}
        />

        <MenuItemGroup
          title="Help"
          name="settings-help"
          items={[
            {
              icon: <IconLetter />,
              type: { type: "internal", href: "mailto:info@liftosaur.com" },
              title: "Contact Us",
              right: "external",
            },
            {
              icon: <IconDiscord />,
              type: { type: "external", href: "https://discord.com/invite/AAh3cvdBRs" },
              title: "Discord",
              right: "external",
            },
            {
              icon: <IconDocs />,
              type: { type: "internal", href: "/docs" },
              title: "Documentation",
              right: "external",
            },
            {
              icon: <IconSourceCode />,
              type: { type: "external", href: "https://github.com/astashov/liftosaur" },
              title: "Source Code on Github",
              right: "external",
            },
          ]}
        />

        <MenuItemGroup
          name="settings-rest"
          items={[
            {
              onClick: () => WhatsNew.showWhatsNew(props.dispatch),
              title: "Changelog",
              right: "arrow",
            },
            {
              type: { type: "external", href: "https://github.com/astashov/liftosaur/discussions" },
              title: "Roadmap",
              right: "external",
            },
            {
              type: { type: "internal", href: "/privacy.html" },
              title: "Privacy Policy",
              right: "external",
            },
            {
              type: { type: "internal", href: "/terms.html" },
              title: "Terms & Conditions",
              right: "external",
            },
            {
              type: { type: "internal", href: "/licenses.html" },
              title: "Licenses",
              right: "external",
            },
          ]}
        />

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
    </Surface>
  );
}
