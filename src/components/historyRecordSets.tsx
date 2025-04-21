import { h, JSX, Fragment } from "preact";
import { Reps } from "../models/set";
import { Weight } from "../models/weight";
import { ISet, ISettings } from "../types";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { IHistoryEntryPersonalRecords } from "../models/history";

export interface IDisplaySet {
  dimReps?: boolean;
  dimRpe?: boolean;
  dimWeight?: boolean;
  dimTimer?: boolean;
  reps: string;
  weight?: string;
  rpe?: string;
  askWeight?: boolean;
  unit?: string;
  isCompleted?: boolean;
  isRpeFailed?: boolean;
  isInRange?: boolean;
  timer?: number;
}

function isSameDisplaySet(a: IDisplaySet, b: IDisplaySet): boolean {
  return (
    a.reps === b.reps && a.weight === b.weight && a.rpe === b.rpe && a.askWeight === b.askWeight && a.timer === b.timer
  );
}

export function groupDisplaySets(displaySets: IDisplaySet[]): IDisplaySet[][] {
  return CollectionUtils.groupBy(displaySets, (last, set) => {
    return !isSameDisplaySet(last, set);
  });
}

interface IHistoryRecordSetsProps {
  showPrDetails?: boolean;
  sets: ISet[];
  isNext: boolean;
  settings: ISettings;
  prs?: IHistoryEntryPersonalRecords;
}

function setToDisplaySet(set: ISet, isNext: boolean, settings: ISettings): IDisplaySet {
  const completedOrRequiredWeight = set.completedWeight ?? set.weight;
  return {
    reps: isNext ? Reps.displayReps(set) : Reps.displayCompletedReps(set),
    rpe: set.completedRpe?.toString() ?? set.rpe?.toString(),
    weight: isNext
      ? set.weight
        ? Weight.display(set.weight, false)
        : undefined
      : completedOrRequiredWeight
        ? Weight.display(completedOrRequiredWeight, false)
        : undefined,
    unit: set.weight?.unit ?? settings.units,
    askWeight: set.askWeight,
    isCompleted: Reps.isCompletedSet(set),
    isRpeFailed: set.completedRpe != null && set.completedRpe > (set.rpe ?? 0),
    isInRange: set.minReps != null ? set.completedReps != null && set.completedReps >= set.minReps : undefined,
  };
}

export function HistoryRecordSetsView(props: IHistoryRecordSetsProps): JSX.Element {
  const { sets, isNext } = props;
  const groups = Reps.group(sets, isNext);
  const displayGroups = groups.map((g) => {
    return g.map((set) => setToDisplaySet(set, isNext, props.settings));
  });
  return (
    <div className="text-sm text-right">
      {displayGroups.map((g) => (
        <HistoryRecordSet
          sets={g}
          prs={props.prs}
          isNext={props.isNext}
          showPrDetails={props.showPrDetails}
          settings={props.settings}
        />
      ))}
    </div>
  );
}

interface IHistoryRecordSet2Props {
  prs?: IHistoryEntryPersonalRecords;
  settings: ISettings;
  showPrDetails?: boolean;
  sets: IDisplaySet[];
  isNext: boolean;
}

export function HistoryRecordSet(props: IHistoryRecordSet2Props): JSX.Element {
  const { isNext } = props;
  const group = props.sets;
  const set = group[0];
  if (set == null) {
    return <div />;
  }
  const prTypes = CollectionUtils.compact(
    ObjectUtils.keys(props.prs || {}).map<"e1RM" | "Weight" | undefined>((k) => {
      const prset = (props.prs || {})[k];
      if (!prset) {
        return undefined;
      }
      const displayPrSet = setToDisplaySet(prset, isNext, props.settings);
      return isSameDisplaySet(set, displayPrSet)
        ? k === "max1RMSet"
          ? "e1RM"
          : k === "maxWeightSet"
            ? "Weight"
            : undefined
        : undefined;
    })
  );
  const isPr = prTypes.length > 0;
  const repsColor = isNext
    ? "text-grayv2-main"
    : set.isCompleted
      ? "text-greenv2-main"
      : set.isInRange
        ? "text-orange-400"
        : "text-redv2-main";
  const rpeColor = isNext ? "text-grayv2-main" : set.isRpeFailed ? "text-redv2-main" : "text-greenv2-main";
  return (
    <div
      className="text-sm whitespace-nowrap"
      data-cy={
        isNext
          ? "history-entry-sets-next"
          : set.isCompleted
            ? "history-entry-sets-completed"
            : set.isInRange
              ? "history-entry-sets-in-range"
              : "history-entry-sets-incompleted"
      }
    >
      {props.showPrDetails && isPr && (
        <span className="mr-2 text-xs font-semibold text-yellow-600">
          <span>{prTypes.join(", ")}</span> <span>🏆</span>
        </span>
      )}
      <span className={`px-1 ${isPr ? "bg-yellow-200" : ""}`}>
        {group.length > 1 && (
          <>
            <span className="font-semibold text-purplev2-main" data-cy="history-entry-sets">
              {group.length}
            </span>
            <span className="text-grayv2-main"> × </span>
          </>
        )}
        <span className={`font-semibold ${repsColor}`} data-cy="history-entry-reps">
          {set.reps}
        </span>
        {set.weight && (
          <>
            <span className="text-grayv2-main"> × </span>
            <span data-cy="history-entry-weight">
              <span className="font-semibold">{set.weight}</span>
              <span className="text-xs">{set.askWeight ? "+" : ""}</span>
              <span className="text-xs text-grayv2-main">{set.unit}</span>
            </span>
          </>
        )}
        {set.rpe != null && (
          <span className={rpeColor} data-cy="history-entry-rpe">
            <span className="text-xs"> @</span>
            <span>{set.rpe}</span>
          </span>
        )}
      </span>
    </div>
  );
}
