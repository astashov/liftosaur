import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { Muscle_normalizePoints, Muscle_getPointsForDay } from "../../models/muscle";
import { ScreenMuscles } from "./screenMuscles";
import { ISettings, IProgram } from "../../types";
import { INavCommon } from "../../models/state";
import { HelpMusclesDay } from "../help/helpMusclesDay";
import { Program_evaluate, Program_getProgramDay } from "../../models/program";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  day: number;
  navCommon: INavCommon;
}

export function ScreenMusclesDay(props: IProps): JSX.Element {
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  const programDay = Program_getProgramDay(evaluatedProgram, props.day);
  if (!programDay) {
    return <></>;
  }
  const points = Muscle_normalizePoints(
    Muscle_getPointsForDay(evaluatedProgram, programDay, props.navCommon.stats, props.settings)
  );
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
