import { useCallback, useRef } from "react";
import { lb } from "lens-shmens";
import { IEvaluatedProgram } from "../../../models/program";
import { IPlannerProgram, ISettings } from "../../../types";
import { IPlannerState } from "../../../pages/planner/models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { Dialog_alert } from "../../../utils/dialog";
import { IProgramGrid, IProgramGridPlacement, ProgramGrid_dayDataAt } from "../../../pages/planner/models/programGrid";
import {
  IPlannerStructureResult,
  IPlannerStructureExerciseMove,
  PlannerStructure_deleteDayRow,
  PlannerStructure_deleteWeek,
  PlannerStructure_duplicateDayRow,
  PlannerStructure_duplicateWeek,
  PlannerStructure_moveDayRows,
  PlannerStructure_moveExercisesToDay,
  PlannerStructure_moveWeek,
  PlannerStructure_reorderExercisesInDay,
  PlannerStructure_setRepeatRange,
  PlannerStructure_addDay,
  PlannerStructure_addWeek,
  PlannerStructure_deleteExercises,
} from "../../../pages/planner/models/plannerStructure";

// Every edit the grid can make, and *only* edits — navigation lives in useGridNavigation. They all
// share one shape: ask a pure transform first so a refusal can be shown, then dispatch it through
// the lens. Checking inside the modifier alone would leave the refusal nowhere to go and the edit
// would read as a silent no-op.
//
// The rule this hook exists to keep true: the grid never edits the program itself. Every entry
// below goes through applyTransform, so there is no path that writes program text without a
// transform having agreed to it first.
export interface IGridActions {
  onDeletePlacements: (placements: IProgramGridPlacement[]) => void;
  onAddDay: (weekIndex: number) => void;
  onAddWeek: () => void;
  onSetRepeatRange: (placement: IProgramGridPlacement, toWeekIndex: number) => void;
  onMoveDayRows: (rows: number[], insertAt: number) => void;
  onDuplicateDays: (rowIndexes: number[]) => void;
  onDeleteDays: (rowIndexes: number[]) => void;
  onMoveWeek: (from: number, to: number) => void;
  onDuplicateWeek: (weekIndex: number) => void;
  onDeleteWeek: (weekIndex: number) => void;
  onReorderExercisesInDay: (rowIndex: number, order: string[]) => void;
  onMoveExercisesToDay: (moves: IPlannerStructureExerciseMove[], toRow: number, before: string | undefined) => void;
}

// Several rows through a transform that only knows how to do one. Bottom up, because deleting a row
// shifts the ones after it; and the first refusal stops the chain, since half of a structural edit
// is worse than none of it.
function eachRow(
  start: IPlannerProgram,
  rowIndexes: number[],
  transform: (planner: IPlannerProgram, rowIndex: number) => IPlannerStructureResult
): IPlannerStructureResult {
  return rowIndexes
    .slice()
    .sort((a, b) => b - a)
    .reduce<IPlannerStructureResult>((acc, rowIndex) => (acc.success ? transform(acc.data, rowIndex) : acc), {
      success: true,
      data: start,
    });
}

