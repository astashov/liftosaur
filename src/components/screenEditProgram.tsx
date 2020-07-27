import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, IProgramDay } from "../models/program";
import { EditProgramDay } from "./editProgram/editProgramDay";
import { EditProgramDaysList } from "./editProgram/editProgramDaysList";
import { IScreen } from "../models/screen";
import { EditProgramDayScript } from "./editProgram/editProgramDayScript";
import { lb } from "../utils/lens";
import { IState } from "../ducks/reducer";
import { ISettings } from "../models/settings";

interface IProps {
  editProgram: IProgram;
  editDay?: IProgramDay;
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
      const lensBuilder = lb<IState>().p("storage").p("programs").i(props.programIndex).p("days").i(props.dayIndex);
      return (
        <EditProgramDay
          settings={props.settings}
          dayIndex={props.dayIndex}
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
        settings={props.settings}
        isProgress={true}
        dayIndex={props.dayIndex}
        dispatch={props.dispatch}
        editDayLensBuilder={lensBuilder}
        editDay={props.editDay || props.editProgram.days[props.dayIndex]}
        editProgram={props.editProgram}
      />
    );
  } else if (props.screen === "editProgramDayScript") {
    return (
      <EditProgramDayScript
        dayIndex={props.dayIndex}
        settings={props.settings}
        programIndex={props.programIndex}
        editProgram={props.editProgram}
        dispatch={props.dispatch}
      />
    );
  } else {
    throw new Error(`Unknown screen ${props.screen}`);
  }
}
