import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, IProgramDay } from "../models/program";
import { EditProgramDay } from "./editProgram/editProgramDay";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { IScreen } from "../models/screen";
import { EditProgramDayScript } from "./editProgram/editProgramDayScript";
import { lb } from "../utils/lens";
import { IState } from "../ducks/reducer";

interface IProps {
  editProgram: IProgram;
  editDay?: IProgramDay;
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
      const lensBuilder = lb<IState>().p("storage").p("programs").i(props.programIndex).p("days").i(props.dayIndex);
      return (
        <EditProgramDay
          isProgress={false}
          dispatch={props.dispatch}
          editDayLensBuilder={lensBuilder}
          editDay={props.editProgram.days[props.dayIndex]}
          editProgram={props.editProgram}
        />
      );
    } else {
      throw new Error("Opened 'editProgramDay' screen, but 'state.editProgram.editDay' is null");
    }
  } else if (props.screen === "editProgressDay") {
    const lensBuilder = lb<IState>().pi("editDay");
    return (
      <EditProgramDay
        isProgress={true}
        dispatch={props.dispatch}
        editDayLensBuilder={lensBuilder}
        editDay={props.editDay || props.editProgram.days[props.dayIndex]}
        editProgram={props.editProgram}
      />
    );
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
