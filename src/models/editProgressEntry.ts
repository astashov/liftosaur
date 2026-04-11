import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { ISet, IHistoryRecord, IExerciseType, ISettings } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { ObjectUtils_clone } from "../utils/object";
import { Reps_newSet } from "./set";
import { Exercise_getIsUnilateral } from "./exercise";

export function EditProgressEntry_showEditSetModal(
  dispatch: IDispatch,
  settings: ISettings,
  isWarmup: boolean,
  entryIndex: number,
  progress: IHistoryRecord,
  setIndex?: number,
  programExercise?: IPlannerProgramExercise,
  exerciseType?: IExerciseType,
  set?: ISet
): void {
  const isUnilateral = exerciseType ? Exercise_getIsUnilateral(exerciseType, settings) : false;
  const openModal = (): void => {
    dispatch({
      type: "UpdateProgress",
      lensRecordings: [
        lb<IHistoryRecord>()
          .pi("ui", {})
          .p("editSetModal")
          .record({
            programExerciseId: programExercise?.key,
            set: set ? ObjectUtils_clone(set) : Reps_newSet(isUnilateral, setIndex ?? 0),
            isWarmup,
            entryIndex,
            setIndex,
            exerciseType,
          }),
      ],
      desc: "show-target-bottomsheet",
    });
  };
  if (progress.ui?.editSetModal) {
    dispatch({
      type: "UpdateProgress",
      lensRecordings: [lb<IHistoryRecord>().pi("ui", {}).p("editSetModal").record(undefined)],
      desc: "clear-target-bottomsheet",
    });
    setTimeout(openModal, 0);
  } else {
    openModal();
  }
}
