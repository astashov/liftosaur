import { IHistoryEntry, IProgressMode, ISet } from "../types";
import { Reps_findNextSetIndex } from "../models/set";

export type IWorkoutSetExpansionOverride =
  | { kind: "expanded"; setId: string; wasCompleted: boolean }
  | { kind: "collapsed"; completedCount: number }
  | undefined;

function completedCount(entry: IHistoryEntry): number {
  return [...entry.warmupSets, ...entry.sets].filter((s) => s.isCompleted).length;
}

export interface IWorkoutExpandedSet {
  mode: IProgressMode;
  setIndex: number;
}

function setAt(entry: IHistoryEntry, mode: IProgressMode, setIndex: number): ISet | undefined {
  return mode === "warmup" ? entry.warmupSets[setIndex] : entry.sets[setIndex];
}

function findById(entry: IHistoryEntry, setId: string): IWorkoutExpandedSet | undefined {
  const warmupIndex = entry.warmupSets.findIndex((s) => s.id === setId);
  if (warmupIndex !== -1) {
    return { mode: "warmup", setIndex: warmupIndex };
  }
  const setIndex = entry.sets.findIndex((s) => s.id === setId);
  return setIndex !== -1 ? { mode: "workout", setIndex } : undefined;
}

function nextUnfinished(entry: IHistoryEntry): IWorkoutExpandedSet | undefined {
  const flatIndex = Reps_findNextSetIndex(entry);
  if (flatIndex === -1) {
    return undefined;
  }
  return flatIndex < entry.warmupSets.length
    ? { mode: "warmup", setIndex: flatIndex }
    : { mode: "workout", setIndex: flatIndex - entry.warmupSets.length };
}

export function WorkoutSetExpansion_expanded(
  entry: IHistoryEntry,
  override: IWorkoutSetExpansionOverride,
  shouldCollapseSets: boolean
): IWorkoutExpandedSet | undefined {
  if (override?.kind === "collapsed" && override.completedCount === completedCount(entry)) {
    return undefined;
  }
  if (override?.kind === "expanded") {
    const found = findById(entry, override.setId);
    const set = found ? setAt(entry, found.mode, found.setIndex) : undefined;
    if (found && set && !!set.isCompleted === override.wasCompleted) {
      return found;
    }
  }
  return shouldCollapseSets ? undefined : nextUnfinished(entry);
}

export function WorkoutSetExpansion_shouldCollapseSetsAfterComplete(
  entry: IHistoryEntry,
  expanded: IWorkoutExpandedSet | undefined,
  shouldCollapseSets: boolean,
  mode: IProgressMode,
  setIndex: number
): boolean {
  const set = setAt(entry, mode, setIndex);
  if (set == null || set.isCompleted) {
    return shouldCollapseSets;
  }
  if (expanded == null) {
    return true;
  }
  if (expanded.mode === mode && expanded.setIndex === setIndex) {
    return false;
  }
  return shouldCollapseSets;
}

export function WorkoutSetExpansion_toggle(
  entry: IHistoryEntry,
  override: IWorkoutSetExpansionOverride,
  shouldCollapseSets: boolean,
  mode: IProgressMode,
  setIndex: number
): IWorkoutSetExpansionOverride {
  const expanded = WorkoutSetExpansion_expanded(entry, override, shouldCollapseSets);
  if (expanded && expanded.mode === mode && expanded.setIndex === setIndex) {
    return { kind: "collapsed", completedCount: completedCount(entry) };
  }
  const set = setAt(entry, mode, setIndex);
  if (set == null) {
    return override;
  }
  return { kind: "expanded", setId: set.id, wasCompleted: !!set.isCompleted };
}
