import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../../components/primitives/text";
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
    <View>
      {!props.hideTitle && <Text className="mb-2 text-xl font-bold">Week Stats</Text>}
      <PlannerStats
        dispatch={props.dispatch}
        onEditSettings={props.onEditSettings}
        setResults={setResults}
        settings={settings}
        colorize={true}
        frequency={true}
      />
    </View>
  );
}
