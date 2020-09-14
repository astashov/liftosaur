import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { CollectionUtils } from "../utils/collection";
import { Reps, ISet } from "../models/set";
import { IHistoryRecord } from "../models/history";
import { DateUtils } from "../utils/date";
import { Exercise } from "../models/exercise";
import { TimeUtils } from "../utils/time";
import { Progress } from "../models/progress";
import { ISettings } from "../models/settings";
import { Weight } from "../models/weight";

interface IProps {
  historyRecord: IHistoryRecord;
  settings: ISettings;
  dispatch: IDispatch;
}

export function HistoryRecordView(props: IProps): JSX.Element {
  const { historyRecord, dispatch } = props;

  const entries = CollectionUtils.inGroupsOfFilled(2, historyRecord.entries);
  return (
    <div
      data-cy="history-record"
      className="py-3 mx-3 text-xs border-b border-gray-200"
      onClick={() =>
        editHistoryRecord(
          historyRecord,
          dispatch,
          Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord)
        )
      }
    >
      <div className="flex">
        <div className="flex-1 font-bold" data-cy="history-record-date">
          {Progress.isCurrent(historyRecord)
            ? Progress.isFullyEmptySet(historyRecord)
              ? "Next"
              : "Ongoing"
            : DateUtils.format(historyRecord.date)}
        </div>
        <div className="text-gray-600" data-cy="history-record-program">
          {historyRecord.programName}, {historyRecord.dayName}
        </div>
      </div>
      {entries.map((group) => (
        <div className="flex flex-row" data-cy="history-entry">
          {group.map((entry, i) => {
            let className: string;
            if (group.length === 1 || i !== group.length - 1) {
              className = "flex flex-row flex-1 mr-2";
            } else {
              className = "flex flex-row flex-1";
            }
            if (entry != null) {
              const exercise = Exercise.get(entry.exercise);
              return (
                <div data-cy="history-entry-exercise" className={className}>
                  <div data-cy="history-entry-exercise-name" style={{ flex: 2 }}>
                    {exercise.name}
                  </div>
                  <div className="flex-1 text-right">
                    <HistoryRecordSetsView
                      sets={entry.sets}
                      isNext={Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord)}
                    />
                  </div>
                  <div data-cy="history-entry-weight" className="w-8 ml-1 font-bold text-right">
                    {Math.max(...entry.sets.map((s) => Weight.convertTo(s.weight, props.settings.units).value))}
                  </div>
                </div>
              );
            } else {
              return <div className={className}></div>;
            }
          })}
        </div>
      ))}
      {!Progress.isCurrent(historyRecord) && historyRecord.startTime != null && historyRecord.endTime != null && (
        <div class="text-gray-600 text-right mt-1">
          <span>Time:</span>{" "}
          <span className="font-bold">{TimeUtils.formatHHMM(historyRecord.endTime - historyRecord.startTime)}</span>
        </div>
      )}
    </div>
  );
}

function HistoryRecordSetsView(props: { sets: ISet[]; isNext: boolean }): JSX.Element {
  const { sets, isNext } = props;
  if (isNext) {
    return (
      <span data-cy="history-entry-sets-next" className="text-gray-600">
        {Reps.display(sets, isNext)}
      </span>
    );
  } else {
    if (Reps.isCompleted(sets)) {
      return (
        <span data-cy="history-entry-sets-completed" className="text-green-600">
          {Reps.display(sets)}
        </span>
      );
    } else {
      return (
        <span data-cy="history-entry-sets-incompleted" className="text-red-600">
          {Reps.display(sets)}
        </span>
      );
    }
  }
}

function editHistoryRecord(historyRecord: IHistoryRecord, dispatch: IDispatch, isNext: boolean): void {
  if (!isNext) {
    dispatch({ type: "EditHistoryRecord", historyRecord });
  }
}
