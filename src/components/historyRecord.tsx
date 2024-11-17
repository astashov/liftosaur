import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { DateUtils } from "../utils/date";
import { TimeUtils } from "../utils/time";
import { Progress } from "../models/progress";
import { ComparerUtils } from "../utils/comparer";
import { memo } from "preact/compat";
import { IHistoryRecord, ISettings } from "../types";
import { HtmlUtils } from "../utils/html";
import { History } from "../models/history";
import { IconWatch } from "./icons/iconWatch";
import { HistoryEntryView } from "./historyEntry";
import { Button } from "./button";

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
    <div
      data-cy="history-record"
      className={`history-record rounded-2xl mx-4 mb-4 px-4 text-sm ${
        Progress.isCurrent(historyRecord)
          ? props.isOngoing
            ? "bg-yellow-100 border border-yellow-400 nm-continue-workout"
            : "bg-purplev2-200 nm-start-workout"
          : "bg-grayv2-50 nm-edit-workout"
      }`}
      style={{ boxShadow: "0 3px 3px -3px rgba(0, 0, 0, 0.1)" }}
      onClick={(event) => {
        if (!HtmlUtils.classInParents(event.target as Element, "button")) {
          if (Progress.isCurrent(historyRecord)) {
            dispatch({ type: "StartProgramDayAction" });
          } else {
            editHistoryRecord(
              historyRecord,
              dispatch,
              Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord)
            );
          }
        }
      }}
    >
      <div className="py-4">
        <div className="flex">
          <div className="flex-1 font-bold" data-cy="history-record-date">
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
              DateUtils.format(historyRecord.date)
            )}
          </div>
          <div className="flex-1 text-xs text-right text-gray-600" data-cy="history-record-program">
            {historyRecord.programName}
            {historyRecord.dayName ? `, ${historyRecord.dayName}` : ""}
          </div>
        </div>
        <div className="flex flex-col mt-2" data-cy="history-entry">
          {entries.map((entry, i) => {
            const isNext = Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord);
            return (
              <HistoryEntryView
                entry={entry}
                isNext={isNext}
                isLast={i === entries.length - 1}
                settings={props.settings}
                showNotes={true}
              />
            );
          })}
        </div>
        {historyRecord.notes && <p className="mt-1 text-sm text-grayv2-main">{historyRecord.notes}</p>}
        {!Progress.isCurrent(historyRecord) && historyRecord.startTime != null && historyRecord.endTime != null && (
          <div className="flex items-center mt-1 text-gray-600" style={{ minHeight: "1.8em" }}>
            <div className="text-left">
              <IconWatch />{" "}
              <span className="inline-block align-middle" style={{ paddingTop: "2px" }}>
                {TimeUtils.formatHHMM(History.workoutTime(historyRecord))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, ComparerUtils.noFns);

function editHistoryRecord(historyRecord: IHistoryRecord, dispatch: IDispatch, isNext: boolean): void {
  if (!isNext) {
    dispatch({ type: "EditHistoryRecord", historyRecord });
  }
}
