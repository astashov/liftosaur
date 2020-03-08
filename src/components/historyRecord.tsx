import { h, JSX } from "preact";
import { IProgramDay, Program } from "../models/program";
import { IDispatch } from "../ducks/types";
import { CollectionUtils } from "../utils/collection";
import { Set, ISet } from "../models/set";
import { IHistoryRecord } from "../models/history";
import { Weight } from "../models/weight";

interface IProps {
  programDay: IProgramDay;
  lastHistoryRecord?: IHistoryRecord;
  dispatch: IDispatch;
  date?: string;
}

export function HistoryRecordView(props: IProps): JSX.Element {
  const excercises = CollectionUtils.inGroupsOf(2, props.programDay.excercises);
  const { lastHistoryRecord } = props;
  return (
    <div className="text-xs py-3 mx-3 border-gray-200 border-b">
      <div className="font-bold">{props.date ? props.date : "Next"}</div>
      {excercises.map(group => (
        <div className="flex flex-row">
          {group.map(excercise => (
            <div className="flex-1 flex flex-row">
              <div style={{ flex: 2 }}>{excercise.excercise.name}</div>
              <div className="flex-1">
                <HistoryRecordSetsView sets={excercise.sets} isNext={!props.date} />
              </div>
              <div className="w-20 font-bold">{Weight.display(Program.nextWeight(excercise, lastHistoryRecord))}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function HistoryRecordSetsView(props: { sets: ISet[]; isNext: boolean }): JSX.Element {
  const { sets } = props;
  if (Set.areSameReps(sets)) {
    if (props.isNext) {
      return <span>{Set.display(sets)}</span>;
    } else {
      return <span className="text-green-600">{Set.display(sets)}</span>;
    }
  } else {
    return <span className="text-red-600">{Set.display(sets)}</span>;
  }
}
