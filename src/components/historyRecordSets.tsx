import { h, JSX, Fragment } from "preact";
import { IDisplaySet, Reps_group, Reps_setToDisplaySet } from "../models/set";
import { ISet, ISettings } from "../types";
import { CollectionUtils_groupBy, CollectionUtils_compact } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { IHistoryEntryPersonalRecords } from "../models/history";

function isSameDisplaySet(a: IDisplaySet, b: IDisplaySet): boolean {
  return (
    a.reps === b.reps && a.weight === b.weight && a.rpe === b.rpe && a.askWeight === b.askWeight && a.timer === b.timer
  );
}

export function groupDisplaySets(displaySets: IDisplaySet[]): IDisplaySet[][] {
  return CollectionUtils_groupBy(displaySets, (last, set) => {
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

export function HistoryRecordSetsView(props: IHistoryRecordSetsProps): JSX.Element {
  const { sets, isNext } = props;
  const groups = Reps_group(sets, isNext);
  const displayGroups = groups.map((g) => {
    return g.map((set) => Reps_setToDisplaySet(set, isNext, props.settings));
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
  const prTypes = CollectionUtils_compact(
    ObjectUtils_keys(props.prs || {}).map<"e1RM" | "Weight" | undefined>((k) => {
      const prset = (props.prs || {})[k];
      if (!prset) {
        return undefined;
      }
      const displayPrSet = Reps_setToDisplaySet(prset, isNext, props.settings);
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
    ? "text-text-secondary"
    : set.isCompleted
      ? "text-text-success"
      : set.isInRange
        ? "text-orange-400"
        : "text-text-error";
  const rpeColor = isNext ? "text-text-secondary" : set.isRpeFailed ? "text-text-error" : "text-text-success";
  const timerColor = isNext ? "text-text-secondary" : "text-text-purple";
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
      <span className={`px-1 ${isPr ? "bg-color-yellow150" : ""}`}>
        {group.length > 1 && (
          <>
            <span className="font-semibold text-text-purple" data-cy="history-entry-sets">
              {group.length}
            </span>
            <span className="text-text-secondary"> × </span>
          </>
        )}
        <span className={`font-semibold ${repsColor}`} data-cy="history-entry-reps">
          {set.reps}
        </span>
        {set.weight && (
          <>
            <span className="text-text-secondary"> × </span>
            <span data-cy="history-entry-weight">
              <span className="font-semibold">{set.weight}</span>
              <span className="text-xs">{set.askWeight ? "+" : ""}</span>
              <span className="text-xs text-text-secondary">{set.unit}</span>
            </span>
          </>
        )}
        {set.rpe != null && (
          <span className={rpeColor} data-cy="history-entry-rpe">
            <span className="text-xs"> @</span>
            <span>{set.rpe}</span>
          </span>
        )}
        {set.timer != null && (
          <span className={timerColor} data-cy="history-entry-timer">
            <span> {set.timer}</span>
            <span className="text-xs">s</span>
          </span>
        )}
      </span>
    </div>
  );
}
