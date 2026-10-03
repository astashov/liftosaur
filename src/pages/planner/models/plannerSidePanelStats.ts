import type { IGridSelectionTarget } from "../../../components/editProgram/editProgramGrid/gridSelectionContext";
import { Exercise_find, Exercise_findByName, IExercise } from "../../../models/exercise";
import { IPlannerProgramExercise, IPlannerSidePanelTab, IPlannerState } from "./types";
import { IPlannerEvalFullResult, IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { IProgramGrid, ProgramGrid_dayDataAt, ProgramGrid_hasDay } from "./programGrid";
import { IEvaluatedProgram, Program_getProgramExerciseForKeyAndShortDayData } from "../../../models/program";
import { ISettings } from "../../../types";
import { CollectionUtils_findIndexReverse } from "../../../utils/collection";
import { PlannerMode_current } from "./plannerMode";

export interface IPlannerCursor {
  weekIndex?: number;
  dayIndex?: number;
  exerciseLine?: number;
  hasErrors?: boolean;
}

export type IPlannerSidePanelEmptyReason = "noCursor" | "hasErrors" | "outOfRange" | "noExercise";

export type IPlannerSidePanelStats =
  | { kind: "week"; weekIndex: number; evaluatedDays: IPlannerEvalResult[] }
  | { kind: "day"; weekIndex: number; dayIndex: number; evaluatedDay: IPlannerEvalResult }
  | { kind: "exercise"; weekIndex: number; dayIndex: number; exerciseLine: number }
  | { kind: "empty"; reason: IPlannerSidePanelEmptyReason };

export function PlannerSidePanelStats_cursor(
  state: IPlannerState,
  fullEvaluation?: IPlannerEvalFullResult
): IPlannerCursor {
  const mode = PlannerMode_current(state.ui);
  if (mode === "full") {
    return cursorInFullText(state.fulltext?.currentLine, fullEvaluation);
  }
  const focused = state.ui.focusedExercise;
  if (mode === "grid" || focused == null || focused.weekIndex !== state.ui.weekIndex) {
    return { weekIndex: state.ui.weekIndex };
  }
  return { weekIndex: focused.weekIndex, dayIndex: focused.dayIndex, exerciseLine: focused.exerciseLine };
}

function cursorInFullText(
  line: number | undefined,
  fullEvaluation: IPlannerEvalFullResult | undefined
): IPlannerCursor {
  if (fullEvaluation != null && !fullEvaluation.success) {
    return { hasErrors: true };
  }
  if (line == null || fullEvaluation == null) {
    return {};
  }
  const weeks = fullEvaluation.data;
  const weekIndex = CollectionUtils_findIndexReverse(weeks, (w) => w.line <= line);
  if (weekIndex === -1) {
    return {};
  }
  const days = weeks[weekIndex].days;
  const dayIndex = CollectionUtils_findIndexReverse(days, (d) => d.line <= line);
  if (dayIndex === -1) {
    return { weekIndex };
  }
  const exercises = days[dayIndex].exercises;
  const exerciseIndex = CollectionUtils_findIndexReverse(exercises, (e) => e.line <= line);
  return { weekIndex, dayIndex, exerciseLine: exerciseIndex === -1 ? undefined : exercises[exerciseIndex].line };
}

export function PlannerSidePanelStats_select(
  tab: IPlannerSidePanelTab,
  cursor: IPlannerCursor,
  evaluatedWeeks: IPlannerEvalResult[][],
  settings: ISettings
): IPlannerSidePanelStats {
  if (cursor.hasErrors) {
    return { kind: "empty", reason: "hasErrors" };
  }
  const { weekIndex, dayIndex, exerciseLine } = cursor;
  if (weekIndex == null) {
    return { kind: "empty", reason: "noCursor" };
  }
  const evaluatedDays = evaluatedWeeks[weekIndex];
  if (evaluatedDays == null) {
    return { kind: "empty", reason: "outOfRange" };
  }
  if (tab === "week") {
    return { kind: "week", weekIndex, evaluatedDays };
  }
  if (dayIndex == null) {
    return { kind: "empty", reason: "noCursor" };
  }
  const evaluatedDay = evaluatedDays[dayIndex];
  if (evaluatedDay == null) {
    return { kind: "empty", reason: "outOfRange" };
  }
  if (!evaluatedDay.success) {
    return { kind: "empty", reason: "hasErrors" };
  }
  if (tab === "day") {
    return { kind: "day", weekIndex, dayIndex, evaluatedDay };
  }
  if (exerciseLine == null) {
    return { kind: "empty", reason: "noExercise" };
  }
  if (PlannerSidePanelStats_findExercise(weekIndex, dayIndex, exerciseLine, evaluatedWeeks, settings) == null) {
    return { kind: "empty", reason: "noExercise" };
  }
  return { kind: "exercise", weekIndex, dayIndex, exerciseLine };
}

export function PlannerSidePanelStats_emptyMessage(
  reason: IPlannerSidePanelEmptyReason,
  tab: IPlannerSidePanelTab,
  isReorder: boolean
): string {
  if (reason === "hasErrors") {
    return "Fix the errors to see the stats.";
  }
  if (tab === "exercise" || reason === "noExercise") {
    return isReorder ? "Select one exercise to see its stats." : "Put the cursor on an exercise to see its stats.";
  }
  if (tab === "day") {
    return isReorder ? "Select one day to see its stats." : "Put the cursor in a day to see its stats.";
  }
  return "Select a week to see its stats.";
}

export function PlannerSidePanelStats_findExercise(
  weekIndex: number,
  dayIndex: number,
  exerciseLine: number,
  evaluatedWeeks: IPlannerEvalResult[][],
  settings: ISettings
): { exercise: IExercise; evaluatedExercise: IPlannerProgramExercise } | undefined {
  const evaluatedDay = evaluatedWeeks[weekIndex]?.[dayIndex];
  if (evaluatedDay == null || !evaluatedDay.success) {
    return undefined;
  }
  const evaluatedExercise = evaluatedDay.data.find((e) => e.line === exerciseLine);
  if (!evaluatedExercise) {
    return undefined;
  }
  const byName = Exercise_findByName(evaluatedExercise.name, settings.exercises);
  if (!byName) {
    return undefined;
  }
  const exercise = Exercise_find({ id: byName.id, equipment: evaluatedExercise.equipment }, settings.exercises);
  return exercise ? { exercise, evaluatedExercise } : undefined;
}

export function PlannerSidePanelStats_cursorFor(args: {
  state: IPlannerState;
  target?: IGridSelectionTarget;
  grid?: IProgramGrid;
  evaluatedProgram?: IEvaluatedProgram;
  fullEvaluation?: IPlannerEvalFullResult;
}): IPlannerCursor {
  const { state, target, grid, evaluatedProgram } = args;
  if (PlannerMode_current(state.ui) === "grid" && target != null && grid != null && evaluatedProgram != null) {
    return PlannerSidePanelStats_cursorFromSelection(target, grid, evaluatedProgram);
  }
  return PlannerSidePanelStats_cursor(state, args.fullEvaluation);
}

export function PlannerSidePanelStats_selectionKey(target: IGridSelectionTarget | undefined): string | undefined {
  if (target == null) {
    return undefined;
  }
  switch (target.kind) {
    case "week":
      return `week:${target.weekIndex}`;
    case "day":
      return `day:${target.rowIndexes.join(",")}`;
    case "exercises":
      return `exercises:${target.placements.map((p) => p.id).join(",")}`;
  }
}

export function PlannerSidePanelStats_forSelection(target: IGridSelectionTarget): IPlannerSidePanelTab | undefined {
  switch (target.kind) {
    case "week":
      return "week";
    case "day":
      return target.rowIndexes.length === 1 ? "day" : undefined;
    case "exercises":
      return target.placements.length === 1 ? "exercise" : undefined;
  }
}

export function PlannerSidePanelStats_cursorFromSelection(
  target: IGridSelectionTarget,
  grid: IProgramGrid,
  evaluatedProgram: IEvaluatedProgram
): IPlannerCursor {
  switch (target.kind) {
    case "week":
      return { weekIndex: target.weekIndex };
    case "day": {
      if (target.rowIndexes.length !== 1) {
        return {};
      }
      const dayIndex = target.rowIndexes[0];
      const row = grid.rows[dayIndex];
      const weekIndex = grid.columns.findIndex((column) => row != null && ProgramGrid_hasDay(row, column.weekIndex));
      return weekIndex === -1 ? {} : { weekIndex, dayIndex };
    }
    case "exercises": {
      if (target.placements.length !== 1) {
        return {};
      }
      const placement = target.placements[0];
      const dayData = ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.colStart);
      const exercise = Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, dayData, placement.key);
      return { weekIndex: placement.colStart, dayIndex: placement.rowIndex, exerciseLine: exercise?.line };
    }
  }
}
