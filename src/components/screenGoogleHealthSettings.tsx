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
  currentProgram: IProgram;
  screenStack: IScreen[];
  settings: ISettings;
}

export function ScreenGoogleHealthSettings(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Google Health Connect"
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
