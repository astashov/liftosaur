import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IEditProgram } from "../models/program";
import { EditProgramDay } from "./editProgram/editProgramDay";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { IScreen } from "../models/screen";
import { EditProgramDayScript } from "./editProgram/editProgramDayScript";

interface IProps {
  editProgram: IEditProgram;
  screen: IScreen;
  dispatch: IDispatch;
}

export function ScreenEditProgram(props: IProps): JSX.Element {
  if (props.screen === "editProgram") {
    return <EditProgramDaysList dispatch={props.dispatch} editProgram={props.editProgram} />;
  } else if (props.screen === "editProgramDay") {
    if (props.editProgram.editDay != null) {
      return (
        <EditProgramDay
          dispatch={props.dispatch}
          editProgram={props.editProgram}
          editDay={props.editProgram.editDay.day}
        />
      );
    } else {
      throw new Error("Opened 'editProgramDay' screen, but 'state.editProgram.editDay' is null");
    }
  } else if (props.screen === "editProgramDayScript") {
    if (props.editProgram.editDay != null) {
      return (
        <EditProgramDayScript
          editDay={props.editProgram.editDay.day}
          editProgram={props.editProgram}
          dispatch={props.dispatch}
        />
      );
    } else {
      throw new Error("Opened 'editProgramDayScreen' screen, but 'state.editProgram.editDay' is null");
    }
  } else {
    throw new Error(`Unknown screen ${props.screen}`);
  }
}
