import { lb } from "lens-shmens";
import {
  Program_getNumberOfExerciseInstances,
  Program_getProgramExerciseForKeyAndShortDayData,
} from "../../../models/program";
import { IPlannerState } from "../../../pages/planner/models/types";
import { IDispatch } from "../../../ducks/types";
import { Thunk_pushToEditProgramExercise } from "../../../ducks/thunks";
import { pickerStateFromPlannerExercise } from "../editProgramUtils";
import {
  IProgramGridPlacement,
  ProgramGrid_dayDataAt,
  ProgramGrid_hasDay,
} from "../../../pages/planner/models/programGrid";
import { navigateToModal } from "../../../navigation/navigationService";
import { IGridNavigation, IGridNavigationContext } from "./gridHost";

// Everything the grid does that is *not* an edit: pushing the exercise editor, opening the picker.
// These belong apart from useGridActions because they don't go through a transform and never can —
// they change what is on screen, not what the program says.
export function GridAppNavigation_create(
  context: IGridNavigationContext,
  programId: string,
  dispatch: IDispatch
): IGridNavigation {
  const { grid, evaluatedProgram, settings, plannerDispatch } = context;

  return {
    onEditPlacement: (placement: IProgramGridPlacement) => {
      dispatch(
        Thunk_pushToEditProgramExercise(
          placement.key,
          ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart),
          { editProgramId: programId }
        )
      );
    },

    onDuplicatePlacement: (placement: IProgramGridPlacement) => {
      const dayData = ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart);
      const exercise = Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, dayData, placement.key);
      plannerDispatch(
        lb<IPlannerState>()
          .p("ui")
          .p("exercisePicker")
          .record({
            state: { ...pickerStateFromPlannerExercise(settings, exercise), hideLabel: true },
            dayData,
            exerciseKey: placement.key,
            change: "duplicate",
          }),
        "Open duplicate exercise modal"
      );
    },

    onSwapPlacement: (placement: IProgramGridPlacement) => {
      const dayData = ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart);
      const exercise = Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, dayData, placement.key);
      if (exercise != null && Program_getNumberOfExerciseInstances(evaluatedProgram, placement.key) > 1) {
        plannerDispatch(
          lb<IPlannerState>().p("ui").p("editExerciseModal").record({ plannerExercise: exercise }),
          "Open edit exercise modal"
        );
        navigateToModal("editExerciseChangeModal", { programId });
        return;
      }
      plannerDispatch(
        lb<IPlannerState>()
          .p("ui")
          .p("exercisePicker")
          .record({
            state: { ...pickerStateFromPlannerExercise(settings, exercise), hideLabel: true },
            dayData,
            exerciseKey: placement.key,
            change: "one",
          }),
        "Open exercise picker modal"
      );
    },

    onAddExercise: (weekIndex: number, rowIndex: number) => {
      plannerDispatch(
        lb<IPlannerState>()
          .p("ui")
          .p("exercisePicker")
          .record({
            dayData: { week: weekIndex + 1, dayInWeek: rowIndex + 1 },
            change: "all",
            state: { ...pickerStateFromPlannerExercise(settings), hideLabel: true },
          }),
        "Open add exercise picker"
      );
    },

    onShowWeekStats: (weekIndex: number) => {
      plannerDispatch(lb<IPlannerState>().p("ui").p("showWeekStats").record(weekIndex), "Show week stats");
      navigateToModal("weekStatsModal", { programId });
    },

    // The stats modal reads its week from `ui.weekIndex` and only its day from `showDayStats`, because
    // everywhere else it opens from there is already inside one week. The grid isn't, so it has to say
    // which week it means — and it means the first week that has this day.
    onShowDayStats: (rowIndex: number) => {
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

    onShowExerciseStats: (placement: IProgramGridPlacement) => {
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
  };
}
