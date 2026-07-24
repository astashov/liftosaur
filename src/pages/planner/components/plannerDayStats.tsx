import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../../components/primitives/text";
import { IPlannerState, IPlannerUiFocusedExercise } from "../models/types";
import { PlannerStats } from "./plannerStats";
import { PlannerStatsUtils_calculateSetResults } from "../models/plannerStatsUtils";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { ISettings } from "../../../types";

interface IPlannerDayStatsProps {
  settings: ISettings;
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
  const setResults = PlannerStatsUtils_calculateSetResults([evaluatedDay], settings);

  return (
    <View>
      <Text className="mb-2 text-xl font-bold">Day Stats</Text>
      <PlannerStats
        dispatch={props.dispatch}
        setResults={setResults}
        settings={settings}
        colorize={false}
        frequency={false}
        focusedExercise={props.focusedExercise}
      />
    </View>
  );
}
