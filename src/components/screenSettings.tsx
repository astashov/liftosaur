import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { MenuItem } from "./menuItem";
import { Thunk } from "../ducks/thunks";
import { MenuItemEditable } from "./menuItemEditable";
import { lb } from "lens-shmens";
import { InternalLink } from "../internalLink";
import { IUser } from "../models/user";
import { ClipboardUtils } from "../utils/clipboard";
import { Share } from "../models/share";
import { useState } from "preact/hooks";
import { ILengthUnit, ISettings, IUnit } from "../types";
import { ILoading } from "../models/state";
import { WhatsNew } from "../models/whatsnew";

interface IProps {
  dispatch: IDispatch;
  user?: IUser;
  currentProgramName?: string;
  settings: ISettings;
  loading: ILoading;
}

export function ScreenSettings(props: IProps): JSX.Element {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  return (
    <section className="h-full">
      <HeaderView
        title="Settings"
        left={
          <button data-cy="back" onClick={() => props.dispatch(Thunk.pullScreen())}>
            Back
          </button>
        }
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <MenuItem
          name="Account"
          value={props.user?.email}
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk.pushScreen("account"))}
        />
        {props.user && (
          <MenuItem
            shouldShowRightArrow={true}
            name="Friends"
            onClick={() => {
              props.dispatch({ type: "PushScreen", screen: "friends" });
            }}
          />
        )}
        {props.user && (
          <MenuItemEditable
            type="select"
            name="Show friends history?"
            value={props.settings.shouldShowFriendsHistory ? "true" : "false"}
            values={[
              ["true", "Yes"],
              ["false", "No"],
            ]}
            onChange={(newValue) => {
              props.dispatch({
                type: "UpdateSettings",
                lensRecording: lb<ISettings>()
                  .p("shouldShowFriendsHistory")
                  .record(newValue === "true"),
              });
            }}
          />
        )}
        <MenuItem
          shouldShowRightArrow={true}
          name="Choose Program"
          value={props.currentProgramName}
          onClick={() => {
            props.dispatch({ type: "PushScreen", screen: "programs" });
          }}
        />
        <MenuItem
          name="Timers"
          onClick={() => props.dispatch(Thunk.pushScreen("timers"))}
          shouldShowRightArrow={true}
        />
        <MenuItem
          shouldShowRightArrow={true}
          name="Available Plates"
          onClick={() => props.dispatch(Thunk.pushScreen("plates"))}
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
          name="Is Profile Page Public?"
          value={props.settings.isPublicProfile ? "true" : "false"}
          values={[
            ["true", "Yes"],
            ["false", "No"],
          ]}
          nextLine={
            props.user?.id && props.settings.isPublicProfile ? (
              <div>
                <div className="flex">
                  <button
                    className="mr-auto text-xs text-left text-blue-700 underline"
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
        <MenuItemEditable
          type="text"
          name="Nickname"
          value={props.settings.nickname || ""}
          nextLine={<div className="text-xs italic text-right">Used for profile page</div>}
          onChange={(newValue) => {
            props.dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("nickname")
                .record(newValue ? newValue : undefined),
            });
          }}
        />
        <MenuItem name="Changelog" onClick={() => WhatsNew.showWhatsNew(props.dispatch)} />
        <a href="mailto:info@liftosaur.com" className="block w-full px-6 py-3 text-left border-b border-gray-200">
          Contact Us
        </a>
        <InternalLink href="/privacy.html" className="block w-full px-6 py-3 text-left border-b border-gray-200">
          Privacy Policy
        </InternalLink>
        <InternalLink href="/terms.html" className="block w-full px-6 py-3 text-left border-b border-gray-200">
          Terms &amp; Conditions
        </InternalLink>
        <InternalLink href="/docs/docs.html" className="block w-full px-6 py-3 text-left border-b border-gray-200">
          Documentation
        </InternalLink>
        <a
          href="https://github.com/astashov/liftosaur"
          className="block w-full px-6 py-3 text-left border-b border-gray-200"
        >
          Source Code on Github
        </a>
      </section>
      <FooterView loading={props.loading} dispatch={props.dispatch} />
    </section>
  );
}
