import { IHistoryEntry, IProgressMode, ISet } from "../types";
import { IPrevBestSet, IPrevExerciseData } from "../models/history";
import { Weight_eq } from "../models/weight";

export interface IWorkoutSetPreviousLine {
  label: "Best" | "Best AMRAP" | "Same day";
  set: ISet;
  timestamp: number;
}

function setAt(entry: IHistoryEntry | undefined, mode: IProgressMode, setIndex: number): ISet | undefined {
  if (entry == null) {
    return undefined;
  }
  return mode === "warmup" ? entry.warmupSets[setIndex] : entry.sets[setIndex];
}

function sameResult(a: ISet, b: ISet): boolean {
  const sameWeight =
    a.completedWeight == null || b.completedWeight == null
      ? a.completedWeight == null && b.completedWeight == null
      : Weight_eq(a.completedWeight, b.completedWeight);
  return a.completedReps === b.completedReps && a.completedRepsLeft === b.completedRepsLeft && sameWeight;
}

function bestFor(set: ISet, prevData: IPrevExerciseData | undefined): IPrevBestSet | undefined {
  if (prevData == null) {
    return undefined;
  }
  if (set.isAmrap) {
    return prevData.bestAmrap;
  }
  return set.reps != null ? prevData.bestByReps[set.reps] : undefined;
}

export function WorkoutSetPrevious_lines(
  mode: IProgressMode,
  setIndex: number,
  set: ISet,
  prevData: IPrevExerciseData | undefined,
  isMultiweek: boolean
): IWorkoutSetPreviousLine[] {
  const lines: IWorkoutSetPreviousLine[] = [];
  const best = mode === "workout" ? bestFor(set, prevData) : undefined;
  if (best != null) {
    lines.push({ label: set.isAmrap ? "Best AMRAP" : "Best", set: best.set, timestamp: best.timestamp });
  }
  const sameDay = setAt(prevData?.sameDayEntry, mode, setIndex);
  if (
    isMultiweek &&
    sameDay != null &&
    prevData?.sameDayTimestamp != null &&
    sameDay !== best?.set &&
    (best == null || !sameResult(best.set, sameDay))
  ) {
    lines.push({ label: "Same day", set: sameDay, timestamp: prevData.sameDayTimestamp });
  }
  return lines;
}
