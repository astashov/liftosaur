import { lb } from "lens-shmens";
import { Program_getProgramExerciseForKeyAndShortDayData } from "../../../models/program";
import { pickerStateFromPlannerExercise } from "../../../components/editProgram/editProgramUtils";
import type { IGridNavigation, IGridNavigationContext } from "../../../components/editProgram/editProgramGrid/gridHost";
import { IProgramGridPlacement, ProgramGrid_dayDataAt } from "./programGrid";
import { IPlannerSidePanelTab, IPlannerState } from "./types";
import { PlannerExerciseSwap_open } from "./plannerExerciseSwap";

export function PlannerGridNavigation_create(context: IGridNavigationContext): IGridNavigation {
  const { grid, evaluatedProgram, settings, plannerDispatch } = context;
  const lbUi = lb<IPlannerState>().p("ui");

  function exerciseAt(placement: IProgramGridPlacement): ReturnType<typeof Program_getProgramExerciseForKeyAndShortDayData> {
    const dayData = ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart);
    return Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, dayData, placement.key);
  }

  function openPicker(placement: IProgramGridPlacement, change: "one" | "all" | "duplicate", desc: string): void {
    plannerDispatch(
      lbUi.p("exercisePicker").record({
        state: { ...pickerStateFromPlannerExercise(settings, exerciseAt(placement)), hideLabel: true },
        dayData: ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart),
        exerciseKey: placement.key,
        change,
      }),
      desc
    );
  }

  function showStats(tab: IPlannerSidePanelTab): void {
    plannerDispatch([lbUi.p("sidePanelTab").record(tab), lbUi.p("sidePanelOpen").record(true)], `Show ${tab} stats`);
  }

  return {
    onDuplicatePlacement: (placement) => openPicker(placement, "duplicate", "Open duplicate exercise picker"),
    onSwapPlacement: (placement) => {
      const exercise = exerciseAt(placement);
      if (exercise == null) {
        openPicker(placement, "one", "Open swap exercise picker");
        return;
      }
      const dayData = ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart);
      plannerDispatch(
        lbUi.recordModify((ui) => PlannerExerciseSwap_open(ui, evaluatedProgram, settings, exercise, dayData)),
        "Swap exercise"
      );
    },
    onAddExercise: (weekIndex, rowIndex) => {
      plannerDispatch(
        lbUi.p("exercisePicker").record({
          dayData: { week: weekIndex + 1, dayInWeek: rowIndex + 1 },
          change: "all",
          state: { ...pickerStateFromPlannerExercise(settings), hideLabel: true },
        }),
        "Open add exercise picker"
      );
    },
    onShowWeekStats: () => showStats("week"),
    onShowDayStats: () => showStats("day"),
    onShowExerciseStats: () => showStats("exercise"),
  };
}
