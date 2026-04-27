import { JSX, memo } from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { DateUtils_format } from "../utils/date";
import { TimeUtils_formatHOrMin } from "../utils/time";
import { Progress_isCurrent, Progress_isFullyEmptySet } from "../models/progress";
import { ComparerUtils_noFns } from "../utils/comparer";
import { IHistoryRecord, ISettings } from "../types";
import {
  IPersonalRecords,
  History_workoutTime,
  History_totalRecordWeight,
  History_totalRecordReps,
  History_totalRecordSets,
} from "../models/history";
import { IconWatch } from "./icons/iconWatch";
import { HistoryEntryView } from "./historyEntry";
import { Button } from "./button";
import { Exercise_toKey } from "../models/exercise";
import { SimpleMarkdown } from "./simpleMarkdown";
import { StringUtils_pluralize } from "../utils/string";
import { n } from "../utils/math";
import { IEvaluatedProgramDay } from "../models/program";
import { Thunk_startProgramDay, Thunk_editHistoryRecord } from "../ducks/thunks";

interface IProps {
  historyRecord: IHistoryRecord;
  showTitle?: boolean;
  programDay?: IEvaluatedProgramDay;
  isOngoing: boolean;
  prs?: IPersonalRecords;
  settings: ISettings;
  dispatch: IDispatch;
}

function getNativeCardShadow(): Record<string, unknown> {
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }) as Record<string, unknown>;
}

export const HistoryRecordView = memo((props: IProps): JSX.Element => {
  const { historyRecord, dispatch } = props;
  const isCurrent = Progress_isCurrent(historyRecord);
  const description = isCurrent ? props.programDay?.description : undefined;

  const entries = historyRecord.entries;

  const handleCardPress = (): void => {
    if (Progress_isCurrent(historyRecord)) {
      dispatch(Thunk_startProgramDay());
    } else {
      editHistoryRecord(
        historyRecord,
        dispatch,
        Progress_isCurrent(historyRecord) && Progress_isFullyEmptySet(historyRecord)
      );
    }
  };

  return (
    <View data-cy="history-record" testID="history-record" className="pt-2 mx-4 mb-6">
      {props.showTitle && (
        <Text data-cy="history-record-date" testID="history-record-date" className="mx-1 mb-1 text-base font-semibold">
          {!isCurrent ? DateUtils_format(historyRecord.date) : props.isOngoing ? "Ongoing workout" : "Next workout"}
        </Text>
      )}
      <Pressable
        className={`rounded-2xl px-4 ${
          isCurrent
            ? props.isOngoing
              ? "bg-background-cardyellow border border-border-cardyellow"
              : "border border-border-cardpurple bg-background-cardpurple"
            : "bg-background-cardpurple border border-border-cardpurple"
        }`}
        style={getNativeCardShadow()}
        onPress={handleCardPress}
      >
        <View className="py-4">
          <View className="pb-2">
            <View data-cy="history-record-program" testID="history-record-program">
              <Text className="text-sm font-semibold">{historyRecord.dayName}</Text>
              <Text className="text-xs text-text-secondary">{historyRecord.programName}</Text>
            </View>
          </View>
          {description && (
            <View className="text-sm">
              <SimpleMarkdown value={description} />
            </View>
          )}
          <View data-cy="history-entry" testID="history-entry">
            {entries.map((entry, i) => {
              const isNext = isCurrent && Progress_isFullyEmptySet(historyRecord);
              const exerciseKey = Exercise_toKey(entry.exercise);
              const pr = props.prs?.[props.historyRecord.id]?.[exerciseKey] || undefined;
              return (
                <HistoryEntryView
                  key={i}
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
            <View className="mt-2">
              <Text>
                <Text className="text-sm">Note: </Text>
                <Text className="text-sm text-text-secondary">{historyRecord.notes}</Text>
              </Text>
            </View>
          )}
          {isCurrent && (
            <View className="mt-2">
              {!props.isOngoing ? (
                <Button
                  name="start-workout-button"
                  data-cy="start-workout"
                  kind="purple"
                  className="w-full"
                  onPress={handleCardPress}
                >
                  Start
                </Button>
              ) : (
                <Button
                  name="continue-workout-button"
                  data-cy="start-workout"
                  kind="purple"
                  className="w-full"
                  onPress={handleCardPress}
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
}, ComparerUtils_noFns);

interface IHistoryRecordStats {
  historyRecord: IHistoryRecord;
  settings: ISettings;
}

function HistoryRecordStats(props: IHistoryRecordStats): JSX.Element {
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
        icon={
          <View className="mb-1 mr-1">
            <IconWatch />
          </View>
        }
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
  icon?: JSX.Element;
  value: string | number;
  hasPadding?: boolean;
  unit?: string;
}

function HistoryRecordProperty(props: IHistoryRecordPropertyProps): JSX.Element {
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
    dispatch(Thunk_editHistoryRecord(historyRecord));
  }
}
