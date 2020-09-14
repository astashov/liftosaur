import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, IProgramExercise } from "../models/program";
import { EditProgramDay } from "./editProgram/editProgramDay";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { IScreen } from "../models/screen";
import { ISettings } from "../models/settings";
import { EditProgramExercise } from "./editProgram/editProgramExercise";

interface IProps {
  editProgram: IProgram;
  editExercise?: IProgramExercise;
  screen: IScreen;
  dispatch: IDispatch;
  programIndex: number;
  dayIndex: number;
  settings: ISettings;
}

export function ScreenEditProgram(props: IProps): JSX.Element {
  if (props.screen === "editProgram") {
    return (
      <EditProgramDaysList
        dispatch={props.dispatch}
        programIndex={props.programIndex}
        editProgram={props.editProgram}
      />
    );
  } else if (props.screen === "editProgramDay") {
    if (props.dayIndex !== -1) {
      return (
        <EditProgramDay
          settings={props.settings}
          programIndex={props.programIndex}
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
    return (
      <EditProgramExercise
        days={props.editProgram.days}
        programName={props.editProgram.name}
        settings={props.settings}
        dispatch={props.dispatch}
        programExercise={editExercise}
      />
    );
  } else {
    throw new Error(`Unknown screen ${props.screen}`);
  }
}
