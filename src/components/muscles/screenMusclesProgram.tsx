import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { Muscle } from "../../models/muscle";
import { ScreenMuscles } from "./screenMuscles";
import { ISettings, IProgram } from "../../types";
import { ILoading } from "../../models/state";
import { IScreen } from "../../models/screen";
import { HelpMuscles } from "../help/helpMuscles";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  screenStack: IScreen[];
  loading: ILoading;
}

export function ScreenMusclesProgram(props: IProps): JSX.Element {
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(props.program, props.settings));
  return (
    <ScreenMuscles
      dispatch={props.dispatch}
      loading={props.loading}
      settings={props.settings}
      screenStack={props.screenStack}
      points={points}
      title={props.program.name}
      helpContent={<HelpMuscles />}
    />
  );
}
