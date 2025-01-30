import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { EditProgramDay } from "./editProgram/editProgramDay";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { Screen } from "../models/screen";
import { EditProgramExercise } from "./editProgram/editProgramExercise";
import { IProgram, IProgramExercise, ISettings, ISubscription } from "../types";
import { INavCommon } from "../models/state";
import { EditProgramWeek } from "./editProgram/editProgramWeek";
import { EditProgramV2 } from "./editProgram/editProgramV2";
import { useEffect } from "preact/hooks";
import { EditProgram } from "../models/editProgram";
import { IPlannerState } from "../pages/planner/models/types";

interface IProps {
  editProgram: IProgram;
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
  isLoggedIn: boolean;
  navCommon: INavCommon;
}

export function ScreenEditProgram(props: IProps): JSX.Element {
  const screen = Screen.current(props.navCommon.screenStack);
  useEffect(() => {
    if (screen === "editProgram" && props.editProgram.planner != null && props.plannerState == null) {
      EditProgram.initializePlanner(props.dispatch, props.editProgram.id, props.editProgram.planner);
    }
  }, [screen, props.editProgram.planner, props.plannerState]);
  if (screen === "editProgram") {
    if (props.editProgram.planner != null) {
      if (props.plannerState == null) {
        return <div />;
      } else {
        return (
          <EditProgramV2
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
  } else if (screen === "editProgramDay") {
    if (props.dayIndex !== -1) {
      return (
        <EditProgramDay
          settings={props.settings}
          dayIndex={props.dayIndex}
          isProgress={false}
          dispatch={props.dispatch}
          editDay={props.editProgram.days[props.dayIndex]}
          editProgram={props.editProgram}
          navCommon={props.navCommon}
        />
      );
    } else {
      throw new Error("Opened 'editProgramDay' screen, but 'state.editProgram.editDay' is null");
    }
  } else if (screen === "editProgramWeek") {
    if (props.weekIndex != null && props.weekIndex !== -1) {
      return (
        <EditProgramWeek
          settings={props.settings}
          dispatch={props.dispatch}
          editProgram={props.editProgram}
          editWeek={props.editProgram.weeks[props.weekIndex]}
          weekIndex={props.weekIndex}
          navCommon={props.navCommon}
        />
      );
    } else {
      throw new Error(`Opened 'editProgramWeek' screen, but 'state.editProgram.weekIndex' is ${props.weekIndex}`);
    }
  } else if (screen === "editProgramExercise") {
    const editExercise = props.editExercise;
    if (editExercise == null) {
      throw new Error("Opened 'editProgramExercise' screen, but 'state.editExercise' is null");
    }
    return (
      <EditProgramExercise
        subscription={props.subscription}
        programIndex={props.programIndex}
        settings={props.settings}
        program={props.editProgram}
        dispatch={props.dispatch}
        programExercise={editExercise}
        navCommon={props.navCommon}
      />
    );
  } else {
    throw new Error(`Unknown screen ${screen}`);
  }
}
