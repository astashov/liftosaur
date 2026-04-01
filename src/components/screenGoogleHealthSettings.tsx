import type { JSX } from "react";
import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { ISettings } from "../types";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenGoogleHealthSettings(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Google Health Connect" });

  return (
    <>
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
              desc: "Toggle Google Health workouts",
            });
          }}
        />
        <MenuItemEditable
          name="Confirm each workout sync?"
          type="boolean"
          value={props.settings.healthConfirmation ? "true" : "false"}
          onChange={(newValue?: string) => {
            props.dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("healthConfirmation")
                .record(newValue === "true"),
              desc: "Toggle Health workout confirmation",
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
              desc: "Toggle Google Health measurements",
            });
          }}
        />
      </section>
    </>
  );
}
