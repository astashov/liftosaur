import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { IWorkoutHintId, WorkoutHints_isLearned, WorkoutHints_recordUse } from "./workoutHints";

export function WorkoutHints_recordUseInState(dispatch: IDispatch, helps: string[], id: IWorkoutHintId): void {
  if (WorkoutHints_isLearned(helps, id)) {
    return;
  }
  const stamp = String(Date.now());
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("helps")
        .recordModify((hs) => WorkoutHints_recordUse(hs, id, stamp)),
    ],
    `Record hint use ${id}`
  );
}
