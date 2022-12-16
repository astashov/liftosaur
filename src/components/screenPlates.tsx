import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { ISettings } from "../types";
import { ILoading, IState } from "../models/state";
import { EquipmentSettings } from "./equipmentSettings";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { ILensDispatchSimple } from "../utils/useLensReducer";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { rightFooterButtons } from "./rightFooterButtons";
import { IScreen } from "../models/screen";
import { HelpPlates } from "./help/helpPlates";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  loading: ILoading;
  screenStack: IScreen[];
}

function dispatch(originalDispatch: IDispatch): ILensDispatchSimple<IState> {
  return (lensRecording: ILensRecordingPayload<IState>) => {
    originalDispatch({ type: "UpdateState", lensRecording: [lensRecording] });
  };
}

export function ScreenPlates(props: IProps): JSX.Element {
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
      footer={<Footer2View dispatch={props.dispatch} rightButtons={rightFooterButtons({ dispatch: props.dispatch })} />}
    >
      <section className="px-2">
        <EquipmentSettings
          lensPrefix={lb<IState>().p("storage").p("settings").get()}
          dispatch={dispatch(props.dispatch)}
          settings={props.settings}
        />
      </section>
    </Surface>
  );
}
