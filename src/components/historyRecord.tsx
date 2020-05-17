import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { CollectionUtils } from "../utils/collection";
import { Reps, ISet } from "../models/set";
import { IHistoryRecord } from "../models/history";
import { Program } from "../models/program";
import { DateUtils } from "../utils/date";
import { Excercise } from "../models/excercise";
import { TimeUtils } from "../utils/time";

interface IProps {
  historyRecord: IHistoryRecord;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programState: any;
  dispatch: IDispatch;
}

export function HistoryRecordView(props: IProps): JSX.Element {
  const { historyRecord, dispatch } = props;
  const program = Program.get(historyRecord.programId);
  const programDay = program.days[historyRecord.day](props.programState);

  const entries = CollectionUtils.inGroupsOfFilled(2, historyRecord.entries);
  return (
    <div
      className="py-3 mx-3 text-xs border-b border-gray-200"
      onClick={() => editHistoryRecord(historyRecord, dispatch, !historyRecord.date)}
    >
      <div className="flex">
        <div className="flex-1 font-bold">{historyRecord.date ? DateUtils.format(historyRecord.date) : "Next"}</div>
        <div className="text-gray-600">
          {program.name}, {programDay.name || `day ${historyRecord.day + 1}`}
        </div>
      </div>
      {entries.map((group) => (
        <div className="flex flex-row">
          {group.map((entry, i) => {
            let className: string;
            if (group.length === 1 || i !== group.length - 1) {
              className = "flex flex-row flex-1 mr-2";
            } else {
              className = "flex flex-row flex-1";
            }
            if (entry != null) {
              const excercise = Excercise.get(entry.excercise);
              return (
                <div className={className}>
                  <div style={{ flex: 2 }}>{excercise.name}</div>
                  <div className="flex-1 text-right">
                    <HistoryRecordSetsView sets={entry.sets} isNext={!historyRecord.date} />
                  </div>
                  <div className="w-6 ml-1 font-bold text-right">{Math.max(...entry.sets.map((s) => s.weight))}</div>
                </div>
              );
            } else {
              return <div className={className}></div>;
            }
          })}
        </div>
      ))}
      {historyRecord.date != null && historyRecord.startTime != null && (
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
    return <span className="text-gray-600">{Reps.display(sets, isNext)}</span>;
  } else {
    if (Reps.isCompleted(sets)) {
      return <span className="text-green-600">{Reps.display(sets)}</span>;
    } else {
      return <span className="text-red-600">{Reps.display(sets)}</span>;
    }
  }
}

function editHistoryRecord(historyRecord: IHistoryRecord, dispatch: IDispatch, isNext: boolean): void {
  if (!isNext) {
    dispatch({ type: "EditHistoryRecord", historyRecord });
  }
}
