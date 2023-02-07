import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, ISettings, ISubscription } from "../types";
import { ILoading } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IScreen, Screen } from "../models/screen";
import { ProgramPreview } from "./programPreview";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  programs: IProgram[];
  selectedProgramId: string;
  subscription: ISubscription;
  loading: ILoading;
  screenStack: IScreen[];
}

export function ScreenProgramPreview(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Program Preview"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
    >
      <ProgramPreview
        dispatch={props.dispatch}
        settings={props.settings}
        programs={props.programs}
        selectedProgramId={props.selectedProgramId}
        subscription={props.subscription}
      />
    </Surface>
  );
}
