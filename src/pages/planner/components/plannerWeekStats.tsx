import { h, JSX } from "preact";
import { IPlannerState } from "../models/types";
import { PlannerStats } from "./plannerStats";
import { PlannerStatsUtils_calculateSetResults } from "../models/plannerStatsUtils";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { ISettings } from "../../../types";

interface IPlannerWeekStatsProps {
  evaluatedDays: IPlannerEvalResult[];
  hideTitle?: boolean;
  settings: ISettings;
  onEditSettings?: () => void;
  dispatch: ILensDispatch<IPlannerState>;
}

export function PlannerWeekStats(props: IPlannerWeekStatsProps): JSX.Element {
  const { settings } = props;

  const evaluatedDays = props.evaluatedDays;
  const setResults = PlannerStatsUtils_calculateSetResults(evaluatedDays, settings);

  return (
    <div>
      {!props.hideTitle && <h3 className="mb-2 text-xl font-bold">Week Stats</h3>}
      <PlannerStats
        dispatch={props.dispatch}
        onEditSettings={props.onEditSettings}
        setResults={setResults}
        settings={settings}
        colorize={true}
        frequency={true}
      />
    </div>
  );
}
