import { IHistoryRecord, ISettings } from "../types";
import { WeekInsightsUtils } from "../utils/weekInsightsUtils";
import { DateUtils } from "../utils/date";
import { GroupHeader } from "./groupHeader";
import { colorPctValue, PlannerSetSplit } from "../pages/planner/components/plannerStats";
import { PlannerWeekMuscles } from "../pages/planner/components/plannerWeekMuscles";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { LinkButton } from "./linkButton";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { View } from "react-native";
import { LftText } from "./lftText";

interface IWeekInsightsProps {
  historyRecords: IHistoryRecord[];
  settings: ISettings;
  onOpenPlannerSettings: () => void;
}

export function WeekInsights(props: IWeekInsightsProps): JSX.Element {
  const setResults = WeekInsightsUtils.calculateSetResults(
    props.historyRecords,
    props.settings.exercises,
    props.settings.planner.synergistMultiplier
  );
  const historyRecord = props.historyRecords[0];
  if (!historyRecord) {
    return <View />;
  }
  const firstDayOfWeek = DateUtils.format(DateUtils.firstDayOfWeekTimestamp(historyRecord.startTime), true, true);
  const lastDayOfWeek = DateUtils.format(DateUtils.lastDayOfWeekTimestamp(historyRecord.startTime), true, true);

  return (
    <View className="p-4 m-4 border border-purplev2-300 bg-purplev2-100 rounded-xl">
      <LftText className="font-bold">
        <LftText className="text-purplev2-main">Week insights</LftText>: {firstDayOfWeek} - {lastDayOfWeek}
      </LftText>
      <GroupHeader name="Sets" size="large" />
      <View>
        <LftText className="text-grayv2-main">Total:</LftText> {setResults.total}
      </View>
      <View>
        <LftText className="text-grayv2-main">Strength: </LftText>
        <LftText
          className={colorPctValue(setResults.total, setResults.strength, props.settings.planner.strengthSetsPct)}
        >
          {setResults.strength}
          {setResults.total > 0 ? `, ${Math.round((setResults.strength * 100) / setResults.total)}%` : ""}
        </LftText>
      </View>
      <View>
        <LftText className="text-grayv2-main">Hypertrophy: </LftText>
        <LftText
          className={colorPctValue(setResults.total, setResults.hypertrophy, props.settings.planner.hypertrophySetsPct)}
        >
          {setResults.hypertrophy}
          {setResults.total > 0 ? `, ${Math.round((setResults.hypertrophy * 100) / setResults.total)}%` : ""}
        </LftText>
      </View>
      <View className="flex flex-row mt-2">
        <View className="flex-1 gap-1">
          <View>
            <LftText className="text-grayv2-main">Upper:</LftText>{" "}
            <PlannerSetSplit split={setResults.upper} settings={props.settings} shouldIncludeFrequency={true} />
          </View>
          <View>
            <LftText className="text-grayv2-main">Lower:</LftText>{" "}
            <PlannerSetSplit split={setResults.lower} settings={props.settings} shouldIncludeFrequency={true} />
          </View>
          <View>
            <LftText className="text-grayv2-main">Core:</LftText>{" "}
            <PlannerSetSplit split={setResults.core} settings={props.settings} shouldIncludeFrequency={true} />
          </View>
        </View>
        <View className="flex-1">
          <View>
            <LftText className="text-grayv2-main">Push:</LftText>{" "}
            <PlannerSetSplit split={setResults.push} settings={props.settings} shouldIncludeFrequency={true} />
          </View>
          <View>
            <LftText className="text-grayv2-main">Pull:</LftText>{" "}
            <PlannerSetSplit split={setResults.pull} settings={props.settings} shouldIncludeFrequency={true} />
          </View>
          <View>
            <LftText className="text-grayv2-main">Legs:</LftText>{" "}
            <PlannerSetSplit split={setResults.legs} settings={props.settings} shouldIncludeFrequency={true} />
          </View>
        </View>
      </View>
      <View className="flex flex-row items-center mt-2">
        <View className="flex-1">
          {ObjectUtils.keys(setResults.muscleGroup).map((muscleGroup) => {
            return (
              <View key={muscleGroup}>
                <LftText className="text-grayv2-main">{StringUtils.capitalize(muscleGroup)}:</LftText>{" "}
                <PlannerSetSplit
                  split={setResults.muscleGroup[muscleGroup]}
                  settings={props.settings}
                  shouldIncludeFrequency={true}
                  muscle={muscleGroup}
                />
              </View>
            );
          })}
        </View>
        <View className="w-20 mb-2">
          <PlannerWeekMuscles settings={props.settings} data={setResults.muscleGroup} />
        </View>
      </View>
      <View className="mt-2">
        <LinkButton
          name="week-insights-show-planner-settings"
          onPress={() => {
            props.onOpenPlannerSettings();
          }}
        >
          Change Set Range Settings
        </LinkButton>
      </View>
    </View>
  );
}

interface IWeekInsightsTeaserProps {
  dispatch: IDispatch;
}

export function WeekInsightsTeaser(props: IWeekInsightsTeaserProps): JSX.Element {
  return (
    <View className="p-4 m-4 text-center border border-purplev2-300 bg-purplev2-100 rounded-xl">
      <LinkButton name="week-insights-teaser" onPress={() => props.dispatch(Thunk.pushScreen("subscription"))}>
        See last week insights!
      </LinkButton>
    </View>
  );
}
