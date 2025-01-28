import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { Muscle } from "../../models/muscle";
import { ScreenMuscles } from "./screenMuscles";
import { ISettings, IProgram, IProgramDay } from "../../types";
import { INavCommon } from "../../models/state";
import { HelpMusclesDay } from "../help/helpMusclesDay";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  programDay: IProgramDay;
  navCommon: INavCommon;
}

export function ScreenMusclesDay(props: IProps): JSX.Element {
  const points = Muscle.normalizePoints(Muscle.getPointsForDay(props.program, props.programDay, props.settings));
  return (
    <ScreenMuscles
      navCommon={props.navCommon}
      dispatch={props.dispatch}
      settings={props.settings}
      points={points}
      title={props.programDay.name}
      helpContent={<HelpMusclesDay />}
    />
  );
}
