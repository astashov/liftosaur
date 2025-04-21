import { CollectionUtils } from "../utils/collection";
import { Weight } from "./weight";
import { ISet, IHistoryRecord, IHistoryEntry, IWeight, IUnit } from "../types";
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

  export function addSet(sets: ISet[], unit: IUnit, lastSet?: ISet, isWarmup?: boolean): ISet[] {
    lastSet = sets[sets.length - 1] || lastSet;
    if (lastSet == null) {
      lastSet = newSet(unit);
    } else {
      if (isWarmup) {
        lastSet = {
          ...ObjectUtils.clone(lastSet),
          reps: lastSet.completedReps ?? lastSet.reps,
          weight: lastSet.completedWeight ?? lastSet.weight,
        };
      } else {
        lastSet = {
          ...ObjectUtils.clone(lastSet),
          reps: lastSet.reps ?? lastSet.completedReps,
          weight: lastSet.weight ?? lastSet.completedWeight,
          originalWeight: lastSet.originalWeight ?? lastSet.weight ?? lastSet.completedWeight,
          completedReps: undefined,
          completedWeight: undefined,
          completedRpe: undefined,
        };
      }
    }

    return [...sets, { ...ObjectUtils.clone(lastSet), id: UidFactory.generateUid(6), isCompleted: false }];
  }

  export function isSameSet(set1: ISet, set2: ISet): boolean {
    return (
      Weight.eqNull(set1.weight, set2.weight) && set1.completedReps === set2.completedReps && set1.rpe === set2.rpe
    );
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

  export function newSet(unit: IUnit): ISet {
    return {
      id: UidFactory.generateUid(6),
      originalWeight: undefined,
      weight: undefined,
      reps: undefined,
      isAmrap: false,
      askWeight: false,
      isCompleted: false,
    };
  }

  export function isCompleted(sets: ISet[]): boolean {
    return sets.length > 0 && sets.every((set) => Reps.isCompletedSet(set));
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
        !!set.isCompleted &&
        (set.reps == null || set.completedReps >= set.reps) &&
        (set.weight == null || Weight.gte(set.completedWeight, set.weight))
      );
    } else {
      return false;
    }
  }

  export function isInRangeCompletedSet(set: ISet): boolean {
    if (set.completedReps != null && set.completedWeight != null) {
      return (
        (set.weight == null || Weight.gte(set.completedWeight, set.weight)) &&
        (set.minReps != null ? set.completedReps >= set.minReps : set.reps == null || set.completedReps >= set.reps)
      );
    } else {
      return false;
    }
  }

  export function isStarted(sets: ISet[]): boolean {
    return sets.length > 0 && sets.some((s) => isFinishedSet(s));
  }

  export function isFinished(sets: ISet[]): boolean {
    return sets.length > 0 && sets.every((s) => isFinishedSet(s));
  }

  export function isFinishedSet(s: ISet): boolean {
    return !!s.isCompleted;
  }

  export function toKey(set: ISet): string {
    return `${Weight.printNull(set.weight)}-${Weight.printNull(set.completedWeight)}-${set.reps}-${set.minReps}-${set.isAmrap}-${set.rpe}-${set.askWeight}-${set.completedReps}-${set.completedRpe}-${set.isCompleted}`;
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
          (!Weight.eqNull(last.weight, set.weight) ||
            last.reps !== set.reps ||
            last.minReps !== set.minReps ||
            last.completedReps !== set.completedReps ||
            !Weight.eqNull(last.completedWeight, set.completedWeight) ||
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
      (memo, set) =>
        Weight.add(
          memo,
          Weight.multiply(set.completedWeight ?? set.weight ?? Weight.build(0, "lb"), set.completedReps ?? 0)
        ),
      Weight.build(0, unit)
    );
  }
}
