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
  PlannerStructure_deleteDayRow,
  PlannerStructure_deleteWeek,
  PlannerStructure_duplicateDayRow,
  PlannerStructure_duplicateWeek,
  PlannerStructure_moveDayRow,
  PlannerStructure_moveExerciseToDay,
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
  onMoveDayRow: (from: number, to: number) => void;
  onDuplicateDay: (rowIndex: number) => void;
  onDeleteDay: (rowIndex: number) => void;
  onMoveWeek: (from: number, to: number) => void;
  onDuplicateWeek: (weekIndex: number) => void;
  onDeleteWeek: (weekIndex: number) => void;
  onReorderExercisesInDay: (rowIndex: number, order: string[]) => void;
  onMoveExerciseToDay: (fromRow: number, fullName: string, toRow: number, before: string | undefined) => void;
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

  const onMoveDayRow = useCallback(
    (from: number, to: number) => {
      applyTransform(
        (planner) => PlannerStructure_moveDayRow(planner, from, to, settings),
        `Move day ${from + 1} to position ${to + 1}`,
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
            // The line's week, not the strip's: resizing a fragment of an interrupted repeat has to
            // widen the line that produces it, not plant a new one where the fragment is drawn.
            ProgramGrid_dayDataAt(grid, placement.rowIndex, placement.sourceWeeks[0] ?? placement.colStart),
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

  const onDuplicateDay = useCallback(
    (rowIndex: number) => {
      applyTransform(
        (planner) => PlannerStructure_duplicateDayRow(planner, rowIndex, settings),
        `Duplicate day ${rowIndex + 1} in every week`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onDeleteDay = useCallback(
    (rowIndex: number) => {
      applyTransform(
        (planner) => PlannerStructure_deleteDayRow(planner, rowIndex, settings),
        `Delete day ${rowIndex + 1} from every week`,
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

  const onMoveExerciseToDay = useCallback(
    (fromRow: number, fullName: string, toRow: number, before: string | undefined) => {
      applyTransform(
        (planner) => PlannerStructure_moveExerciseToDay(planner, fromRow, fullName, toRow, before, settings),
        `Move ${fullName} to day ${toRow + 1}`,
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
    onMoveDayRow,
    onDuplicateDay,
    onDeleteDay,
    onMoveWeek,
    onDuplicateWeek,
    onDeleteWeek,
    onReorderExercisesInDay,
    onMoveExerciseToDay,
  };
}
