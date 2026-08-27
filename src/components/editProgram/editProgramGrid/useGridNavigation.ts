import { useCallback } from "react";
import { lb } from "lens-shmens";
import { IEvaluatedProgram, Program_getProgramExerciseForKeyAndShortDayData } from "../../../models/program";
import { ISettings } from "../../../types";
import { IPlannerState } from "../../../pages/planner/models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IDispatch } from "../../../ducks/types";
import { Thunk_pushToEditProgramExercise } from "../../../ducks/thunks";
import { pickerStateFromPlannerExercise } from "../editProgramUtils";
import {
  IProgramGrid,
  IProgramGridPlacement,
  ProgramGrid_dayDataAt,
  ProgramGrid_hasDay,
} from "../../../pages/planner/models/programGrid";
import { navigateToModal } from "../../../navigation/navigationService";

// Everything the grid does that is *not* an edit: pushing the exercise editor, opening the picker.
// These belong apart from useGridActions because they don't go through a transform and never can —
// they change what is on screen, not what the program says. Keeping them here is what lets the
// actions hook be exactly "every edit, each behind the same pre-flight", with no exceptions to
// explain.
export interface IGridNavigation {
  onEditPlacement: (placement: IProgramGridPlacement) => void;
  onDuplicatePlacement: (placement: IProgramGridPlacement) => void;
  onAddExercise: (weekIndex: number, rowIndex: number) => void;
  onShowWeekStats: (weekIndex: number) => void;
  onShowDayStats: (rowIndex: number) => void;
  onShowExerciseStats: (placement: IProgramGridPlacement) => void;
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
          { editProgramId: programId }
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

  const onShowWeekStats = useCallback(
    (weekIndex: number) => {
      plannerDispatch(lb<IPlannerState>().p("ui").p("showWeekStats").record(weekIndex), "Show week stats");
      navigateToModal("weekStatsModal", { programId });
    },
    [plannerDispatch, programId]
  );

  // The stats modal reads its week from `ui.weekIndex` and only its day from `showDayStats`, because
  // everywhere else it opens from there is already inside one week. The grid isn't, so it has to say
  // which week it means — and it means the first that has this day, the same week the dock is
  // already showing the name and description of.
  const onShowDayStats = useCallback(
    (rowIndex: number) => {
      const row = grid.rows[rowIndex];
      const weekIndex = grid.columns.findIndex((column) => row != null && ProgramGrid_hasDay(row, column.weekIndex));
      if (weekIndex === -1) {
        return;
      }
      plannerDispatch(
        [
          lb<IPlannerState>().p("ui").p("weekIndex").record(weekIndex),
          lb<IPlannerState>().p("ui").p("showDayStats").record(rowIndex),
        ],
        "Show day stats"
      );
      navigateToModal("dayStatsModal", { programId });
    },
    [plannerDispatch, grid, programId]
  );

  // Stats are read off one week's evaluated day by line number, so a run that spans several weeks
  // reports the week it starts in — the same one its pencil opens.
  const onShowExerciseStats = useCallback(
    (placement: IProgramGridPlacement) => {
      const dayData = ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart);
      const exercise = Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, dayData, placement.key);
      if (exercise == null) {
        return;
      }
      plannerDispatch(
        [
          lb<IPlannerState>().p("ui").p("focusedExercise").record({
            weekIndex: placement.colStart,
            dayIndex: placement.rowIndex,
            exerciseLine: exercise.line,
          }),
          lb<IPlannerState>().p("ui").p("showExerciseStats").record(true),
        ],
        "Show exercise stats"
      );
      navigateToModal("exerciseStatsModal", { programId });
    },
    [plannerDispatch, grid, evaluatedProgram, programId]
  );

  return {
    onEditPlacement,
    onDuplicatePlacement,
    onAddExercise,
    onShowWeekStats,
    onShowDayStats,
    onShowExerciseStats,
  };
}
