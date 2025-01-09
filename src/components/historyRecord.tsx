import { View, TouchableOpacity } from "react-native";
import { IDispatch } from "../ducks/types";
import { DateUtils } from "../utils/date";
import { TimeUtils } from "../utils/time";
import { Progress } from "../models/progress";
import { ComparerUtils } from "../utils/comparer";
import { memo } from "react";
import { IHistoryRecord, ISettings } from "../types";
import { History } from "../models/history";
import { IconWatch } from "./icons/iconWatch";
import { HistoryEntryView } from "./historyEntry";
import { Button } from "./button";
import { Exercise } from "../models/exercise";
import { LftText } from "./lftText";

interface IProps {
  historyRecord: IHistoryRecord;
  isOngoing: boolean;
  settings: ISettings;
  dispatch: IDispatch;
  userId?: string;
}

export const HistoryRecordView = memo((props: IProps): JSX.Element => {
  const { historyRecord, dispatch } = props;

  const entries = historyRecord.entries;
  return (
    <TouchableOpacity
      data-cy="history-record"
      className={`history-record rounded-2xl mx-4 mb-4 px-4 text-sm ${
        Progress.isCurrent(historyRecord)
          ? props.isOngoing
            ? "bg-yellow-100 border border-yellow-400 nm-continue-workout"
            : "bg-purplev2-200 nm-start-workout"
          : "bg-grayv2-50 nm-edit-workout"
      }`}
      style={{ boxShadow: "0 3px 3px -3px rgba(0, 0, 0, 0.1)" }}
      onPress={(event) => {
        if (Progress.isCurrent(historyRecord)) {
          dispatch({ type: "StartProgramDayAction" });
        } else {
          editHistoryRecord(
            historyRecord,
            dispatch,
            Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord)
          );
        }
      }}
    >
      <View className="py-4">
        <View className="flex flex-row gap-8">
          <View className="flex-row items-center" data-cy="history-record-date">
            {Progress.isCurrent(historyRecord) ? (
              !props.isOngoing ? (
                <Button name="start-workout-button" data-cy="start-workout" kind="orange" onClick={() => undefined}>
                  Start
                </Button>
              ) : (
                <Button name="continue-workout-button" data-cy="start-workout" kind="purple" onClick={() => undefined}>
                  Continue
                </Button>
              )
            ) : (
              <LftText className="font-bold">{DateUtils.format(historyRecord.date)}</LftText>
            )}
          </View>
          <View className="flex-1" data-cy="history-record-program">
            <LftText className="text-sm text-right text-gray-600">
              {historyRecord.programName}
              {historyRecord.dayName ? `, ${historyRecord.dayName}` : ""}
            </LftText>
          </View>
        </View>
        <View className="flex flex-col mt-2" data-cy="history-entry">
          {entries.map((entry, i) => {
            const isNext = Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord);
            return (
              <HistoryEntryView
                key={Exercise.toKey(entry.exercise)}
                entry={entry}
                isNext={isNext}
                isLast={i === entries.length - 1}
                settings={props.settings}
                showNotes={true}
              />
            );
          })}
        </View>
        {historyRecord.notes && <LftText className="mt-1 text-sm text-grayv2-main">{historyRecord.notes}</LftText>}
        {!Progress.isCurrent(historyRecord) && historyRecord.startTime != null && historyRecord.endTime != null && (
          <View className="flex flex-row items-center mt-1 text-gray-600" style={{ minHeight: 28 }}>
            <View className="flex-row items-center gap-2 text-left">
              <IconWatch />{" "}
              <LftText className="inline-block align-middle" style={{ paddingTop: 2 }}>
                {TimeUtils.formatHHMM(History.workoutTime(historyRecord))}
              </LftText>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}, ComparerUtils.noFns);

function editHistoryRecord(historyRecord: IHistoryRecord, dispatch: IDispatch, isNext: boolean): void {
  if (!isNext) {
    dispatch({ type: "EditHistoryRecord", historyRecord });
  }
}
