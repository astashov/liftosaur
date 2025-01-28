import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettings } from "../types";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
import { NavbarView } from "./navbar";
import { INavCommon } from "../models/state";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenGoogleHealthSettings(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="Google Health Connect" />}
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        <MenuItemEditable
          name="Sync Workouts"
          type="boolean"
          value={props.settings.googleHealthSyncWorkout ? "true" : "false"}
          onChange={(newValue?: string) => {
            props.dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("googleHealthSyncWorkout")
                .record(newValue === "true"),
            });
          }}
        />
        <MenuItemEditable
          name="Sync Measurements"
          type="boolean"
          value={props.settings.googleHealthSyncMeasurements ? "true" : "false"}
          onChange={(newValue?: string) => {
            props.dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("googleHealthSyncMeasurements")
                .record(newValue === "true"),
            });
          }}
        />
      </section>
    </Surface>
  );
}
