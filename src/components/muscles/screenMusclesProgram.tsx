import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { Muscle } from "../../models/muscle";
import { ScreenMuscles } from "./screenMuscles";
import { ISettings, IProgram } from "../../types";
import { INavCommon } from "../../models/state";
import { HelpMuscles } from "../help/helpMuscles";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  navCommon: INavCommon;
}

export function ScreenMusclesProgram(props: IProps): JSX.Element {
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(props.program, props.settings));
  return (
    <ScreenMuscles
      dispatch={props.dispatch}
      settings={props.settings}
      points={points}
      navCommon={props.navCommon}
      title={props.program.name}
      helpContent={<HelpMuscles />}
    />
  );
}
