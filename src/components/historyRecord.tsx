import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { CollectionUtils } from "../utils/collection";
import { Reps, ISet, IHistorySet } from "../models/set";
import { IHistoryRecord, IProgramRecord } from "../models/history";
import { Program } from "../models/program";

interface IProps {
  historyRecord: IHistoryRecord;
  dispatch: IDispatch;
}

export function HistoryRecordView(props: IProps): JSX.Element {
  const { historyRecord } = props;

  const entries = CollectionUtils.inGroupsOf(2, historyRecord.entries);
  return (
    <div className="text-xs py-3 mx-3 border-gray-200 border-b">
      <div className="flex">
        <div className="flex-1 font-bold">{formatDate(historyRecord.date)}</div>
        <div className="text-gray-600">{Program.get(historyRecord.programId).name}</div>
      </div>
      {entries.map(group => (
        <div className="flex flex-row">
          {group.map((entry, i) => {
            let className: string;
            if (i !== group.length - 1) {
              className = "flex-1 flex flex-row mr-2";
            } else {
              className = "flex-1 flex flex-row";
            }
            return (
              <div className={className}>
                <div style={{ flex: 2 }}>{entry.excercise.name}</div>
                <div className="flex-1 text-right">
                  <HistoryRecordSetsView sets={entry.sets} />
                </div>
                <div className="w-6 font-bold text-right">{entry.sets[0].weight}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface INextProps {
  historyRecord: IProgramRecord;
  dispatch: IDispatch;
}

export function NextProgramRecordView(props: INextProps): JSX.Element {
  const { historyRecord } = props;

  const entries = CollectionUtils.inGroupsOf(2, historyRecord.entries);
  return (
    <div className="text-xs py-3 mx-3 border-gray-200 border-b">
      <div className="flex">
        <div className="flex-1 font-bold">Next</div>
        <div className="text-gray-600">{Program.get(historyRecord.programId).name}</div>
      </div>
      {entries.map(group => (
        <div className="flex flex-row">
          {group.map((entry, i) => {
            let className: string;
            if (i !== group.length - 1) {
              className = "flex-1 flex flex-row mr-2";
            } else {
              className = "flex-1 flex flex-row";
            }
            return (
              <div className={className}>
                <div style={{ flex: 2 }}>{entry.excercise.name}</div>
                <div className="flex-1 text-right">
                  <HistoryRecordSetsView sets={entry.sets} />
                </div>
                <div className="w-6 font-bold text-right">{entry.sets[0].weight}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(Date.parse(dateStr));
  return date.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function HistoryRecordSetsView(props: { sets: IHistorySet[] | ISet[] }): JSX.Element {
  const { sets } = props;
  if (Reps.areSameReps(sets)) {
    return <span className="text-green-600">{Reps.display(sets)}</span>;
  } else {
    return <span className="text-red-600">{Reps.display(sets)}</span>;
  }
}
