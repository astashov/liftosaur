import { useCallback, useMemo, useRef } from "react";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import {
  IGridGeometryRow,
  IGridLaneDrop,
  ProgramGridGeometry_isBlockDropNoop,
  ProgramGridGeometry_laneDropAt,
  ProgramGridGeometry_moveBlock,
} from "../../../pages/planner/models/programGridGeometry";
import { IProgramGrid, ProgramGrid_laneNames } from "../../../pages/planner/models/programGrid";
import { IPlannerStructureExerciseMove } from "../../../pages/planner/models/plannerStructure";
import { IGridDragAutoScroll } from "./gridDragAutoScroll";
import { IGridActiveGhost, IGridLaneRef } from "./useGridDrags";
import { useGridDragSession } from "./useGridDragSession";

export interface IGridLaneDrag {
  onLaneDragStart: (rowIndex: number, laneIndex: number, absolute: number) => void;
  onLaneDragMove: (rowIndex: number, laneIndex: number, translation: number, absolute: number) => void;
  onLaneDragEnd: (commit: boolean) => void;
  draggedLanes: SharedValue<IGridLaneRef[]>;
  dropLaneRow: SharedValue<number>;
  dropLaneGap: SharedValue<number>;
}

// Unlike the day and week drags, this one is owned by the grid rather than by the row it starts in:
// an exercise can be dropped into a *different* day, and only the grid knows where the other rows
// are. The shared values are read by every row, so the drop line can be drawn in one row while
// another row's gesture is tracking the finger.
export function useGridLaneDrag(args: {
  // The model, for identity — which exercise is being dragged. Geometry answers *where* things are;
  // it must not be the thing that says *what* they are.
  getGrid: () => IProgramGrid;
  getGeometry: () => IGridGeometryRow[];
  getLaneHeight: () => number;
  getSelectedLanes: () => IGridLaneRef[];
  ghostY: SharedValue<number>;
  autoScroll: IGridDragAutoScroll;
  setActiveGhost: (ghost: IGridActiveGhost | undefined) => void;
  onReorderExercisesInDay: (rowIndex: number, order: string[]) => void;
  onMoveExercisesToDay: (moves: IPlannerStructureExerciseMove[], toRow: number, before: string | undefined) => void;
}): IGridLaneDrag {
  const { getGrid, getGeometry, getLaneHeight, getSelectedLanes, ghostY, autoScroll } = args;
  const draggedLanes = useSharedValue<IGridLaneRef[]>([]);
  const dropLaneRow = useSharedValue(-1);
  // The gap, in the target row's lanes: gap N sits above lane N, and gap `lanes` below the last one.
  const dropLaneGap = useSharedValue(-1);
  // Which strip the finger grabbed. Set on start, read by resolve/commit, cleared on release.
  const originRef = useRef<IGridLaneRef | undefined>(undefined);
  const argsRef = useRef(args);
  argsRef.current = args;

  // Which strips this drag carries, decided when it starts and fixed for its whole life: grabbing a
  // selected strip drags the whole selection, grabbing anything else drags that strip alone. Sorted,
  // so the block keeps the order it is drawn in whichever of its strips the drag started from.
  const movedRef = useRef<IGridLaneRef[]>([]);

  // Whether the drop would leave the program as it is: within one row that is a reorder that
  // reorders nothing, and across rows it never is.
  const isNoop = useCallback(
    (drop: IGridLaneDrop, moved: IGridLaneRef[]): boolean => {
      if (moved.some((lane) => lane.row !== drop.toRow)) {
        return false;
      }
      const lanes = getGeometry()[drop.toRow]?.laneNames.length ?? 0;
      return ProgramGridGeometry_isBlockDropNoop(
        lanes,
        moved.map((lane) => lane.lane),
        drop.gap
      );
    },
    [getGeometry]
  );

  const drag = useGridDragSession<IGridLaneDrop>({
    axis: "y",
    autoScroll,
    resolve: (translationY) => {
      const origin = originRef.current;
      if (origin == null) {
        return undefined;
      }
      // From the block's leading strip — its last one going down, its first going up — for the same
      // reason the day drag is: a block that measured from whichever strip the finger grabbed would
      // have to travel its own height before it displaced anything.
      const leading = movedRef.current.reduce(
        (acc, lane) =>
          lane.row !== origin.row ? acc : translationY > 0 ? Math.max(acc, lane.lane) : Math.min(acc, lane.lane),
        origin.lane
      );
      return ProgramGridGeometry_laneDropAt(getGeometry(), origin.row, leading, translationY, getLaneHeight());
    },
    show: (drop, translationY) => {
      const moved = movedRef.current;
      draggedLanes.value = drop == null ? [] : moved;
      const noop = drop == null || isNoop(drop, moved);
      dropLaneRow.value = noop ? -1 : drop!.toRow;
      dropLaneGap.value = noop ? -1 : drop!.gap;
      if (drop != null) {
        // Drawn from the translation rather than carried on the drop: where the strips *land* snaps
        // to a lane, where they are *drawn* follows the finger, and a target that carries both is a
        // target doing two jobs.
        ghostY.value = translationY;
      }
    },
    commit: (drop) => {
      const grid = getGrid();
      const moved = movedRef.current;
      // Both the strips being moved and the one they land above are identities, so both come from
      // the model's lanes rather than from the geometry rows the drag was drawn against.
      const targetNames = ProgramGrid_laneNames(grid, drop.toRow);
      if (moved.length === 0 || isNoop(drop, moved)) {
        return;
      }
      if (moved.every((lane) => lane.row === drop.toRow)) {
        const order = ProgramGridGeometry_moveBlock(
          targetNames,
          moved.map((lane) => lane.lane),
          drop.gap
        );
        argsRef.current.onReorderExercisesInDay(
          drop.toRow,
          order.filter((name) => name !== "")
        );
        return;
      }
      const moves = moved.reduce<IPlannerStructureExerciseMove[]>((acc, lane) => {
        const fullName = ProgramGrid_laneNames(grid, lane.row)[lane.lane];
        return fullName == null || fullName === "" ? acc : [...acc, { fromRowIndex: lane.row, fullName }];
      }, []);
      if (moves.length === 0) {
        return;
      }
      // Anchored by the name it was dropped above rather than by index: the target day can hold a
      // different number of exercises in each week. A strip that is itself on the move can't anchor
      // anything, so the anchor is the first one below the gap that is staying put.
      const before = targetNames.find(
        (name, laneIndex) =>
          laneIndex >= drop.gap &&
          name !== "" &&
          !moved.some((lane) => lane.row === drop.toRow && lane.lane === laneIndex)
      );
      argsRef.current.onMoveExercisesToDay(moves, drop.toRow, before);
    },
    onActive: (active) => {
      if (active) {
        const origin = originRef.current;
        const selected = getSelectedLanes();
        const isSelected = origin != null && selected.some((l) => l.row === origin.row && l.lane === origin.lane);
        movedRef.current = isSelected
          ? selected.slice().sort((a, b) => (a.row === b.row ? a.lane - b.lane : a.row - b.row))
          : origin == null
            ? []
            : [origin];
      }
      const moved = movedRef.current;
      argsRef.current.setActiveGhost(active && moved.length > 0 ? { kind: "lane", lanes: moved } : undefined);
    },
  });

  const onLaneDragStart = useCallback(
    (rowIndex: number, laneIndex: number, absolute: number) => {
      originRef.current = { row: rowIndex, lane: laneIndex };
      drag.onDragStart(absolute);
    },
    [drag]
  );

  const onLaneDragMove = useCallback(
    (_rowIndex: number, _laneIndex: number, translation: number, absolute: number) => {
      drag.onDragMove(translation, absolute);
    },
    [drag]
  );

  const onLaneDragEnd = useCallback(
    (commit: boolean) => {
      drag.onDragEnd(commit);
      originRef.current = undefined;
    },
    [drag]
  );

  // Memoized because useGridDrags spreads this into the bus every row reads: a fresh object here
  // makes `drags` fresh, which re-renders every GridRow — including while a pan is live, which is
  // the one thing that reliably kills a drag.
  return useMemo(
    () => ({ onLaneDragStart, onLaneDragMove, onLaneDragEnd, draggedLanes, dropLaneRow, dropLaneGap }),
    [onLaneDragStart, onLaneDragMove, onLaneDragEnd, draggedLanes, dropLaneRow, dropLaneGap]
  );
}
