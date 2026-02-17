import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { Screen } from "../models/screen";
import { IProgram, ISettings, ISubscription } from "../types";
import { INavCommon } from "../models/state";
import { ScreenProgram } from "./editProgram/screenProgram";
import { IPlannerState } from "../pages/planner/models/types";

interface IProps {
  helps: string[];
  dispatch: IDispatch;
  subscription: ISubscription;
  settings: ISettings;
  originalProgram: IProgram;
  plannerState: IPlannerState;
  client: Window["fetch"];
  revisions: string[];
  isLoggedIn: boolean;
  navCommon: INavCommon;
}

export function ScreenEditProgram(props: IProps): JSX.Element {
  const screen = Screen.currentName(props.navCommon.screenStack);
  const originalProgram = props.originalProgram;
  const plannerState = props.plannerState;

  if (screen === "editProgram") {
    if (plannerState.current.program.planner != null) {
      return (
        <ScreenProgram
          client={props.client}
          revisions={props.revisions}
          helps={props.helps}
          settings={props.settings}
          dispatch={props.dispatch}
          originalProgram={originalProgram}
          plannerState={plannerState}
          isLoggedIn={props.isLoggedIn}
          navCommon={props.navCommon}
        />
      );
    } else {
      return (
        <EditProgramDaysList
          settings={props.settings}
          dispatch={props.dispatch}
          editProgram={originalProgram}
          navCommon={props.navCommon}
        />
      );
    }
  } else {
    throw new Error(`Unknown screen ${screen}`);
  }
}
