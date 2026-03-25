import type { JSX } from "react";
import { View, Text, Pressable } from "react-native";
import type { IHistoryRecord, ISettings, ISubscription } from "@shared/types";
import { WeekInsightsUtils_calculateSetResults } from "@shared/utils/weekInsightsUtils";
import { IconFire } from "./icons/IconFire";
import { Tailwind_colors } from "@shared/utils/tailwindConfig";
import { LinkButton } from "./LinkButton";
import type { IPersonalRecords } from "@shared/models/history";
import { History_getNumberOfPersonalRecords } from "@shared/models/history";
import { StringUtils_pluralize } from "@shared/utils/string";
import { Subscriptions_hasSubscription } from "@shared/utils/subscriptions";
import { IconCrown } from "./icons/IconCrown";
import type { IDispatch } from "@shared/ducks/types";
import { Thunk_pushScreen } from "@shared/ducks/thunks";
import { DateUtils_firstDayOfWeekTimestamp, DateUtils_formatRange } from "@shared/utils/date";

interface IProps {
  prs: IPersonalRecords;
  thisWeekHistory: IHistoryRecord[];
  lastWeekHistory: IHistoryRecord[];
  selectedFirstDayOfWeek: number;
  settings: ISettings;
  subscription: ISubscription;
  dispatch: IDispatch;
  onShowMore: () => void;
}

export function WeekInsights(props: IProps): JSX.Element {
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
        className="px-3 py-2 border border-border-cardyellow bg-background-cardyellow rounded-b-xl"
        onPress={() => props.dispatch(Thunk_pushScreen("subscription"))}
      >
        <View className="flex-row items-center h-8 gap-1">
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
    <View className="py-2 border border-border-cardyellow bg-background-cardyellow rounded-b-xl">
      <View className="px-3">
        <View className="flex-row gap-4">
          <View className="flex-row items-center gap-1">
            <IconFire size={16} color={Tailwind_colors().yellow[600]} />
            <Text className="text-sm font-semibold" style={{ marginTop: 3 }}>
              {formattedRange}
            </Text>
          </View>
          <View className="ml-auto">
            <LinkButton name="toggle-week-insights" onPress={props.onShowMore}>
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
            icon={<Text>{"\ud83c\udfc6"} </Text>}
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
    <View className="flex-row items-baseline">
      {props.icon}
      <Text className="text-base font-semibold">{props.value}</Text>
      {props.unit && (
        <Text className={`text-xs text-text-secondary ${props.hasPadding ? "ml-1" : ""}`}>{props.unit}</Text>
      )}
      {props.increment != null && props.increment !== 0 && (
        <Text className={`${props.increment > 0 ? "text-text-success" : "text-text-error"} ml-1 text-xs font-semibold`}>
          {props.increment > 0 ? "+" : ""}
          {props.increment}
        </Text>
      )}
    </View>
  );
}
