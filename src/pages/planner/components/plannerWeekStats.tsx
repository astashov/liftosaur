import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../../components/primitives/text";
import { PlannerStats } from "./plannerStats";
import {
  PlannerStatsUtils_calculateSetResults,
  PlannerStatsUtils_ungroupedMuscleSets,
} from "../models/plannerStatsUtils";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { ISettings } from "../../../types";

interface IPlannerWeekStatsProps {
  evaluatedDays: IPlannerEvalResult[];
  hideTitle?: boolean;
  settings: ISettings;
  onEditSettings?: () => void;
  editSettingsLabel?: string;
}

export function PlannerWeekStats(props: IPlannerWeekStatsProps): JSX.Element {
  const { settings } = props;

  const evaluatedDays = props.evaluatedDays;
  const setResults = PlannerStatsUtils_calculateSetResults(evaluatedDays, settings);
  const ungroupedMuscleSets = PlannerStatsUtils_ungroupedMuscleSets(evaluatedDays, settings);

  return (
    <View>
      {!props.hideTitle && <Text className="mb-2 text-xl font-bold">Week Stats</Text>}
      <PlannerStats
        onEditSettings={props.onEditSettings}
        editSettingsLabel={props.editSettingsLabel}
        setResults={setResults}
        ungroupedMuscleSets={ungroupedMuscleSets}
        settings={settings}
        colorize={true}
        frequency={true}
      />
    </View>
  );
}