export function useGridActions(args: {
  grid: IProgramGrid;
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerState>;
  // Called after an edit that restructures rows or columns, so a selection pointing at the old
  // shape doesn't linger.
  onStructuralChange: () => void;
}): IGridActions {
  const { grid, evaluatedProgram, settings, plannerDispatch, onStructuralChange } = args;
  // Read by the pre-flight, which has to answer "can this be done" before dispatching.
  const plannerRef = useRef(evaluatedProgram.planner);
  plannerRef.current = evaluatedProgram.planner;

  // Whether the edit changes which rows and columns exist. A selection points at a row index or a
  // week index, so anything that reshuffles those leaves it pointing at something else — and that
  // is a property of the *command*, not something each callback should remember to clean up after
  // itself. An edit added later inherits the rule by declaring its kind.
  type IEditKind = "content" | "structural";

  const applyTransform = useCallback(
    (
      transform: (planner: IPlannerProgram) => IPlannerStructureResult,
      description: string,
      // Required, not defaulted: a default is a classification the next command can forget to make,
      // and forgetting leaves a selection pointing at a row or week that now holds something else.
      kind: IEditKind
    ) => {
      const check = transform(plannerRef.current);
      if (!check.success) {
        Dialog_alert(check.error);
        return;
      }
      plannerDispatch(
        lb<IPlannerState>()
          .p("current")
          .p("program")
          .pi("planner")
          .recordModify((planner) => {
            const result = transform(planner);
            return result.success ? result.data : planner;
          }),
        description
      );
      if (kind === "structural") {
        onStructuralChange();
      }
    },
    [plannerDispatch, onStructuralChange]
  );

  const onMoveDayRows = useCallback(
    (rows: number[], insertAt: number) => {
      applyTransform(
        (planner) => PlannerStructure_moveDayRows(planner, rows, insertAt, settings),
        `Move ${rows.length} day(s) to position ${insertAt + 1}`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onDeletePlacements = useCallback(
    (placements: IProgramGridPlacement[]) => {
      // One target per line behind the strip: a strip drawn from two identically written weeks has
      // two, and deleting only the one it starts in leaves the other behind.
      const targets = placements.flatMap((placement) =>
        placement.sourceWeeks.map((week) => ({
          ...ProgramGrid_dayDataAt(grid, placement.rowIndex, week),
          fullName: placement.fullName,
        }))
      );
      applyTransform(
        (planner) => PlannerStructure_deleteExercises(planner, targets, settings),
        `Delete ${placements.length} exercise(s) from grid`,
        "structural"
      );
    },
    [applyTransform, grid, settings]
  );

  const onAddDay = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => PlannerStructure_addDay(planner, weekIndex, settings),
        `Add a day to week ${weekIndex + 1}`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onSetRepeatRange = useCallback(
    (placement: IProgramGridPlacement, toWeekIndex: number) => {
      applyTransform(
        (planner) =>
          PlannerStructure_setRepeatRange(
            planner,
            // Where the line's claimed range starts — not where this strip is drawn, and not where
            // the line is written. A repeat interrupted by an override draws several strips, and
            // dragging the edge of any of them means "make this line cover through here"; a
            // back-filled repeat is drawn before the week it is written in. `repeatSpan` is the
            // claim itself, so it is the only one of the three that answers the question.
            ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.repeatSpan?.[0] ?? placement.colStart),
            (placement.repeatSpan?.[1] ?? placement.colEnd) + 1,
            placement.fullName,
            toWeekIndex + 1,
            settings
          ),
        `Repeat ${placement.fullName} through week ${toWeekIndex + 1}`,
        "content"
      );
    },
    [applyTransform, grid, settings]
  );

  const onAddWeek = useCallback(() => {
    applyTransform((planner) => PlannerStructure_addWeek(planner, settings), "Add new week", "structural");
  }, [applyTransform, settings]);

  const onDuplicateDays = useCallback(
    (rowIndexes: number[]) => {
      applyTransform(
        (planner) =>
          eachRow(planner, rowIndexes, (p, rowIndex) => PlannerStructure_duplicateDayRow(p, rowIndex, settings)),
        `Duplicate ${rowIndexes.length} day(s) in every week`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onDeleteDays = useCallback(
    (rowIndexes: number[]) => {
      applyTransform(
        (planner) =>
          eachRow(planner, rowIndexes, (p, rowIndex) => PlannerStructure_deleteDayRow(p, rowIndex, settings)),
        `Delete ${rowIndexes.length} day(s) from every week`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onDuplicateWeek = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => PlannerStructure_duplicateWeek(planner, weekIndex, settings),
        `Duplicate week ${weekIndex + 1}`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onDeleteWeek = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => PlannerStructure_deleteWeek(planner, weekIndex, settings),
        `Delete week ${weekIndex + 1}`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onMoveWeek = useCallback(
    (from: number, to: number) => {
      applyTransform(
        (planner) => PlannerStructure_moveWeek(planner, from, to, settings),
        `Move week ${from + 1} to position ${to + 1}`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onReorderExercisesInDay = useCallback(
    (rowIndex: number, order: string[]) => {
      applyTransform(
        (planner) => PlannerStructure_reorderExercisesInDay(planner, rowIndex, order, settings),
        `Reorder exercises in day ${rowIndex + 1}`,
        "content"
      );
    },
    [applyTransform, settings]
  );

  const onMoveExercisesToDay = useCallback(
    (moves: IPlannerStructureExerciseMove[], toRow: number, before: string | undefined) => {
      applyTransform(
        (planner) => PlannerStructure_moveExercisesToDay(planner, moves, toRow, before, settings),
        `Move ${moves.map((m) => m.fullName).join(", ")} to day ${toRow + 1}`,
        "content"
      );
    },
    [applyTransform, settings]
  );

  return {
    onDeletePlacements,
    onAddDay,
    onAddWeek,
    onSetRepeatRange,
    onMoveDayRows,
    onDuplicateDays,
    onDeleteDays,
    onMoveWeek,
    onDuplicateWeek,
    onDeleteWeek,
    onReorderExercisesInDay,
    onMoveExercisesToDay,
  };
}
