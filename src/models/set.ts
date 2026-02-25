import { CollectionUtils_inGroupsOf } from "../utils/collection";
import {
  Weight_display,
  Weight_eqNull,
  Weight_gte,
  Weight_printNull,
  Weight_multiply,
  Weight_build,
  Weight_convertTo,
  Weight_add,
} from "./weight";
import { ISet, IHistoryRecord, IHistoryEntry, IWeight, IUnit, ISettings } from "../types";
import { ObjectUtils_clone } from "../utils/object";
import { UidFactory_generateUid } from "../utils/generator";
import { Progress_getNextEntry } from "./progress";

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

export function Reps_display(sets: ISet[], isNext: boolean = false): string {
  if (Reps_areSameReps(sets, isNext)) {
    return `${sets.length}x${sets[0].completedReps || sets[0].reps}`;
  } else {
    const arr = sets.map((s) => (isNext ? Reps_displayReps(s) : Reps_displayCompletedReps(s)));
    const groups = CollectionUtils_inGroupsOf(5, arr);
    return groups.map((g) => g.join("/")).join("/ ");
  }
}

export function Reps_setToDisplaySet(set: ISet, isNext: boolean, settings: ISettings): IDisplaySet {
  const completedOrRequiredWeight = set.completedWeight ?? set.weight;
  return {
    reps: isNext ? Reps_displayReps(set) : Reps_displayCompletedReps(set),
    rpe: set.completedRpe?.toString() ?? set.rpe?.toString(),
    weight: isNext
      ? set.weight && set.originalWeight
        ? Weight_display(set.weight, false)
        : undefined
      : completedOrRequiredWeight
        ? Weight_display(completedOrRequiredWeight, false)
        : undefined,
    unit: completedOrRequiredWeight?.unit ?? settings.units,
    askWeight: set.askWeight,
    isCompleted: Reps_isCompletedSet(set),
    isRpeFailed: set.completedRpe != null && set.completedRpe > (set.rpe ?? 0),
    isInRange: set.minReps != null ? set.completedReps != null && set.completedReps >= set.minReps : undefined,
  };
}

