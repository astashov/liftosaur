import { h, JSX } from "preact";
import { ProgramSet } from "../models/programSet";
import { Reps } from "../models/set";
import { Weight } from "../models/weight";
import { IProgramSet, ISet, ISettings } from "../types";
import { CollectionUtils } from "../utils/collection";

export interface IDisplaySet {
  dimReps?: boolean;
  dimRpe?: boolean;
  dimWeight?: boolean;
  dimTimer?: boolean;
  reps: string;
  weight: string;
  rpe?: string;
  askWeight?: boolean;
  unit?: string;
  completedRpe?: string;
  isCompleted?: boolean;
  isInRange?: boolean;
  timer?: number;
}

export function groupDisplaySets(displaySets: IDisplaySet[]): IDisplaySet[][] {
  return CollectionUtils.groupBy(displaySets, (last, set) => {
    return (
      last.reps !== set.reps ||
      last.rpe !== set.rpe ||
      last.weight !== set.weight ||
      last.askWeight !== set.askWeight ||
      last.timer !== set.timer
    );
  });
}

export function HistoryRecordSetsView(props: {
  sets: ISet[];
  isNext: boolean;
  noWrap?: boolean;
  settings: ISettings;
}): JSX.Element {
  const { sets, isNext } = props;
  const groups = Reps.group(sets, isNext);
  const displayGroups = groups.map((g) => {
    return g.map((set) => {
      return {
        reps: isNext ? Reps.displayReps(set) : Reps.displayCompletedReps(set),
        rpe: set.rpe?.toString(),
        completedRpe: set.completedRpe?.toString(),
        weight: Weight.display(set.weight, false),
        unit: set.weight.value > 0 ? set.weight.unit : undefined,
        askWeight: set.askWeight,
        isCompleted: Reps.isCompletedSet(set),
        isInRange: set.minReps != null ? set.completedReps != null && set.completedReps >= set.minReps : undefined,
      };
    });
  });
  const hasRpe = displayGroups.some((group) => group.some((set) => set.rpe || set.completedRpe));
  return (
    <div className={`flex ${props.noWrap ? "" : "flex-wrap"}`}>
      {displayGroups.map((g) => (
        <HistoryRecordSet sets={g} isNext={props.isNext} hasRpe={hasRpe} />
      ))}
    </div>
  );
}

export function HistoryRecordProgramSetsView(props: { sets: IProgramSet[] }): JSX.Element {
  const { sets } = props;
  const groups = ProgramSet.group(sets);
  const displayGroups = groups.map((g) => {
    return g.map((set) => {
      const reps = set.minRepsExpr ? `${set.minRepsExpr}-${set.repsExpr}` : `${set.repsExpr}`;
      return {
        reps: set.isAmrap ? `${reps}+` : `${reps}`,
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

export function HistoryRecordSet(props: { sets: IDisplaySet[]; isNext: boolean; hasRpe?: boolean }): JSX.Element {
  const { sets, isNext } = props;
  if (sets.length === 0) {
    return <div />;
  }
  const set = sets[0];
  const length = sets.length;
  const color = isNext
    ? "text-grayv2-main"
    : set.isCompleted
    ? "text-greenv2-main"
    : set.isInRange
    ? "text-orange-400"
    : "text-redv2-main";
  const rpeClassName = `relative text-xs leading-none text-center ${set.dimRpe ? "opacity-50" : ""}`;
  const rpeStyles = { right: "0", top: "0" };
  return (
    <div className="flex py-2 mr-2 leading-none">
      <div className="relative text-center">
        {set.completedRpe != null ? (
          <div
            data-cy="history-entry-completed-rpe"
            className={`${rpeClassName}`}
            style={{ ...rpeStyles, color: "#d1720c" }}
          >
            @{set.completedRpe}
          </div>
        ) : set.completedRpe == null && set.rpe != null ? (
          <div data-cy="history-entry-rpe" className={`${rpeClassName} text-grayv2-main`} style={rpeStyles}>
            @{set.rpe}
          </div>
        ) : props.hasRpe ? (
          <div className={rpeClassName} style={rpeStyles}>
            &nbsp;
          </div>
        ) : undefined}
        <div
          data-cy={
            isNext
              ? "history-entry-sets-next"
              : set.isCompleted
              ? "history-entry-sets-completed"
              : set.isInRange
              ? "history-entry-sets-in-range"
              : "history-entry-sets-incompleted"
          }
          className="pb-1 font-bold border-b border-grayv2-200"
        >
          {length > 1 && (
            <span className={`text-sm text-purplev2-main ${set.dimReps ? "opacity-50" : ""}`}>{length}x</span>
          )}
          <span className={`${color} text-lg ${set.dimReps ? "opacity-50" : ""}`}>{set.reps}</span>
        </div>
        <div
          data-cy="history-entry-weight"
          className={`pt-2 text-sm font-bold text-grayv2-main ${set.dimWeight ? "opacity-50" : ""}`}
        >
          {set.weight}
          {set.askWeight ? "+" : ""}
          {set.unit && (
            <span className="font-normal text-grayv2-main" style={{ fontSize: "11px" }}>
              {set.unit}
            </span>
          )}
        </div>
      </div>
      {set.timer != null && (
        <div className={`flex items-center text-xs font-bold text-grayv2-main ${set.dimTimer ? "opacity-50" : ""}`}>
          {set.timer}s
        </div>
      )}
    </div>
  );
}
