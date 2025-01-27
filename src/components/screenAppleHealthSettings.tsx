import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { MenuItemEditable } from "./menuItemEditable";
import { IProgram, ISettings } from "../types";
import { ILoading } from "../models/state";
import { IScreen, Screen } from "../models/screen";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
import { NavbarView } from "./navbar";

interface IProps {
  dispatch: IDispatch;
  loading: ILoading;
  screenStack: IScreen[];
  settings: ISettings;
  currentProgram: IProgram;
}

export function ScreenAppleHealthSettings(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Apple Health"
        />
      }
      footer={
        <Footer2View
          currentProgram={props.currentProgram}
          settings={props.settings}
          dispatch={props.dispatch}
          screen={Screen.current(props.screenStack)}
        />
      }
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
