import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { ISettings, IEquipment } from "../types";
import { ILoading, IState, updateState } from "../models/state";
import { EquipmentSettings } from "./equipmentSettings";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { ILensDispatch } from "../utils/useLensReducer";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IScreen, Screen } from "../models/screen";
import { HelpPlates } from "./help/helpPlates";
import { useEffect } from "preact/hooks";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  expandedEquipment?: IEquipment;
  loading: ILoading;
  screenStack: IScreen[];
}

function dispatch(originalDispatch: IDispatch): ILensDispatch<IState> {
  return (lensRecording: ILensRecordingPayload<IState>[] | ILensRecordingPayload<IState>) => {
    originalDispatch({
      type: "UpdateState",
      lensRecording: Array.isArray(lensRecording) ? lensRecording : [lensRecording],
    });
  };
}

export function ScreenPlates(props: IProps): JSX.Element {
  useEffect(() => {
    if (props.expandedEquipment) {
      const el = document.getElementById(props.expandedEquipment);
      if (el) {
        const offsetY = el.getBoundingClientRect().top + document.documentElement.scrollTop;
        window.scrollTo(0, offsetY - 70);
      }
      updateState(props.dispatch, [lb<IState>().p("defaultEquipmentExpanded").record(undefined)]);
    }
  }, []);

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Equipment Settings"
          helpContent={<HelpPlates />}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
    >
      <section className="px-2">
        <EquipmentSettings
          expandedEquipment={props.expandedEquipment}
          lensPrefix={lb<IState>().p("storage").p("settings").get()}
          dispatch={dispatch(props.dispatch)}
          settings={props.settings}
        />
      </section>
    </Surface>
  );
}
