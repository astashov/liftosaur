import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettings } from "../types";
import { INavCommon } from "../models/state";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
import { NavbarView } from "./navbar";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenAppleHealthSettings(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="Apple Health" />}
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        <MenuItemEditable
          name="Sync Workouts"
          type="boolean"
          value={props.settings.appleHealthSyncWorkout ? "true" : "false"}
          onChange={(newValue?: string) => {
            props.dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("appleHealthSyncWorkout")
                .record(newValue === "true"),
            });
          }}
        />
        <MenuItemEditable
          name="Sync Measurements"
          type="boolean"
          value={props.settings.appleHealthSyncMeasurements ? "true" : "false"}
          onChange={(newValue?: string) => {
            props.dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("appleHealthSyncMeasurements")
                .record(newValue === "true"),
            });
          }}
        />
      </section>
    </Surface>
  );
}
