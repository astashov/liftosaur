import { IHistoryEntry, IHistoryRecord } from "../types";

export interface IWorkoutProgressView {
  id: number;
  entries: IHistoryEntry[];
  currentEntryIndex: number;
  day: number;
  dayInWeek: number | undefined;
  dayName: string;
  programName: string;
  programId: string;
  startTime: number;
  notes: string | undefined;
  userPromptedStateVars: IHistoryRecord["userPromptedStateVars"];
  forceUpdateEntryIndex: boolean;
  isExternal: boolean;
}

export function WorkoutProgressView_next(
  prev: IWorkoutProgressView | undefined,
  progress: IHistoryRecord
): IWorkoutProgressView {
  const next: IWorkoutProgressView = {
    id: progress.id,
    entries: progress.entries,
    currentEntryIndex: progress.currentEntryIndex ?? 0,
    day: progress.day,
    dayInWeek: progress.dayInWeek,
    dayName: progress.dayName,
    programName: progress.programName,
    programId: progress.programId,
    startTime: progress.startTime,
    notes: progress.notes,
    userPromptedStateVars: progress.userPromptedStateVars,
    forceUpdateEntryIndex: !!progress.ui?.forceUpdateEntryIndex,
    isExternal: !!progress.ui?.isExternal,
  };
  if (prev != null && WorkoutProgressView_isSame(prev, next)) {
    return prev;
  }
  return next;
}

function WorkoutProgressView_isSame(a: IWorkoutProgressView, b: IWorkoutProgressView): boolean {
  for (const key of Object.keys(b) as Array<keyof IWorkoutProgressView>) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}
