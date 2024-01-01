import { h, JSX } from "preact";
import { IPlannerSettings, IPlannerState } from "../models/types";
import { PlannerStats } from "./plannerStats";
import { PlannerStatsUtils } from "../models/plannerStatsUtils";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { ILensDispatch } from "../../../utils/useLensReducer";

interface IPlannerWeekStatsProps {
  evaluatedDays: IPlannerEvalResult[];
  settings: IPlannerSettings;
  dispatch: ILensDispatch<IPlannerState>;
}

export function PlannerWeekStats(props: IPlannerWeekStatsProps): JSX.Element {
  const { settings } = props;

  const evaluatedDays = props.evaluatedDays;
  const setResults = PlannerStatsUtils.calculateSetResults(
    evaluatedDays,
    settings.customExercises,
    settings.synergistMultiplier
  );

  return (
    <div>
      <h3 className="mb-2 text-xl font-bold">Week Stats</h3>
      <PlannerStats
        dispatch={props.dispatch}
        setResults={setResults}
        settings={settings}
        colorize={true}
        frequency={true}
      />
    </div>
  );
}
