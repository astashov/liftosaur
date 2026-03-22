import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import { DateUtils_format } from "@shared/utils/date";
import { TimeUtils_formatHOrMin } from "@shared/utils/time";
import { Progress_isCurrent, Progress_isFullyEmptySet } from "@shared/models/progress";
import type { IHistoryRecord, ISettings } from "@shared/types";
import {
  IPersonalRecords,
  History_workoutTime,
  History_totalRecordWeight,
  History_totalRecordReps,
  History_totalRecordSets,
} from "@shared/models/history";
import { IconWatch } from "./icons/IconWatch";
import { HistoryEntryView } from "./HistoryEntryView";
import { Button } from "./Button";
import { Exercise_toKey } from "@shared/models/exercise";
import { MarkdownSimple } from "./MarkdownSimple";
import { StringUtils_pluralize } from "@shared/utils/string";
import { n } from "@shared/utils/math";
import type { IEvaluatedProgramDay } from "@shared/models/program";
import { Thunk_startProgramDay } from "@shared/ducks/thunks";

interface IProps {
  historyRecord: IHistoryRecord;
  showTitle?: boolean;
  programDay?: IEvaluatedProgramDay;
  isOngoing: boolean;
  prs?: IPersonalRecords;
  settings: ISettings;
  dispatch: IDispatch;
}

export const HistoryRecordView = memo((props: IProps): React.ReactElement => {
  const { historyRecord, dispatch } = props;
  const isCurrent = Progress_isCurrent(historyRecord);
  const description = isCurrent ? props.programDay?.description : undefined;

  const entries = historyRecord.entries;

  const onCardPress = (): void => {
    if (Progress_isCurrent(historyRecord)) {
      dispatch(Thunk_startProgramDay());
    } else {
      editHistoryRecord(historyRecord, dispatch, Progress_isCurrent(historyRecord) && Progress_isFullyEmptySet(historyRecord));
    }
  };

  return (
    <View
      data-cy="history-record"
      data-id={props.historyRecord.id}
      className="mx-4 mb-6"
    >
      {props.showTitle && (
        <Text data-cy="history-record-date" className="mx-1 mb-1 font-semibold">
          {!isCurrent ? DateUtils_format(historyRecord.date) : props.isOngoing ? "Ongoing workout" : "Next workout"}
        </Text>
      )}
      <Pressable
        className={`rounded-2xl px-4 text-sm ${
          isCurrent
            ? props.isOngoing
              ? "bg-background-cardyellow border border-border-cardyellow"
              : "border border-border-cardpurple bg-background-cardpurple"
            : "bg-background-cardpurple border border-border-cardpurple"
        }`}
        style={{ boxShadow: "0 3px 3px -3px rgba(0, 0, 0, 0.1)" } as any}
        onPress={onCardPress}
      >
        <View className="py-4">
          <View className="pb-2">
            <View className="text-sm" data-cy="history-record-program">
              <Text className="font-semibold">{historyRecord.dayName}</Text>
              <Text className="text-xs text-text-secondary">{historyRecord.programName}</Text>
            </View>
          </View>
          {description && (
            <View className="text-sm">
              <MarkdownSimple value={description} />
            </View>
          )}
          <View className="flex-col" data-cy="history-entry">
            {entries.map((entry, i) => {
              const isNext = isCurrent && Progress_isFullyEmptySet(historyRecord);
              const exerciseKey = Exercise_toKey(entry.exercise);
              const pr = props.prs?.[props.historyRecord.id]?.[exerciseKey] || undefined;
              return (
                <HistoryEntryView
                  key={entry.id}
                  entry={entry}
                  prs={pr}
                  isOngoing={props.isOngoing}
                  isNext={isNext}
                  isLast={isNext && i === entries.length - 1}
                  settings={props.settings}
                  showNotes={true}
                />
              );
            })}
          </View>
          {!isCurrent && <HistoryRecordStats historyRecord={historyRecord} settings={props.settings} />}
          {historyRecord.notes && (
            <View className="mt-2 text-sm">
              <Text>
                <Text>{"Note: "}</Text>
                <Text className="text-text-secondary">{historyRecord.notes}</Text>
              </Text>
            </View>
          )}
          {isCurrent && (
            <View className="mt-2 font-bold">
              {!props.isOngoing ? (
                <Button
                  name="start-workout-button"
                  data-cy="start-workout"
                  kind="purple"
                  className="w-full"
                  onPress={() => undefined}
                >
                  Start
                </Button>
              ) : (
                <Button
                  name="continue-workout-button"
                  className="w-full"
                  data-cy="start-workout"
                  kind="purple"
                  onPress={() => undefined}
                >
                  Continue
                </Button>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
});

interface IHistoryRecordStatsProps {
  historyRecord: IHistoryRecord;
  settings: ISettings;
}

function HistoryRecordStats(props: IHistoryRecordStatsProps): React.ReactElement {
  const record = props.historyRecord;
  const { value: time, unit: timeUnit } = TimeUtils_formatHOrMin(History_workoutTime(record));
  const totalWeight = History_totalRecordWeight(record, props.settings.units);
  const totalReps = History_totalRecordReps(record);
  const totalSets = History_totalRecordSets(record);
  const setsUnit = StringUtils_pluralize("set", totalSets);
  const repsUnit = StringUtils_pluralize("rep", totalReps);

  return (
    <View className="flex-row justify-between mt-4">
      <HistoryRecordProperty
        icon={<IconWatch className="mb-1 mr-1" />}
        value={time}
        hasPadding={true}
        unit={timeUnit}
      />
      <HistoryRecordProperty value={n(totalWeight.value)} unit={totalWeight.unit} />
      <HistoryRecordProperty value={totalSets} hasPadding={true} unit={setsUnit} />
      <HistoryRecordProperty value={totalReps} hasPadding={true} unit={repsUnit} />
    </View>
  );
}

interface IHistoryRecordPropertyProps {
  icon?: React.ReactElement;
  value: string | number;
  hasPadding?: boolean;
  unit?: string;
}

function HistoryRecordProperty(props: IHistoryRecordPropertyProps): React.ReactElement {
  return (
    <View className="flex-row items-center">
      {props.icon}
      <Text className="text-base font-semibold">{props.value}</Text>
      {props.unit && (
        <Text className={`text-sm text-text-secondary ${props.hasPadding ? "ml-1" : ""}`}>{props.unit}</Text>
      )}
    </View>
  );
}

function editHistoryRecord(historyRecord: IHistoryRecord, dispatch: IDispatch, isNext: boolean): void {
  if (!isNext) {
    dispatch({ type: "EditHistoryRecord", historyRecord });
  }
}
