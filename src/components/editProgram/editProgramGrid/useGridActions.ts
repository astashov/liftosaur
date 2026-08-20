import { useCallback, useRef } from "react";
import { lb } from "lens-shmens";
import { IEvaluatedProgram } from "../../../models/program";
import { IPlannerProgram, ISettings } from "../../../types";
import { IPlannerState } from "../../../pages/planner/models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { Dialog_alert } from "../../../utils/dialog";
import { IProgramGrid, IProgramGridPlacement, ProgramGrid_dayDataAt } from "../../../pages/planner/models/programGrid";
import {
  IProgramGridTransformResult,
  ProgramGridTransforms_deleteDayRow,
  ProgramGridTransforms_deleteWeek,
  ProgramGridTransforms_duplicateDayRow,
  ProgramGridTransforms_duplicateWeek,
  ProgramGridTransforms_moveDayRow,
  ProgramGridTransforms_moveExerciseToDay,
  ProgramGridTransforms_moveWeek,
  ProgramGridTransforms_reorderExercisesInDay,
  ProgramGridTransforms_setRepeatRange,
  ProgramGridTransforms_addDay,
  ProgramGridTransforms_addWeek,
  ProgramGridTransforms_deleteExercises,
} from "../../../pages/planner/models/programGridTransforms";

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
      transform: (planner: IPlannerProgram) => IProgramGridTransformResult,
      description: string,
      kind: IEditKind = "content"
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
        (planner) => ProgramGridTransforms_moveDayRow(planner, from, to, settings),
        `Move day ${from + 1} to position ${to + 1}`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onDeletePlacements = useCallback(
    (placements: IProgramGridPlacement[]) => {
      const targets = placements.map((placement) => ({
        ...ProgramGrid_dayDataAt(grid, placement),
        fullName: placement.fullName,
      }));
      applyTransform(
        (planner) => ProgramGridTransforms_deleteExercises(planner, targets, settings),
        `Delete ${placements.length} exercise(s) from grid`,
        "structural"
      );
    },
    [applyTransform, grid, settings]
  );

  const onAddDay = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_addDay(planner, weekIndex, settings),
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
          ProgramGridTransforms_setRepeatRange(
            planner,
            ProgramGrid_dayDataAt(grid, placement),
            placement.fullName,
            toWeekIndex + 1
          ),
        `Repeat ${placement.fullName} through week ${toWeekIndex + 1}`
      );
    },
    [applyTransform, grid]
  );

  const onAddWeek = useCallback(() => {
    applyTransform((planner) => ProgramGridTransforms_addWeek(planner, settings), "Add new week", "structural");
  }, [applyTransform, settings]);

  const onDuplicateDay = useCallback(
    (rowIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_duplicateDayRow(planner, rowIndex, settings),
        `Duplicate day ${rowIndex + 1} in every week`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onDeleteDay = useCallback(
    (rowIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_deleteDayRow(planner, rowIndex, settings),
        `Delete day ${rowIndex + 1} from every week`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onDuplicateWeek = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_duplicateWeek(planner, weekIndex, settings),
        `Duplicate week ${weekIndex + 1}`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onDeleteWeek = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_deleteWeek(planner, weekIndex, settings),
        `Delete week ${weekIndex + 1}`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onMoveWeek = useCallback(
    (from: number, to: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_moveWeek(planner, from, to, settings),
        `Move week ${from + 1} to position ${to + 1}`,
        "structural"
      );
    },
    [applyTransform, settings]
  );

  const onReorderExercisesInDay = useCallback(
    (rowIndex: number, order: string[]) => {
      applyTransform(
        (planner) => ProgramGridTransforms_reorderExercisesInDay(planner, rowIndex, order, settings),
        `Reorder exercises in day ${rowIndex + 1}`
      );
    },
    [applyTransform, settings]
  );

  const onMoveExerciseToDay = useCallback(
    (fromRow: number, fullName: string, toRow: number, before: string | undefined) => {
      applyTransform(
        (planner) => ProgramGridTransforms_moveExerciseToDay(planner, fromRow, fullName, toRow, before, settings),
        `Move ${fullName} to day ${toRow + 1}`
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
