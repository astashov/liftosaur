import { useCallback } from "react";
import { lb } from "lens-shmens";
import { IEvaluatedProgram, Program_getProgramExerciseForKeyAndShortDayData } from "../../../models/program";
import { ISettings } from "../../../types";
import { IPlannerState } from "../../../pages/planner/models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IDispatch } from "../../../ducks/types";
import { Thunk_pushToEditProgramExercise } from "../../../ducks/thunks";
import { pickerStateFromPlannerExercise } from "../editProgramUtils";
import { IProgramGrid, IProgramGridPlacement, ProgramGrid_dayDataAt } from "../../../pages/planner/models/programGrid";

// Everything the grid does that is *not* an edit: pushing the exercise editor, opening the picker.
// These belong apart from useGridActions because they don't go through a transform and never can —
// they change what is on screen, not what the program says. Keeping them here is what lets the
// actions hook be exactly "every edit, each behind the same pre-flight", with no exceptions to
// explain.
export interface IGridNavigation {
  onEditPlacement: (placement: IProgramGridPlacement) => void;
  onDuplicatePlacement: (placement: IProgramGridPlacement) => void;
  onAddExercise: (weekIndex: number, rowIndex: number) => void;
}

export function useGridNavigation(args: {
  grid: IProgramGrid;
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
  programId: string;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}): IGridNavigation {
  const { grid, evaluatedProgram, settings, programId, dispatch, plannerDispatch } = args;

  const onEditPlacement = useCallback(
    (placement: IProgramGridPlacement) => {
      dispatch(
        Thunk_pushToEditProgramExercise(
          placement.key,
          ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart),
          programId
        )
      );
    },
    [dispatch, grid, programId]
  );

  // The picker is what actually writes the duplicate, once the user has chosen — so this opens it
  // rather than editing anything itself.
  const onDuplicatePlacement = useCallback(
    (placement: IProgramGridPlacement) => {
      const dayData = ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart);
      const exercise = Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, dayData, placement.key);
      plannerDispatch(
        lb<IPlannerState>()
          .p("ui")
          .p("exercisePicker")
          .record({
            state: pickerStateFromPlannerExercise(settings, exercise),
            dayData,
            exerciseKey: placement.key,
            change: "duplicate",
          }),
        "Open duplicate exercise modal"
      );
    },
    [plannerDispatch, grid, evaluatedProgram, settings]
  );

  const onAddExercise = useCallback(
    (weekIndex: number, rowIndex: number) => {
      plannerDispatch(
        lb<IPlannerState>()
          .p("ui")
          .p("exercisePicker")
          .record({
            dayData: { week: weekIndex + 1, dayInWeek: rowIndex + 1 },
            change: "all",
            state: pickerStateFromPlannerExercise(settings),
          }),
        "Open add exercise picker"
      );
    },
    [plannerDispatch, settings]
  );

  return { onEditPlacement, onDuplicatePlacement, onAddExercise };
}