export function Reps_addSet(sets: ISet[], isUnilateral: boolean, lastSet?: ISet, isWarmup?: boolean): ISet[] {
  lastSet = sets[sets.length - 1] || lastSet;
  if (lastSet == null) {
    lastSet = Reps_newSet(isUnilateral, 0);
  } else {
    if (isWarmup) {
      lastSet = {
        ...ObjectUtils_clone(lastSet),
        reps: lastSet.completedReps ?? lastSet.reps,
        weight: lastSet.completedWeight ?? lastSet.weight,
      };
    } else {
      lastSet = {
        ...ObjectUtils_clone(lastSet),
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
  const maxIndex = Math.max(-1, ...sets.map((s) => s.index || 0));

  return [
    ...sets,
    { ...ObjectUtils_clone(lastSet), id: UidFactory_generateUid(6), isCompleted: false, index: maxIndex + 1 },
  ];
}

export function Reps_isSameSet(set1: ISet, set2: ISet): boolean {
  return Weight_eqNull(set1.weight, set2.weight) && set1.completedReps === set2.completedReps && set1.rpe === set2.rpe;
}

export function Reps_displayReps(set: ISet): string {
  const reps = set.minReps != null ? `${set.minReps}-${set.reps ?? 0}` : `${set.reps ?? 0}`;
  return set.isAmrap ? `${reps}+` : `${reps}`;
}

export function Reps_displayCompletedReps(set: ISet): string {
  return set.completedReps != null
    ? `${set.completedRepsLeft != null ? `${set.completedRepsLeft}/` : ""}${set.completedReps}`
    : "-";
}

export function Reps_areSameReps(sets: ISet[], isNext: boolean): boolean {
  const firstRep = sets[0]?.reps;
  if (sets.length > 0) {
    return sets.every(
      (s) => (isNext ? s.reps : s.completedReps) != null && (isNext ? s.reps : s.completedReps) === firstRep
    );
  } else {
    return false;
  }
}

export function Reps_isEmpty(sets: ISet[]): boolean {
  return sets.every((s) => !s.isCompleted);
}

export function Reps_newSet(isUnilateral: boolean, index: number): ISet {
  return {
    vtype: "set",
    index,
    id: UidFactory_generateUid(6),
    originalWeight: undefined,
    weight: undefined,
    isUnilateral,
    reps: undefined,
    isAmrap: false,
    askWeight: false,
    isCompleted: false,
  };
}

export function Reps_isCompleted(sets: ISet[]): boolean {
  return sets.length > 0 && sets.every((set) => Reps_isCompletedSet(set));
}

export function Reps_setWarmupStatus(sets: ISet[]): ISetsStatus {
  if (sets.length === 0) {
    return "not-finished";
  }
  if (Reps_isFinished(sets)) {
    return "success";
  } else {
    return "not-finished";
  }
}

export function Reps_setsStatus(sets: ISet[]): ISetsStatus {
  if (Reps_isCompleted(sets)) {
    return "success";
  } else if (Reps_isInRangeCompleted(sets)) {
    return "in-range";
  } else if (!Reps_isFinished(sets)) {
    return "not-finished";
  } else {
    return "failed";
  }
}

export function Reps_isCompletedSet(set: ISet): boolean {
  if (set.completedReps != null && set.completedWeight != null) {
    return (
      !!set.isCompleted &&
      (set.reps == null || set.completedReps >= set.reps) &&
      (set.weight == null || Weight_gte(set.completedWeight, set.weight))
    );
  } else {
    return false;
  }
}

export function Reps_isInRangeCompletedSet(set: ISet): boolean {
  if (set.completedReps != null && set.completedWeight != null) {
    return (
      (set.weight == null || Weight_gte(set.completedWeight, set.weight)) &&
      (set.minReps != null ? set.completedReps >= set.minReps : set.reps == null || set.completedReps >= set.reps)
    );
  } else {
    return false;
  }
}

export function Reps_isStarted(sets: ISet[]): boolean {
  return sets.length > 0 && sets.some((s) => Reps_isFinishedSet(s));
}

export function Reps_isFinished(sets: ISet[]): boolean {
  return sets.length > 0 && sets.every((s) => Reps_isFinishedSet(s));
}

export function Reps_isEmptyOrFinished(sets: ISet[]): boolean {
  return sets.length === 0 || Reps_isFinished(sets);
}

export function Reps_isFinishedSet(s: ISet): boolean {
  return !!s.isCompleted;
}

export function Reps_toKey(set: ISet): string {
  return `${Weight_printNull(set.weight)}-${Weight_printNull(set.completedWeight)}-${set.reps}-${set.minReps}-${set.isAmrap}-${set.rpe}-${set.askWeight}-${set.completedReps}-${set.completedRepsLeft}-${set.completedRpe}-${set.isCompleted}`;
}

export function Reps_isInRangeCompleted(sets: ISet[]): boolean {
  return sets.some((s) => s.minReps != null) && sets.every((s) => Reps_isInRangeCompletedSet(s));
}

export function Reps_enforceCompletedSet(set: ISet): ISet {
  return {
    ...set,
    isCompleted: set.completedReps == null || set.completedWeight == null ? false : !!set.isCompleted,
  };
}

export function Reps_maxUnilateralCompletedReps(set: ISet): number | undefined {
  if (set.isUnilateral) {
    return Math.max(set.completedReps ?? 0, set.completedRepsLeft ?? 0);
  } else {
    return set.completedReps;
  }
}

export function Reps_avgUnilateralCompletedReps(set: ISet): number | undefined {
  if (set.isUnilateral) {
    return Math.round(((set.completedReps ?? 0) + (set.completedRepsLeft ?? 0)) / 2);
  } else {
    return set.completedReps;
  }
}

export function Reps_setVolume(set: ISet, unit: IUnit): IWeight {
  const totalReps =
    set.isUnilateral || set.completedRepsLeft != null
      ? (set.completedReps ?? 0) + (set.completedRepsLeft ?? 0)
      : (set.completedReps ?? 0);
  return Weight_multiply(set.completedWeight ?? set.weight ?? Weight_build(0, unit), totalReps);
}

export function Reps_group(sets: ISet[], isNext?: boolean): ISet[][] {
  return sets.reduce<ISet[][]>(
    (memo, set) => {
      let lastGroup = memo[memo.length - 1];
      const last = lastGroup[lastGroup.length - 1];
      if (
        last != null &&
        (!Weight_eqNull(last.weight, set.weight) ||
          last.reps !== set.reps ||
          last.minReps !== set.minReps ||
          last.completedReps !== set.completedReps ||
          last.completedRepsLeft !== set.completedRepsLeft ||
          !Weight_eqNull(last.completedWeight, set.completedWeight) ||
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

export function Reps_findNextSet(entry: IHistoryEntry): ISet | undefined {
  return [...entry.warmupSets, ...entry.sets].filter((s) => !s.isCompleted)[0];
}

export function Reps_findNextSetIndex(entry: IHistoryEntry): number {
  return [...entry.warmupSets, ...entry.sets].findIndex((s) => !s.isCompleted);
}

export function Reps_findNextEntryAndSet(
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
  const nextEntry = Progress_getNextEntry(historyRecord, entry, mode, true);
  if (nextEntry == null) {
    return undefined;
  }

  const nextSet = Reps_findNextSet(nextEntry);
  if (nextSet != null) {
    return { entry: nextEntry, set: nextSet };
  }

  return undefined;
}

export function Reps_findNextEntryAndSetIndex(
  historyRecord: IHistoryRecord,
  entryIndex: number,
  mode: "workout" | "warmup"
):
  | {
      entryIndex: number;
      setIndex: number;
    }
  | undefined {
  const entry = historyRecord.entries[entryIndex];
  if (entry == null) {
    return undefined;
  }
  const nextEntry = Progress_getNextEntry(historyRecord, entry, mode, true);
  if (nextEntry == null) {
    return undefined;
  }

  const nextSet = Reps_findNextSetIndex(nextEntry);

  return { entryIndex: historyRecord.entries.indexOf(nextEntry), setIndex: nextSet };
}

export function Reps_volume(sets: ISet[], unit: IUnit): IWeight {
  return Weight_convertTo(
    sets.reduce((memo, set) => Weight_add(memo, Reps_setVolume(set, unit)), Weight_build(0, unit)),
    unit
  );
}
