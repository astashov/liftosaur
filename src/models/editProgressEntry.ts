import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { ISet, IHistoryRecord, IExerciseType, ISettings } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { ObjectUtils } from "../utils/object";
import { Reps } from "./set";
import { Exercise } from "./exercise";

export namespace EditProgressEntry {
  export function showEditSetModal(
    dispatch: IDispatch,
    settings: ISettings,
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IPlannerProgramExercise,
    exerciseType?: IExerciseType,
    set?: ISet
  ): void {
    const isUnilateral = exerciseType ? Exercise.getIsUnilateral(exerciseType, settings) : false;
    dispatch({
      type: "UpdateProgress",
      lensRecordings: [
        lb<IHistoryRecord>()
          .pi("ui")
          .p("editSetModal")
          .record({
            programExerciseId: programExercise?.key,
            set: set ? ObjectUtils.clone(set) : Reps.newSet(isUnilateral, setIndex ?? 0),
            isWarmup,
            entryIndex,
            setIndex,
            exerciseType,
          }),
      ],
      desc: "show-target-bottomsheet",
    });
  }
}
