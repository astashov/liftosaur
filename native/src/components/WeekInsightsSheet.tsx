import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { IRootNavigation } from "../navigation/types";
import { useStoreState } from "../context/StoreContext";
import {
  History_getPersonalRecords,
  History_getNumberOfPersonalRecords,
  History_getHistoryRecordsForTimerange,
} from "@shared/models/history";
import { WeekInsightsUtils_calculateSetResults } from "@shared/utils/weekInsightsUtils";
import { StringUtils_pluralize } from "@shared/utils/string";
import { ObjectUtils_keys } from "@shared/utils/object";
import { Muscle_getMuscleGroupName } from "@shared/models/muscle";
import { PersonalRecords } from "@crossplatform/components/PersonalRecords";
import { PlannerSetSplit, colorPctValue } from "@crossplatform/components/PlannerSetSplit";
import { LinkButton } from "@crossplatform/components/LinkButton";
import type { ISetSplit } from "@shared/pages/planner/models/types";

export function WeekInsightsSheet(): React.ReactElement {
  const navigation = useNavigation<IRootNavigation>();
  const route = useRoute();
  const params = (route.params || {}) as { selectedFirstDayOfWeek?: number };
  const state = useStoreState();
  const settings = state.storage.settings;
  const history = state.storage.history;
  const selectedFirstDayOfWeek = params.selectedFirstDayOfWeek ?? 0;

  const prs = useMemo(() => History_getPersonalRecords(history), [history]);

  const thisWeekHistory = useMemo(
    () => History_getHistoryRecordsForTimerange(history, selectedFirstDayOfWeek, "week", settings.startWeekFromMonday),
    [history, selectedFirstDayOfWeek, settings.startWeekFromMonday]
  );

  const setResults = WeekInsightsUtils_calculateSetResults(thisWeekHistory, settings);
  const hasPersonalRecords = History_getNumberOfPersonalRecords(thisWeekHistory, prs) > 0;

  return (
    <ScrollView className="flex-1 bg-background-default px-4 pt-2">
      {hasPersonalRecords && (
        <View className="mb-4">
          <PersonalRecords historyRecords={thisWeekHistory} prs={prs} settings={settings} />
        </View>
      )}
      <Text className="mb-2 font-semibold">
        {`\ud83d\udcaa ${setResults.total} ${StringUtils_pluralize("Set", setResults.total)}`}
      </Text>
      <Text>
        <Text className="text-text-secondary">Strength: </Text>
        <Text className={colorPctValue(setResults.total, setResults.strength, settings.planner.strengthSetsPct)}>
          {setResults.strength}
          {setResults.total > 0 ? `, ${Math.round((setResults.strength * 100) / setResults.total)}%` : ""}
        </Text>
      </Text>
      <Text>
        <Text className="text-text-secondary">Hypertrophy: </Text>
        <Text className={colorPctValue(setResults.total, setResults.hypertrophy, settings.planner.hypertrophySetsPct)}>
          {setResults.hypertrophy}
          {setResults.total > 0 ? `, ${Math.round((setResults.hypertrophy * 100) / setResults.total)}%` : ""}
        </Text>
      </Text>
      <View className="flex-row mt-2">
        <View className="flex-1 gap-1">
          <SplitRow label="Upper" split={setResults.upper} />
          <SplitRow label="Lower" split={setResults.lower} />
          <SplitRow label="Core" split={setResults.core} />
        </View>
        <View className="flex-1">
          <SplitRow label="Push" split={setResults.push} />
          <SplitRow label="Pull" split={setResults.pull} />
          <SplitRow label="Legs" split={setResults.legs} />
        </View>
      </View>
      <View className="mt-2 pb-8">
        {ObjectUtils_keys(setResults.muscleGroup).map((muscleGroup) => (
          <View key={muscleGroup} className="flex-row">
            <Text className="text-text-secondary">{Muscle_getMuscleGroupName(muscleGroup, settings)}: </Text>
            <PlannerSetSplit
              split={setResults.muscleGroup[muscleGroup]}
              settings={settings}
              shouldIncludeFrequency={true}
              muscle={muscleGroup}
            />
          </View>
        ))}
      </View>
      <View className="mt-4 pb-8">
        <LinkButton
          name="week-insights-show-planner-settings"
          onPress={() => navigation.navigate("PlannerSettingsSheet")}
        >
          Change Set Range Settings
        </LinkButton>
      </View>
    </ScrollView>
  );
}

function SplitRow(props: { label: string; split: ISetSplit }): React.ReactElement {
  const state = useStoreState();
  return (
    <View className="flex-row">
      <Text className="text-text-secondary">{props.label}: </Text>
      <PlannerSetSplit split={props.split} settings={state.storage.settings} shouldIncludeFrequency={true} />
    </View>
  );
}
