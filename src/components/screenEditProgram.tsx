import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { Screen } from "../models/screen";
import { IProgram, IProgramExercise, ISettings, ISubscription } from "../types";
import { INavCommon } from "../models/state";
import { EditProgramV2 } from "./editProgram/editProgramV2";
import { useEffect } from "preact/hooks";
import { EditProgram } from "../models/editProgram";
import { IPlannerState } from "../pages/planner/models/types";
import { Thunk } from "../ducks/thunks";

interface IProps {
  editProgram?: IProgram;
  editExercise?: IProgramExercise;
  helps: string[];
  dispatch: IDispatch;
  programIndex: number;
  subscription: ISubscription;
  dayIndex: number;
  weekIndex?: number;
  settings: ISettings;
  adminKey?: string;
  plannerState?: IPlannerState;
  client: Window["fetch"];
  revisions: string[];
  isLoggedIn: boolean;
  navCommon: INavCommon;
}

export function ScreenEditProgram(props: IProps): JSX.Element {
  const screen = Screen.currentName(props.navCommon.screenStack);
  useEffect(() => {
    if (screen === "editProgram" && props.editProgram?.planner != null && props.plannerState == null) {
      EditProgram.initializePlanner(props.dispatch, props.editProgram.id, props.editProgram.planner);
    }
  }, [screen, props.editProgram?.planner, props.plannerState]);

  useEffect(() => {
    if (props.editProgram == null) {
      props.dispatch(Thunk.pushScreen("main", undefined, true));
    }
  }, [props.editProgram]);

  if (props.editProgram == null) {
    return <div />;
  }

  if (screen === "editProgram") {
    if (props.editProgram.planner != null) {
      if (props.plannerState == null) {
        return <div />;
      } else {
        return (
          <EditProgramV2
            client={props.client}
            revisions={props.revisions}
            helps={props.helps}
            settings={props.settings}
            dispatch={props.dispatch}
            programIndex={props.programIndex}
            editProgram={props.editProgram}
            plannerState={props.plannerState}
            adminKey={props.adminKey}
            isLoggedIn={props.isLoggedIn}
            navCommon={props.navCommon}
          />
        );
      }
    } else {
      return (
        <EditProgramDaysList
          settings={props.settings}
          dispatch={props.dispatch}
          programIndex={props.programIndex}
          editProgram={props.editProgram}
          adminKey={props.adminKey}
          navCommon={props.navCommon}
        />
      );
    }
  } else {
    throw new Error(`Unknown screen ${screen}`);
  }
}
