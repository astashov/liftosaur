import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { DateUtils } from "../utils/date";
import { TimeUtils } from "../utils/time";
import { Progress } from "../models/progress";
import { ComparerUtils } from "../utils/comparer";
import { memo } from "preact/compat";
import { IHistoryRecord, IProgramDay, ISettings } from "../types";
import { HtmlUtils } from "../utils/html";
import { History, IPersonalRecords } from "../models/history";
import { IconWatch } from "./icons/iconWatch";
import { HistoryEntryView } from "./historyEntry";
import { Button } from "./button";
import { Exercise } from "../models/exercise";
import { Markdown } from "./markdown";
import { StringUtils } from "../utils/string";
import { n } from "../utils/math";

interface IProps {
  historyRecord: IHistoryRecord;
  programDay?: IProgramDay;
  isOngoing: boolean;
  prs?: IPersonalRecords;
  settings: ISettings;
  dispatch: IDispatch;
  userId?: string;
}

export const HistoryRecordView = memo((props: IProps): JSX.Element => {
  const { historyRecord, dispatch } = props;
  const isCurrent = Progress.isCurrent(historyRecord);
  const description = isCurrent ? props.programDay?.description : undefined;

  const entries = historyRecord.entries;
  return (
    <div data-cy="history-record" className="mx-4 mb-6 history-record">
      {!isCurrent ? (
        <div data-cy="history-record-date" className="mx-1 mb-1 font-semibold">
          {DateUtils.format(historyRecord.date)}
        </div>
      ) : null}
      <div
        className={`rounded-2xl px-4 text-sm ${
          isCurrent
            ? props.isOngoing
              ? "bg-yellowv3-50 border border-yellowv3-300 nm-continue-workout"
              : "bg-purplev3-50 border border-purplev3-200 nm-start-workout"
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
          <div className="pb-2">
            <div className="text-sm" data-cy="history-record-program">
              <div className="font-semibold">
                <span>{Progress.isCurrent(historyRecord) ? "Next: " : ""}</span>
                <span>{historyRecord.dayName}</span>
              </div>
              <div className="text-xs text-grayv2-main">{historyRecord.programName}</div>
            </div>
          </div>
          {description && <Markdown value={description} />}
          <div className="flex flex-col" data-cy="history-entry">
            {entries.map((entry, i) => {
              const isNext = isCurrent && Progress.isFullyEmptySet(historyRecord);
              const exerciseKey = Exercise.toKey(entry.exercise);
              const pr = props.prs?.[props.historyRecord.id]?.[exerciseKey] || undefined;
              return (
                <HistoryEntryView
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
          </div>
          {!isCurrent && <HistoryRecordStats historyRecord={historyRecord} settings={props.settings} />}
          {historyRecord.notes && (
            <div className="mt-2 text-sm">
              <span>Note: </span>
              <span className="text-grayv3-main">{historyRecord.notes}</span>
            </div>
          )}
          {isCurrent && (
            <div className="font-bold">
              {!props.isOngoing ? (
                <Button
                  name="start-workout-button"
                  data-cy="start-workout"
                  kind="purple"
                  className="w-full"
                  onClick={() => undefined}
                >
                  Start
                </Button>
              ) : (
                <Button
                  name="continue-workout-button"
                  className="w-full"
                  data-cy="start-workout"
                  kind="purple"
                  onClick={() => undefined}
                >
                  Continue
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, ComparerUtils.noFns);

interface IHistoryRecordStats {
  historyRecord: IHistoryRecord;
  settings: ISettings;
}

function HistoryRecordStats(props: IHistoryRecordStats): JSX.Element {
  const record = props.historyRecord;
  const { value: time, unit: timeUnit } = TimeUtils.formatHOrMin(History.workoutTime(record));
  const totalWeight = History.totalRecordWeight(record, props.settings.units);
  const totalReps = History.totalRecordReps(record);
  const totalSets = History.totalRecordSets(record);
  const setsUnit = StringUtils.pluralize("set", totalSets);
  const repsUnit = StringUtils.pluralize("rep", totalReps);

  return (
    <div className="flex justify-between mt-4">
      <HistoryRecordProperty
        icon={<IconWatch className="mb-1 mr-1" />}
        value={time}
        hasPadding={true}
        unit={timeUnit}
      />
      <HistoryRecordProperty value={n(totalWeight.value)} unit={totalWeight.unit} />
      <HistoryRecordProperty value={totalSets} hasPadding={true} unit={setsUnit} />
      <HistoryRecordProperty value={totalReps} hasPadding={true} unit={repsUnit} />
    </div>
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
    <div className="">
      {props.icon}
      <span className="text-base font-semibold">{props.value}</span>
      {props.unit && <span className={`text-sm text-grayv3-main ${props.hasPadding ? "ml-1" : ""}`}>{props.unit}</span>}
    </div>
  );
}

function editHistoryRecord(historyRecord: IHistoryRecord, dispatch: IDispatch, isNext: boolean): void {
  if (!isNext) {
    dispatch({ type: "EditHistoryRecord", historyRecord });
  }
}
