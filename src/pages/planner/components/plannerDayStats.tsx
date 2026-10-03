import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../../components/primitives/text";
import { PlannerStats } from "./plannerStats";
import { PlannerStatsUtils_calculateSetResults } from "../models/plannerStatsUtils";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { ISettings } from "../../../types";

interface IPlannerDayStatsProps {
  settings: ISettings;
  evaluatedDay: IPlannerEvalResult;
  hideTitle?: boolean;
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
      {!props.hideTitle && <Text className="mb-2 text-xl font-bold">Day Stats</Text>}
      <PlannerStats setResults={setResults} settings={settings} colorize={false} frequency={false} />
    </View>
  );
}
