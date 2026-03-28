import { updateProgress, updateState } from "../models/state";
import { Progress_lbProgress, Progress_forceUpdateEntryIndex } from "../models/progress";
import { lb } from "lens-shmens";
import type { IHistoryRecord } from "../types";
import type { IDispatch } from "../ducks/types";

export function WorkoutActions_pageChange(dispatch: IDispatch, progress: IHistoryRecord, index: number): void {
  if (index !== (progress.ui?.currentEntryIndex ?? 0)) {
    updateProgress(dispatch, lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(index), "scroll-exercise-tab");
  }
}

export function WorkoutActions_clickThumbnail(dispatch: IDispatch, index: number): void {
  updateProgress(dispatch, lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(index), "click-exercise-tab");
}

export function WorkoutActions_addExercise(dispatch: IDispatch, progressId: number): void {
  updateState(
    dispatch,
    [
      Progress_lbProgress(progressId)
        .pi("ui")
        .p("exercisePicker")
        .record({
          state: {
            mode: "workout" as const,
            screenStack: ["exercisePicker"],
            sort: "name_asc" as const,
            filters: {},
            selectedExercises: [],
          },
        }),
    ],
    "Open exercise picker"
  );
}

export function WorkoutActions_moveExercise(
  dispatch: IDispatch,
  progress: IHistoryRecord,
  fromIndex: number,
  toIndex: number
): number {
  const currentIdx = progress.ui?.currentEntryIndex ?? 0;
  let newCurrentIdx = currentIdx;
  if (currentIdx === fromIndex) {
    newCurrentIdx = toIndex;
  } else if (fromIndex < currentIdx && toIndex >= currentIdx) {
    newCurrentIdx = currentIdx - 1;
  } else if (fromIndex > currentIdx && toIndex <= currentIdx) {
    newCurrentIdx = currentIdx + 1;
  }
  updateProgress(
    dispatch,
    [
      lb<IHistoryRecord>()
        .p("changes")
        .recordModify((changes) => Array.from(new Set([...(changes || []), "order" as const]))),
      lb<IHistoryRecord>()
        .p("entries")
        .recordModify((entries) => {
          const newEntries = [...entries];
          const [entryToMove] = newEntries.splice(fromIndex, 1);
          newEntries.splice(toIndex, 0, entryToMove);
          return newEntries.map((e, i) => ({ ...e, index: i }));
        }),
      lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(newCurrentIdx),
    ],
    "reorder-exercise"
  );
  return newCurrentIdx;
}

export function WorkoutActions_closeEquipmentModal(dispatch: IDispatch): void {
  updateProgress(
    dispatch,
    [lb<IHistoryRecord>().pi("ui").p("equipmentModal").record(undefined)],
    "Close equipment modal"
  );
}

export function WorkoutActions_amrapDone(dispatch: IDispatch): void {
  Progress_forceUpdateEntryIndex(dispatch);
}

export function WorkoutActions_dismissAmrapModal(dispatch: IDispatch): void {
  updateProgress(dispatch, [lb<IHistoryRecord>().pi("ui").p("amrapModal").record(undefined)], "Dismiss amrap modal");
}
