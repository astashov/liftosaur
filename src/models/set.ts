import { CollectionUtils } from "../utils/collection";
import { Weight } from "./weight";
import { ISet, IHistoryRecord, IHistoryEntry, IWeight } from "../types";
import { ObjectUtils } from "../utils/object";
import { UidFactory } from "../utils/generator";

export type IProgramReps = number;

export type ISetsStatus = "success" | "in-range" | "failed" | "not-finished";

export namespace Reps {
  export function display(sets: ISet[], isNext: boolean = false): string {
    if (areSameReps(sets, isNext)) {
      return `${sets.length}x${sets[0].completedReps || sets[0].reps}`;
    } else {
      const arr = sets.map((s) => (isNext ? displayReps(s) : displayCompletedReps(s)));
      const groups = CollectionUtils.inGroupsOf(5, arr);
      return groups.map((g) => g.join("/")).join("/ ");
    }
  }

  export function addSet(sets: ISet[]): ISet[] {
    let lastSet: ISet = sets[sets.length - 1];
    if (lastSet == null) {
      lastSet = newSet();
    }

    return [...sets, { ...ObjectUtils.clone(lastSet), id: UidFactory.generateUid(6), isCompleted: false }];
  }

  export function isSameSet(set1: ISet, set2: ISet): boolean {
    return Weight.eq(set1.weight, set2.weight) && set1.completedReps === set2.completedReps && set1.rpe === set2.rpe;
  }

  export function displayReps(set: ISet): string {
    const reps = set.minReps != null ? `${set.minReps}-${set.reps}` : `${set.reps}`;
    return set.isAmrap ? `${reps}+` : `${reps}`;
  }

  export function displayCompletedReps(set: ISet): string {
    return set.completedReps != null ? `${set.completedReps}` : "-";
  }

  export function areSameReps(sets: ISet[], isNext: boolean): boolean {
    const firstRep = sets[0]?.reps;
    if (sets.length > 0) {
      return sets.every(
        (s) => (isNext ? s.reps : s.completedReps) != null && (isNext ? s.reps : s.completedReps) === firstRep
      );
    } else {
      return false;
    }
  }

  export function isEmpty(sets: ISet[]): boolean {
    return sets.every((s) => !s.isCompleted);
  }

  export function newSet(): ISet {
    return {
      id: UidFactory.generateUid(6),
      originalWeight: Weight.build(0, "lb"),
      weight: Weight.build(0, "lb"),
      reps: 1,
      isAmrap: false,
      askWeight: false,
      isCompleted: false,
    };
  }

  export function isCompleted(sets: ISet[]): boolean {
    return sets.every((set) => Reps.isCompletedSet(set));
  }

  export function setsStatus(sets: ISet[]): ISetsStatus {
    if (Reps.isCompleted(sets)) {
      return "success";
    } else if (Reps.isInRangeCompleted(sets)) {
      return "in-range";
    } else if (!Reps.isFinished(sets)) {
      return "not-finished";
    } else {
      return "failed";
    }
  }

  export function isCompletedSet(set: ISet): boolean {
    if (set.completedReps != null && set.completedWeight != null) {
      return (
        set.completedReps >= set.reps &&
        Weight.gte(set.completedWeight, set.weight) &&
        (set.rpe != null && set.completedRpe != null ? set.completedRpe <= set.rpe : true)
      );
    } else {
      return false;
    }
  }

  export function isInRangeCompletedSet(set: ISet): boolean {
    if (set.completedReps != null && set.completedWeight != null) {
      return (
        Weight.gte(set.completedWeight, set.weight) &&
        (set.rpe != null && set.completedRpe != null ? set.completedRpe <= set.rpe : true) &&
        (set.minReps != null ? set.completedReps >= set.minReps : set.completedReps >= set.reps)
      );
    } else {
      return false;
    }
  }

  export function isFinished(sets: ISet[]): boolean {
    return sets.every((s) => isFinishedSet(s));
  }

  export function isFinishedSet(s: ISet): boolean {
    return !!s.isCompleted;
  }

  export function toKey(set: ISet): string {
    return `${Weight.print(set.weight)}-${set.completedWeight ? Weight.print(set.completedWeight) : ""}-${set.reps}-${set.minReps}-${set.isAmrap}-${set.rpe}-${set.askWeight}-${set.completedReps}-${set.completedRpe}-${set.isCompleted}`;
  }

  export function isInRangeCompleted(sets: ISet[]): boolean {
    return sets.some((s) => s.minReps != null) && sets.every((s) => Reps.isInRangeCompletedSet(s));
  }

  export function enforceCompletedSet(set: ISet): ISet {
    return {
      ...set,
      isCompleted: set.completedReps == null || set.completedWeight == null ? false : !!set.isCompleted,
    };
  }

  export function group(sets: ISet[], isNext?: boolean): ISet[][] {
    return sets.reduce<ISet[][]>(
      (memo, set) => {
        let lastGroup = memo[memo.length - 1];
        const last = lastGroup[lastGroup.length - 1];
        if (
          last != null &&
          (!Weight.eq(last.weight, set.weight) ||
            last.reps !== set.reps ||
            last.minReps !== set.minReps ||
            last.completedReps !== set.completedReps ||
            last.askWeight !== set.askWeight ||
            (isNext && last.isAmrap !== set.isAmrap) ||
            last.rpe !== set.rpe ||
            last.completedRpe !== set.completedRpe)
        ) {
          memo.push([]);
          lastGroup = memo[memo.length - 1];
        }
        lastGroup.push(set);
        return memo;
      },
      [[]]
    );
  }

  export function findNextSet(entry: IHistoryEntry): ISet | undefined {
    return [...entry.warmupSets, ...entry.sets].filter((s) => !s.isCompleted)[0];
  }

  export function findNextEntryAndSet(
    historyRecord: IHistoryRecord,
    entryIndex: number
  ):
    | {
        entry: IHistoryEntry;
        set: ISet;
      }
    | undefined {
    const entry = historyRecord.entries[entryIndex];
    if (entry == null) {
      return undefined;
    }

    let nextSet = findNextSet(entry);
    if (nextSet != null) {
      return { entry, set: nextSet };
    }

    const nextEntry = historyRecord.entries.filter((e) => !Reps.isFinished(e.sets))[0];
    if (nextEntry != null) {
      nextSet = findNextSet(nextEntry);
      if (nextSet) {
        return { entry: nextEntry, set: nextSet };
      }
    }

    return undefined;
  }

  export function volume(sets: ISet[]): IWeight {
    const unit = sets[0]?.weight?.unit || "lb";
    return sets.reduce(
      (memo, set) => Weight.add(memo, Weight.multiply(set.weight, set.completedReps ?? 0)),
      Weight.build(0, unit)
    );
  }
}
