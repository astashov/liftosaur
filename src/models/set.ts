import { CollectionUtils } from "../utils/collection";
import { Weight } from "./weight";
import { ISet, IHistoryRecord, IHistoryEntry, IWeight, IUnit, ISettings } from "../types";
import { ObjectUtils } from "../utils/object";
import { UidFactory } from "../utils/generator";
import { Progress } from "./progress";

export type IProgramReps = number;

export type ISetsStatus = "success" | "in-range" | "failed" | "not-finished";

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

  export function setToDisplaySet(set: ISet, isNext: boolean, settings: ISettings): IDisplaySet {
    const completedOrRequiredWeight = set.completedWeight ?? set.weight;
    return {
      reps: isNext ? Reps.displayReps(set) : Reps.displayCompletedReps(set),
      rpe: set.completedRpe?.toString() ?? set.rpe?.toString(),
      weight: isNext
        ? set.weight && set.originalWeight
          ? Weight.display(set.weight, false)
          : undefined
        : completedOrRequiredWeight
          ? Weight.display(completedOrRequiredWeight, false)
          : undefined,
      unit: completedOrRequiredWeight?.unit ?? settings.units,
      askWeight: set.askWeight,
      isCompleted: Reps.isCompletedSet(set),
      isRpeFailed: set.completedRpe != null && set.completedRpe > (set.rpe ?? 0),
      isInRange: set.minReps != null ? set.completedReps != null && set.completedReps >= set.minReps : undefined,
    };
  }

  export function addSet(sets: ISet[], isUnilateral: boolean, lastSet?: ISet, isWarmup?: boolean): ISet[] {
    lastSet = sets[sets.length - 1] || lastSet;
    if (lastSet == null) {
      lastSet = newSet(isUnilateral);
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
          completedRepsLeft: undefined,
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
    return set.completedReps != null
      ? `${set.completedRepsLeft != null ? `${set.completedRepsLeft}/` : ""}${set.completedReps}`
      : "-";
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

  export function newSet(isUnilateral: boolean): ISet {
    return {
      id: UidFactory.generateUid(6),
      originalWeight: undefined,
      weight: undefined,
      isUnilateral,
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

  export function isEmptyOrFinished(sets: ISet[]): boolean {
    return sets.length === 0 || Reps.isFinished(sets);
  }

  export function isFinishedSet(s: ISet): boolean {
    return !!s.isCompleted;
  }

  export function toKey(set: ISet): string {
    return `${Weight.printNull(set.weight)}-${Weight.printNull(set.completedWeight)}-${set.reps}-${set.minReps}-${set.isAmrap}-${set.rpe}-${set.askWeight}-${set.completedReps}-${set.completedRepsLeft}-${set.completedRpe}-${set.isCompleted}`;
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

  export function maxUnilateralCompletedReps(set: ISet): number | undefined {
    if (set.isUnilateral) {
      return Math.max(set.completedReps ?? 0, set.completedRepsLeft ?? 0);
    } else {
      return set.completedReps;
    }
  }

  export function avgUnilateralCompletedReps(set: ISet): number | undefined {
    if (set.isUnilateral) {
      return Math.round(((set.completedReps ?? 0) + (set.completedRepsLeft ?? 0)) / 2);
    } else {
      return set.completedReps;
    }
  }

  export function setVolume(set: ISet, unit: IUnit): IWeight {
    const totalReps =
      set.isUnilateral || set.completedRepsLeft != null
        ? (set.completedReps ?? 0) + (set.completedRepsLeft ?? 0)
        : (set.completedReps ?? 0);
    return Weight.multiply(set.completedWeight ?? set.weight ?? Weight.build(0, unit), totalReps);
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
            last.completedRepsLeft !== set.completedRepsLeft ||
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

  export function findNextSetIndex(entry: IHistoryEntry): number {
    return [...entry.warmupSets, ...entry.sets].findIndex((s) => !s.isCompleted);
  }

  export function findNextEntryAndSet(
    historyRecord: IHistoryRecord,
    entryIndex: number,
    mode: "workout" | "warmup"
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
    const nextEntry = Progress.getNextEntry(historyRecord, entry, mode, true);
    if (nextEntry == null) {
      return undefined;
    }

    const nextSet = findNextSet(nextEntry);
    if (nextSet != null) {
      return { entry: nextEntry, set: nextSet };
    }

    return undefined;
  }

  export function volume(sets: ISet[], unit: IUnit): IWeight {
    return Weight.convertTo(
      sets.reduce((memo, set) => Weight.add(memo, Reps.setVolume(set, unit)), Weight.build(0, unit)),
      unit
    );
  }
}
