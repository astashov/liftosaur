import { lb } from "lens-shmens";
import { IPlannerProgramExercise, IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IExercisePickerState } from "../../types";

export function applyChangesInEditor(plannerDispatch: ILensDispatch<IPlannerState>, cb: () => void): void {
  window.isUndoing = true;
  cb();
  plannerDispatch(
    [
      lb<IPlannerState>()
        .p("ui")
        .recordModify((a) => a),
    ],
    "stop-is-undoing"
  );
}

export function pickerStateFromPlannerExercise(plannerExercise?: IPlannerProgramExercise): IExercisePickerState {
  const templateName =
    plannerExercise != null && plannerExercise.exerciseType == null ? plannerExercise.name : undefined;

  return {
    mode: "program",
    screenStack: ["exercisePicker"],
    sort: "name_asc",
    filters: {},
    label: plannerExercise?.label,
    templateName,
    exerciseType: plannerExercise?.exerciseType,
    selectedTab: templateName != null ? 1 : 0,
    selectedExercises:
      plannerExercise && plannerExercise.exerciseType != null
        ? [
            {
              type: "adhoc",
              exerciseType: plannerExercise.exerciseType,
              label: plannerExercise.label,
            },
          ]
        : [],
  };
}
