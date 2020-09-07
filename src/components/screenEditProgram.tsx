import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, IProgramExcercise } from "../models/program";
import { EditProgramDay } from "./editProgram/editProgramDay";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { IScreen } from "../models/screen";
import { ISettings } from "../models/settings";
import { EditProgramExcercise } from "./editProgram/editProgramExcercise";

interface IProps {
  editProgram: IProgram;
  editExcercise?: IProgramExcercise;
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
  } else if (props.screen === "editProgramExcercise") {
    const editExcercise = props.editExcercise;
    if (editExcercise == null) {
      throw new Error("Opened 'editProgramExcercise' screen, but 'state.editExcercise' is null");
    }
    return (
      <EditProgramExcercise
        days={props.editProgram.days}
        programName={props.editProgram.name}
        settings={props.settings}
        dispatch={props.dispatch}
        programExcercise={editExcercise}
      />
    );
  } else {
    throw new Error(`Unknown screen ${props.screen}`);
  }
}
