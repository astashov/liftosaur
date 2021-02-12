import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { EditProgramDay } from "./editProgram/editProgramDay";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { IScreen } from "../models/screen";
import { EditProgramExercise } from "./editProgram/editProgramExercise";
import { dequal } from "dequal/lite";
import { IProgram, IProgramExercise, ISettings } from "../types";

interface IProps {
  editProgram: IProgram;
  editExercise?: IProgramExercise;
  screen: IScreen;
  dispatch: IDispatch;
  programIndex: number;
  dayIndex: number;
  settings: ISettings;
  adminKey?: string;
}

export function ScreenEditProgram(props: IProps): JSX.Element {
  if (props.screen === "editProgram") {
    return (
      <EditProgramDaysList
        dispatch={props.dispatch}
        programIndex={props.programIndex}
        editProgram={props.editProgram}
        adminKey={props.adminKey}
      />
    );
  } else if (props.screen === "editProgramDay") {
    if (props.dayIndex !== -1) {
      return (
        <EditProgramDay
          settings={props.settings}
          dayIndex={props.dayIndex}
          isProgress={false}
          dispatch={props.dispatch}
          editDay={props.editProgram.days[props.dayIndex]}
          editProgram={props.editProgram}
        />
      );
    } else {
      throw new Error("Opened 'editProgramDay' screen, but 'state.editProgram.editDay' is null");
    }
  } else if (props.screen === "editProgramExercise") {
    const editExercise = props.editExercise;
    if (editExercise == null) {
      throw new Error("Opened 'editProgramExercise' screen, but 'state.editExercise' is null");
    }
    const exercise = props.editProgram.exercises.find((e) => e.id === editExercise.id);
    const isChanged = exercise == null || !dequal(editExercise, exercise);
    return (
      <EditProgramExercise
        programIndex={props.programIndex}
        days={props.editProgram.days}
        programName={props.editProgram.name}
        settings={props.settings}
        dispatch={props.dispatch}
        programExercise={editExercise}
        isChanged={isChanged}
      />
    );
  } else {
    throw new Error(`Unknown screen ${props.screen}`);
  }
}
