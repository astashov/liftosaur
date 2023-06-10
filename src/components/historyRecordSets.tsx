import { h, JSX } from "preact";
import { ProgramSet } from "../models/programSet";
import { Reps } from "../models/set";
import { Weight } from "../models/weight";
import { IProgramSet, ISet, IUnit } from "../types";

interface IDisplaySet {
  reps: string;
  weight: string;
  isCompleted?: boolean;
}

export function HistoryRecordSetsView(props: {
  sets: ISet[];
  isNext: boolean;
  unit: IUnit;
  noWrap?: boolean;
}): JSX.Element {
  const { sets, isNext, unit } = props;
  const groups = Reps.group(sets, isNext);
  const displayGroups = groups.map((g) => {
    return g.map((set) => {
      return {
        reps: isNext ? Reps.displayReps(set) : Reps.displayCompletedReps(set),
        weight: Weight.display(Weight.convertTo(set.weight, unit), false),
        isCompleted: Reps.isCompletedSet(set),
      };
    });
  });
  return (
    <div className={`flex ${props.noWrap ? "" : "flex-wrap"}`}>
      {displayGroups.map((g) => (
        <HistoryRecordSet sets={g} isNext={props.isNext} />
      ))}
    </div>
  );
}

export function HistoryRecordProgramSetsView(props: { sets: IProgramSet[] }): JSX.Element {
  const { sets } = props;
  const groups = ProgramSet.group(sets);
  const displayGroups = groups.map((g) => {
    return g.map((set) => {
      return {
        reps: set.isAmrap ? `${set.repsExpr}+` : `${set.repsExpr}`,
        weight: set.weightExpr,
        isCompleted: true,
      };
    });
  });
  return (
    <div className="flex flex-wrap">
      {displayGroups.map((g) => (
        <HistoryRecordSet sets={g} isNext={true} />
      ))}
    </div>
  );
}

export function HistoryRecordSet(props: { sets: IDisplaySet[]; isNext: boolean }): JSX.Element {
  const { sets, isNext } = props;
  if (sets.length === 0) {
    return <div />;
  }
  const set = sets[0];
  const length = sets.length;
  const color = isNext ? "text-grayv2-main" : set.isCompleted ? "text-greenv2-main" : "text-redv2-main";
  return (
    <div className="flex py-2 mr-2 leading-none">
      <div className="text-center">
        <div
          data-cy={
            isNext
              ? "history-entry-sets-next"
              : set.isCompleted
              ? "history-entry-sets-completed"
              : "history-entry-sets-incompleted"
          }
          className="pb-1 font-bold border-b border-grayv2-200"
        >
          <span className={`${color} text-lg`}>{set.reps}</span>
          {length > 1 && <span className="text-sm text-purplev2-main">x{length}</span>}
        </div>
        <div data-cy="history-entry-weight" className="pt-2 text-sm font-bold text-grayv2-main">
          {set.weight}
        </div>
      </div>
    </div>
  );
}
