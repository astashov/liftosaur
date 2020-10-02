import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { MenuItem } from "./menuItem";
import { Thunk } from "../ducks/thunks";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettings } from "../models/settings";
import { lb } from "../utils/lens";
import { IUnit } from "../models/weight";

interface IProps {
  dispatch: IDispatch;
  email?: string;
  currentProgramName?: string;
  settings: ISettings;
}

export function ScreenSettings(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView title="Settings" left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>} />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <MenuItem
          name="Account"
          value={props.email}
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk.pushScreen("account"))}
        />
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
          name="Units"
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
        <a href="mailto:info@liftosaur.com" className="block w-full px-6 py-3 text-left border-b border-gray-200">
          Contact Us
        </a>
        <a
          href="/privacy.html"
          target="_blank"
          className="block w-full px-6 py-3 text-left border-b border-gray-200"
          onClick={(e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window.navigator as any).standalone) {
              e.preventDefault();
              window.open("https://liftosaur.netlify.app/privacy.html", "_blank");
            }
          }}
        >
          Privacy Policy
        </a>
        <a
          href="/terms.html"
          target="_blank"
          className="block w-full px-6 py-3 text-left border-b border-gray-200"
          onClick={(e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window.navigator as any).standalone) {
              e.preventDefault();
              window.open("https://liftosaur.netlify.app/terms.html", "_blank");
            }
          }}
        >
          Terms &amp; Conditions
        </a>
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
