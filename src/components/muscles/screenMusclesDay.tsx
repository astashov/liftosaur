import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { Muscle } from "../../models/muscle";
import { ScreenMuscles } from "./screenMuscles";
import { ISettings, IProgram } from "../../types";
import { INavCommon } from "../../models/state";
import { HelpMusclesDay } from "../help/helpMusclesDay";
import { Program } from "../../models/program";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  day: number;
  navCommon: INavCommon;
}

export function ScreenMusclesDay(props: IProps): JSX.Element {
  const evaluatedProgram = Program.evaluate(props.program, props.settings);
  const programDay = Program.getProgramDay(evaluatedProgram, props.day);
  if (!programDay) {
    return <></>;
  }
  const points = Muscle.normalizePoints(Muscle.getPointsForDay(evaluatedProgram, programDay, props.settings));
  return (
    <ScreenMuscles
      navCommon={props.navCommon}
      dispatch={props.dispatch}
      settings={props.settings}
      points={points}
      title={programDay.name}
      helpContent={<HelpMusclesDay />}
    />
  );
}
