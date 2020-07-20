import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram } from "../models/program";
import { EditProgramDay } from "./editProgram/editProgramDay";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { IScreen } from "../models/screen";
import { EditProgramDayScript } from "./editProgram/editProgramDayScript";

interface IProps {
  editProgram: IProgram;
  screen: IScreen;
  dispatch: IDispatch;
  programIndex: number;
  dayIndex: number;
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
          dispatch={props.dispatch}
          programIndex={props.programIndex}
          editProgram={props.editProgram}
          dayIndex={props.dayIndex}
        />
      );
    } else {
      throw new Error("Opened 'editProgramDay' screen, but 'state.editProgram.editDay' is null");
    }
  } else if (props.screen === "editProgramDayScript") {
    return (
      <EditProgramDayScript
        programIndex={props.programIndex}
        editProgram={props.editProgram}
        dispatch={props.dispatch}
      />
    );
  } else {
    throw new Error(`Unknown screen ${props.screen}`);
  }
}
