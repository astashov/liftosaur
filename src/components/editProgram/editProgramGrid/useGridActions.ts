import { useCallback, useRef } from "react";
import { lb } from "lens-shmens";
import { IEvaluatedProgram, Program_getProgramExerciseForKeyAndShortDayData } from "../../../models/program";
import { IPlannerProgram, ISettings } from "../../../types";
import { IPlannerState } from "../../../pages/planner/models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IDispatch } from "../../../ducks/types";
import { Thunk_pushToEditProgramExercise } from "../../../ducks/thunks";
import { Dialog_alert } from "../../../utils/dialog";
import { EditProgramUiHelpers_deleteCurrentInstance } from "../editProgramUi/editProgramUiHelpers";
import { pickerStateFromPlannerExercise } from "../editProgramUtils";
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
  ProgramGridTransforms_uniqueWeekName,
} from "../../../pages/planner/models/programGridTransforms";

// Every edit the grid can make, in one place. They all share one shape: ask a pure transform first
// so a refusal can be shown, then dispatch it through the lens — checking inside the modifier alone
// would leave the refusal nowhere to go, and the edit would read as a silent no-op.
export interface IGridActions {
  onEditPlacement: (placement: IProgramGridPlacement) => void;
  onDuplicatePlacement: (placement: IProgramGridPlacement) => void;
  onDeletePlacements: (placements: IProgramGridPlacement[]) => void;
  onAddExercise: (weekIndex: number, rowIndex: number) => void;
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
  programId: string;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  // Called after an edit that restructures rows or columns, so a selection pointing at the old
  // shape doesn't linger.
  onStructuralChange: () => void;
}): IGridActions {
  const { grid, evaluatedProgram, settings, programId, dispatch, plannerDispatch, onStructuralChange } = args;
  // Read by the pre-flight, which has to answer "can this be done" before dispatching.
  const plannerRef = useRef(evaluatedProgram.planner);
  plannerRef.current = evaluatedProgram.planner;

  const applyTransform = useCallback(
    (transform: (planner: IPlannerProgram) => IProgramGridTransformResult, description: string) => {
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
    },
    [plannerDispatch]
  );

  const onMoveDayRow = useCallback(
    (from: number, to: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_moveDayRow(planner, from, to, settings),
        `Move day ${from + 1} to position ${to + 1}`
      );
    },
    [applyTransform, settings]
  );

  const onEditPlacement = useCallback(
    (placement: IProgramGridPlacement) => {
      dispatch(Thunk_pushToEditProgramExercise(placement.key, ProgramGrid_dayDataAt(grid, placement), programId));
    },
    [dispatch, programId]
  );

  const onDuplicatePlacement = useCallback(
    (placement: IProgramGridPlacement) => {
      const dayData = ProgramGrid_dayDataAt(grid, placement);
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
    [plannerDispatch, evaluatedProgram, settings]
  );

  const onDeletePlacements = useCallback(
    (placements: IProgramGridPlacement[]) => {
      // Deleting an exercise that others reuse orphans them, and materializing the reusers is the
      // v2 work. Until then this refuses rather than quietly breaking the program.
      const sources = placements.filter((p) => p.isReuseSource);
      if (sources.length > 0) {
        Dialog_alert(
          `${sources.map((p) => p.fullName).join(", ")} ${sources.length === 1 ? "is" : "are"} reused by other exercises. Change those to stop reusing it first.`
        );
        return;
      }
      plannerDispatch(
        lb<IPlannerState>()
          .p("current")
          .p("program")
          .pi("planner")
          .recordModify((planner) => {
            return placements.reduce(
              (acc, placement) =>
                EditProgramUiHelpers_deleteCurrentInstance(
                  acc,
                  ProgramGrid_dayDataAt(grid, placement),
                  placement.fullName,
                  settings,
                  false,
                  true
                ),
              planner
            );
          }),
        `Delete ${placements.length} exercise(s) from grid`
      );
      onStructuralChange();
    },
    [plannerDispatch, settings, onStructuralChange]
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
    [plannerDispatch, settings, onStructuralChange]
  );

  const onAddDay = useCallback(
    (weekIndex: number) => {
      plannerDispatch(
        lb<IPlannerState>()
          .p("current")
          .p("program")
          .pi("planner")
          .p("weeks")
          .i(weekIndex)
          .p("days")
          .recordModify((days) => [...days, { name: `Day ${days.length + 1}`, exerciseText: "" }]),
        "Add new day"
      );
    },
    [plannerDispatch]
  );

  const onSetRepeatRange = useCallback(
    (placement: IProgramGridPlacement, toWeekIndex: number) => {
      plannerDispatch(
        lb<IPlannerState>()
          .p("current")
          .p("program")
          .pi("planner")
          .recordModify((planner) =>
            ProgramGridTransforms_setRepeatRange(
              planner,
              ProgramGrid_dayDataAt(grid, placement),
              placement.fullName,
              toWeekIndex + 1
            )
          ),
        `Repeat ${placement.fullName} through week ${toWeekIndex + 1}`
      );
    },
    [plannerDispatch]
  );

  const onAddWeek = useCallback(() => {
    plannerDispatch(
      lb<IPlannerState>()
        .p("current")
        .p("program")
        .pi("planner")
        .p("weeks")
        .recordModify((weeks) => [
          ...weeks,
          {
            name: ProgramGridTransforms_uniqueWeekName({ ...plannerRef.current, weeks }, `Week ${weeks.length + 1}`),
            days: [],
          },
        ]),
      "Add new week"
    );
  }, [plannerDispatch]);

  const onDuplicateDay = useCallback(
    (rowIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_duplicateDayRow(planner, rowIndex, settings),
        `Duplicate day ${rowIndex + 1} in every week`
      );
      onStructuralChange();
    },
    [applyTransform, settings, onStructuralChange]
  );

  const onDeleteDay = useCallback(
    (rowIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_deleteDayRow(planner, rowIndex, settings),
        `Delete day ${rowIndex + 1} from every week`
      );
      onStructuralChange();
    },
    [applyTransform, settings]
  );

  const onDuplicateWeek = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_duplicateWeek(planner, weekIndex, settings),
        `Duplicate week ${weekIndex + 1}`
      );
      onStructuralChange();
    },
    [applyTransform, settings]
  );

  const onDeleteWeek = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_deleteWeek(planner, weekIndex, settings),
        `Delete week ${weekIndex + 1}`
      );
      onStructuralChange();
    },
    [applyTransform, settings]
  );

  const onMoveWeek = useCallback(
    (from: number, to: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_moveWeek(planner, from, to, settings),
        `Move week ${from + 1} to position ${to + 1}`
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
    onEditPlacement,
    onDuplicatePlacement,
    onDeletePlacements,
    onAddExercise,
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
