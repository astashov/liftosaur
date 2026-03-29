import React from "react";
import type { JSX } from "react";
import { View, Text, Pressable } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { IHistoryRecord, ISet, ISettings, IWeight } from "@shared/types";
import { Weight_display, Weight_convertTo, Weight_build } from "@shared/models/weight";
import { DateUtils_format } from "@shared/utils/date";
import { Thunk_pushScreen } from "@shared/ducks/thunks";
import { GroupHeader } from "./GroupHeader";
import { IconArrowRight } from "./icons/IconArrowRight";

interface IProps {
  settings: ISettings;
  dispatch: IDispatch;
  maxWeight?: { weight: IWeight; historyRecord?: IHistoryRecord };
  max1RM?: { weight: IWeight; set?: ISet; historyRecord?: IHistoryRecord };
}

export const ExerciseAllTimePRs = React.memo(function ExerciseAllTimePRs(props: IProps): JSX.Element {
  const { maxWeight, max1RM } = props;

  return (
    <View className="px-4 py-2 bg-background-cardpurple rounded-2xl">
      <GroupHeader topPadding={false} name="🏆 Personal Records" />
      {maxWeight && (
        <PRRow
          label="Max Weight"
          value={Weight_display(Weight_convertTo(maxWeight.weight, props.settings.units))}
          date={maxWeight.historyRecord ? DateUtils_format(maxWeight.historyRecord.startTime) : undefined}
          onPress={
            maxWeight.historyRecord
              ? () => {
                  props.dispatch({ type: "EditHistoryRecord", historyRecord: maxWeight.historyRecord! });
                  props.dispatch(Thunk_pushScreen("progress", { id: maxWeight.historyRecord!.id }));
                }
              : undefined
          }
        />
      )}
      {max1RM && (
        <PRRow
          label="Max 1RM"
          value={`${Weight_display(Weight_convertTo(max1RM.weight, props.settings.units))}${
            max1RM.set
              ? ` (${max1RM.set.completedReps} x ${Weight_display(max1RM.set.completedWeight ?? max1RM.set.weight ?? Weight_build(0, props.settings.units))})`
              : ""
          }`}
          date={max1RM.historyRecord ? DateUtils_format(max1RM.historyRecord.startTime) : undefined}
          onPress={
            max1RM.historyRecord
              ? () => {
                  props.dispatch({ type: "EditHistoryRecord", historyRecord: max1RM.historyRecord! });
                  props.dispatch(Thunk_pushScreen("progress", { id: max1RM.historyRecord!.id }));
                }
              : undefined
          }
          isBorderless={true}
        />
      )}
    </View>
  );
});

function PRRow(props: {
  label: string;
  value: string;
  date?: string;
  onPress?: () => void;
  isBorderless?: boolean;
}): JSX.Element {
  return (
    <Pressable
      className={`flex-row items-center py-2 ${props.isBorderless ? "" : "border-b border-border-neutral"}`}
      onPress={props.onPress}
      disabled={!props.onPress}
    >
      <Text className="flex-1 text-sm text-text-secondary">{props.label}</Text>
      <View className="items-end">
        <Text className="text-sm text-text-primary">{props.value}</Text>
        {props.date && <Text className="text-xs text-text-secondary">{props.date}</Text>}
      </View>
      {props.onPress && (
        <View className="ml-2">
          <IconArrowRight />
        </View>
      )}
    </Pressable>
  );
}
