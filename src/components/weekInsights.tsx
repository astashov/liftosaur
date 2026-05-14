import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IHistoryRecord, ISettings, ISubscription } from "../types";
import { WeekInsightsUtils_calculateSetResults } from "../utils/weekInsightsUtils";
import { IconFire } from "./icons/iconFire";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { LinkButton } from "./linkButton";
import { IPersonalRecords, History_getNumberOfPersonalRecords } from "../models/history";
import { StringUtils_pluralize } from "../utils/string";
import { ISetResults } from "../pages/planner/models/types";
import { PlannerWeekMuscles } from "../pages/planner/components/plannerWeekMuscles";
import { colorPctValue, PlannerSetSplit } from "../pages/planner/components/plannerStats";
import { ObjectUtils_keys } from "../utils/object";
import { PersonalRecords } from "./personalRecords";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { IconCrown } from "./icons/iconCrown";
import { IDispatch } from "../ducks/types";
import { Thunk_pushScreen } from "../ducks/thunks";
import { DateUtils_firstDayOfWeekTimestamp, DateUtils_formatRange } from "../utils/date";
import { Muscle_getMuscleGroupName } from "../models/muscle";
import { navigationRef } from "../navigation/navigationRef";

interface IWeekInsightsProps {
  prs: IPersonalRecords;
  thisWeekHistory: IHistoryRecord[];
  lastWeekHistory: IHistoryRecord[];
  selectedFirstDayOfWeek: number;
  settings: ISettings;
  subscription: ISubscription;
  dispatch: IDispatch;
}

export function WeekInsights(props: IWeekInsightsProps): JSX.Element {
  const isCurrentWeek =
    DateUtils_firstDayOfWeekTimestamp(new Date(), props.settings.startWeekFromMonday) === props.selectedFirstDayOfWeek;

  const setResults = WeekInsightsUtils_calculateSetResults(props.thisWeekHistory, props.settings);
  const lastSetResults = WeekInsightsUtils_calculateSetResults(props.lastWeekHistory, props.settings);
  const numberOfPrs = History_getNumberOfPersonalRecords(props.thisWeekHistory, props.prs);
  const historyRecord = props.thisWeekHistory[0];
  if (!historyRecord) {
    return <View />;
  }

  if (!Subscriptions_hasSubscription(props.subscription)) {
    return (
      <Pressable
        className="w-full px-3 py-2 border border-border-cardyellow bg-background-cardyellow rounded-b-xl"
        onPress={() => props.dispatch(Thunk_pushScreen("subscription"))}
      >
        <View className="flex-row items-center h-8 gap-1" style={{ marginBottom: 3 }}>
          <IconCrown size={16} color={Tailwind_colors().yellow[600]} />
          <Text className="text-sm font-semibold text-icon-yellow" style={{ marginTop: 3 }}>
            See Week Insights
          </Text>
        </View>
      </Pressable>
    );
  }

  const startTs = props.selectedFirstDayOfWeek;
  const endRange = new Date(startTs);
  endRange.setDate(endRange.getDate() + 6);
  const formattedRange = DateUtils_formatRange(startTs, endRange);

  return (
    <View className="w-full py-2 border border-border-cardyellow bg-background-cardyellow rounded-b-xl">
      <View className="px-3">
        <View className="flex-row gap-4">
          <View className="flex-row items-center gap-1">
            <IconFire size={16} color={Tailwind_colors().yellow[600]} />
            <Text className="text-sm font-semibold" style={{ marginTop: 3 }}>
              {formattedRange}
            </Text>
          </View>
          <View className="ml-auto">
            <LinkButton
              name="toggle-week-insights"
              className="text-sm"
              onPress={() =>
                navigationRef.navigate("weekInsightsDetailsModal", {
                  selectedFirstDayOfWeek: props.selectedFirstDayOfWeek,
                })
              }
            >
              Show More
            </LinkButton>
          </View>
        </View>
        <View className="flex-row justify-between mt-1" style={{ marginLeft: 2 }}>
          <WeekInsightsProperty
            value={Math.round(setResults.volume.value)}
            unit={setResults.volume.unit}
            increment={!isCurrentWeek ? Math.round(setResults.volume.value - lastSetResults.volume.value) : undefined}
          />
          <WeekInsightsProperty
            value={setResults.total}
            hasPadding={true}
            unit={StringUtils_pluralize("set", setResults.total)}
            increment={!isCurrentWeek ? setResults.total - lastSetResults.total : undefined}
          />
          <WeekInsightsProperty
            icon={<Text>{"\u{1F3C6}"} </Text>}
            hasPadding={true}
            value={numberOfPrs}
            unit={StringUtils_pluralize("PR", numberOfPrs)}
          />
        </View>
      </View>
    </View>
  );
}

interface IWeekInsightsPropertyProps {
  icon?: JSX.Element;
  value: string | number;
  hasPadding?: boolean;
  increment?: number;
  unit?: string;
}

