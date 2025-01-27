import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { Muscle } from "../../models/muscle";
import { ScreenMuscles } from "./screenMuscles";
import { ISettings, IProgram, IProgramDay } from "../../types";
import { ILoading } from "../../models/state";
import { IScreen } from "../../models/screen";
import { HelpMusclesDay } from "../help/helpMusclesDay";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  programDay: IProgramDay;
  screenStack: IScreen[];
  loading: ILoading;
  currentProgram: IProgram;
}

export function ScreenMusclesDay(props: IProps): JSX.Element {
  const points = Muscle.normalizePoints(Muscle.getPointsForDay(props.program, props.programDay, props.settings));
  return (
    <ScreenMuscles
      currentProgram={props.currentProgram}
      screenStack={props.screenStack}
      loading={props.loading}
      dispatch={props.dispatch}
      settings={props.settings}
      points={points}
      title={props.programDay.name}
      helpContent={<HelpMusclesDay />}
    />
  );
}
