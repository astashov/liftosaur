import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { Screen } from "../models/screen";
import { IProgram, ISettings, ISubscription } from "../types";
import { INavCommon } from "../models/state";
import { EditProgramV2 } from "./editProgram/editProgramV2";
import { useEffect } from "preact/hooks";
import { IPlannerState } from "../pages/planner/models/types";
import { Thunk } from "../ducks/thunks";

interface IProps {
  helps: string[];
  dispatch: IDispatch;
  subscription: ISubscription;
  settings: ISettings;
  adminKey?: string;
  originalProgram?: IProgram;
  plannerState?: IPlannerState;
  client: Window["fetch"];
  revisions: string[];
  isLoggedIn: boolean;
  navCommon: INavCommon;
}

export function ScreenEditProgram(props: IProps): JSX.Element {
  const screen = Screen.currentName(props.navCommon.screenStack);
  const originalProgram = props.originalProgram;
  const plannerState = props.plannerState;
  useEffect(() => {
    if (plannerState == null || originalProgram == null) {
      props.dispatch(Thunk.pushScreen("main", undefined, true));
    }
  }, [plannerState, originalProgram]);

  if (originalProgram == null || plannerState == null) {
    return <div />;
  }

  if (screen === "editProgram") {
    if (plannerState.current.program.planner != null) {
      return (
        <EditProgramV2
          client={props.client}
          revisions={props.revisions}
          helps={props.helps}
          settings={props.settings}
          dispatch={props.dispatch}
          originalProgram={originalProgram}
          plannerState={plannerState}
          adminKey={props.adminKey}
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
