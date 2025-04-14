import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { ISet, IHistoryRecord, IExerciseType, IUnit } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { ObjectUtils } from "../utils/object";
import { Reps } from "./set";

export namespace EditProgressEntry {
  export function showEditSetModal(
    dispatch: IDispatch,
    unit: IUnit,
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IPlannerProgramExercise,
    exerciseType?: IExerciseType,
    set?: ISet
  ): void {
    dispatch({
      type: "UpdateProgress",
      lensRecordings: [
        lb<IHistoryRecord>()
          .pi("ui")
          .p("editSetModal")
          .record({
            programExerciseId: programExercise?.key,
            set: set ? ObjectUtils.clone(set) : Reps.newSet(unit),
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