function WeekInsightsProperty(props: IWeekInsightsPropertyProps): JSX.Element {
  return (
    <Text>
      {props.icon}
      <Text className="text-base font-semibold">{props.value}</Text>
      {props.unit && (
        <Text className={`text-xs text-text-secondary ${props.hasPadding ? "ml-1" : ""}`}>{props.unit}</Text>
      )}
      {props.increment && props.increment !== 0 ? (
        <Text className={`${props.increment > 0 ? `text-text-success` : `text-text-error`} ml-1 text-xs font-semibold`}>
          {props.increment > 0 ? "+" : ""}
          {props.increment}
        </Text>
      ) : null}
    </Text>
  );
}

export interface IWeekInsightsDetailsProps {
  prs: IPersonalRecords;
  thisWeekHistory: IHistoryRecord[];
  setResults: ISetResults;
  settings: ISettings;
  onOpenPlannerSettings: () => void;
}

export function WeekInsightsDetails(props: IWeekInsightsDetailsProps): JSX.Element {
  const setResults = props.setResults;
  const hasPersonalRecords = History_getNumberOfPersonalRecords(props.thisWeekHistory, props.prs) > 0;

  return (
    <View className="pt-2" data-testid="week-insights-details" testID="week-insights-details">
      {hasPersonalRecords && (
        <View className="mb-4">
          <PersonalRecords historyRecords={props.thisWeekHistory} prs={props.prs} settings={props.settings} />
        </View>
      )}
      <View className="mb-2">
        <Text className="text-sm font-semibold">
          {"\u{1F4AA}"} {setResults.total} {StringUtils_pluralize("Set", setResults.total)}
        </Text>
      </View>
      <View>
        <Text className="text-sm">
          <Text className="text-sm text-text-secondary">Strength: </Text>
          <Text
            className={`text-sm ${colorPctValue(setResults.total, setResults.strength, props.settings.planner.strengthSetsPct)}`}
          >
            {setResults.strength}
            {setResults.total > 0 ? `, ${Math.round((setResults.strength * 100) / setResults.total)}%` : ""}
          </Text>
        </Text>
      </View>
      <View>
        <Text className="text-sm">
          <Text className="text-sm text-text-secondary">Hypertrophy: </Text>
          <Text
            className={`text-sm ${colorPctValue(
              setResults.total,
              setResults.hypertrophy,
              props.settings.planner.hypertrophySetsPct
            )}`}
          >
            {setResults.hypertrophy}
            {setResults.total > 0 ? `, ${Math.round((setResults.hypertrophy * 100) / setResults.total)}%` : ""}
          </Text>
        </Text>
      </View>
      <View className="flex-row mt-2">
        <View className="flex-1 gap-1">
          <Text className="text-sm">
            <Text className="text-sm text-text-secondary">Upper:</Text>{" "}
            <PlannerSetSplit
              split={setResults.upper}
              settings={props.settings}
              shouldIncludeFrequency={true}
              textSize="text-sm"
            />
          </Text>
          <Text className="text-sm">
            <Text className="text-sm text-text-secondary">Lower:</Text>{" "}
            <PlannerSetSplit
              split={setResults.lower}
              settings={props.settings}
              shouldIncludeFrequency={true}
              textSize="text-sm"
            />
          </Text>
          <Text className="text-sm">
            <Text className="text-sm text-text-secondary">Core:</Text>{" "}
            <PlannerSetSplit
              split={setResults.core}
              settings={props.settings}
              shouldIncludeFrequency={true}
              textSize="text-sm"
            />
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm">
            <Text className="text-sm text-text-secondary">Push:</Text>{" "}
            <PlannerSetSplit
              split={setResults.push}
              settings={props.settings}
              shouldIncludeFrequency={true}
              textSize="text-sm"
            />
          </Text>
          <Text className="text-sm">
            <Text className="text-sm text-text-secondary">Pull:</Text>{" "}
            <PlannerSetSplit
              split={setResults.pull}
              settings={props.settings}
              shouldIncludeFrequency={true}
              textSize="text-sm"
            />
          </Text>
          <Text className="text-sm">
            <Text className="text-sm text-text-secondary">Legs:</Text>{" "}
            <PlannerSetSplit
              split={setResults.legs}
              settings={props.settings}
              shouldIncludeFrequency={true}
              textSize="text-sm"
            />
          </Text>
        </View>
      </View>
      <View className="flex-row items-center mt-2">
        <View className="flex-1">
          {ObjectUtils_keys(setResults.muscleGroup).map((muscleGroup) => {
            return (
              <Text key={muscleGroup} className="text-sm">
                <Text className="text-sm text-text-secondary">
                  {Muscle_getMuscleGroupName(muscleGroup, props.settings)}:
                </Text>{" "}
                <PlannerSetSplit
                  split={setResults.muscleGroup[muscleGroup]}
                  settings={props.settings}
                  shouldIncludeFrequency={true}
                  muscle={muscleGroup}
                  textSize="text-sm"
                />
              </Text>
            );
          })}
        </View>
        <View className="w-20 mb-2">
          <PlannerWeekMuscles settings={props.settings} data={setResults.muscleGroup} />
        </View>
      </View>
      <View className="mt-2">
        <LinkButton
          className="text-sm"
          name="week-insights-show-planner-settings"
          onPress={props.onOpenPlannerSettings}
        >
          Change Set Range Settings
        </LinkButton>
      </View>
    </View>
  );
}
