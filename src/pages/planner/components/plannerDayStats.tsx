import { h, JSX, Fragment } from "preact";
import { IPlannerSettings, IPlannerState, IPlannerUiFocusedExercise } from "../models/types";
import { PlannerStats } from "./plannerStats";
import { PlannerStatsUtils } from "../models/plannerStatsUtils";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { ILensDispatch } from "../../../utils/useLensReducer";

interface IPlannerDayStatsProps {
  settings: IPlannerSettings;
  evaluatedDay: IPlannerEvalResult;
  dispatch: ILensDispatch<IPlannerState>;
  focusedExercise?: IPlannerUiFocusedExercise;
}

export function PlannerDayStats(props: IPlannerDayStatsProps): JSX.Element {
  const { settings } = props;

  const evaluatedDay = props.evaluatedDay;
  if (!evaluatedDay.success) {
    return <></>;
  }
  const setResults = PlannerStatsUtils.calculateSetResults([evaluatedDay]);

  return (
    <div>
      <h3 className="mb-2 text-xl font-bold">Day Stats</h3>
      <PlannerStats
        dispatch={props.dispatch}
        setResults={setResults}
        settings={settings}
        colorize={false}
        frequency={false}
        focusedExercise={props.focusedExercise}
      />
    </div>
  );
}
