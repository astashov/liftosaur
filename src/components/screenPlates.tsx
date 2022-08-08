import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { ISettings } from "../types";
import { ILoading, IState } from "../models/state";
import { EquipmentSettings } from "./equipmentSettings";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { ILensDispatchSimple } from "../utils/useLensReducer";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  loading: ILoading;
}

function dispatch(originalDispatch: IDispatch): ILensDispatchSimple<IState> {
  return (lensRecording: ILensRecordingPayload<IState>) => {
    originalDispatch({ type: "UpdateState", lensRecording: [lensRecording] });
  };
}

export function ScreenPlates(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView
        title="Equipment Settings"
        left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <EquipmentSettings
          lensPrefix={lb<IState>().p("storage").p("settings").get()}
          dispatch={dispatch(props.dispatch)}
          settings={props.settings}
        />
      </section>
      <FooterView loading={props.loading} dispatch={props.dispatch} />
    </section>
  );
}
