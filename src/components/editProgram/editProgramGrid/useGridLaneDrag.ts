import { RefObject, useCallback, useRef } from "react";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import {
  IGridGeometryRow,
  IGridLaneDrop,
  ProgramGridGeometry_indexForGap,
  ProgramGridGeometry_isLaneDropNoop,
  ProgramGridGeometry_laneDropAt,
} from "../../../pages/planner/models/programGridGeometry";
import { IProgramGrid, ProgramGrid_laneNames } from "../../../pages/planner/models/programGrid";
import { IGridDragAutoScroll } from "./gridDragAutoScroll";
import { useGridDragSession } from "./useGridDragSession";

export interface IGridLaneDrag {
  onLaneDragStart: (rowIndex: number, laneIndex: number, absolute: number) => void;
  onLaneDragMove: (rowIndex: number, laneIndex: number, translation: number, absolute: number) => void;
  onLaneDragEnd: (commit: boolean) => void;
  draggedLaneRow: SharedValue<number>;
  draggedLane: SharedValue<number>;
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
  gridRef: RefObject<IProgramGrid>;
  geometryRef: RefObject<IGridGeometryRow[]>;
  laneHeightRef: RefObject<number>;
  ghostY: SharedValue<number>;
  autoScroll: IGridDragAutoScroll;
  onReorderExercisesInDay: (rowIndex: number, order: string[]) => void;
  onMoveExerciseToDay: (fromRow: number, fullName: string, toRow: number, before: string | undefined) => void;
}): IGridLaneDrag {
  const { gridRef, geometryRef, laneHeightRef, ghostY, autoScroll } = args;
  const draggedLaneRow = useSharedValue(-1);
  const draggedLane = useSharedValue(-1);
  const dropLaneRow = useSharedValue(-1);
  // The gap, in the target row's lanes: gap N sits above lane N, and gap `lanes` below the last one.
  const dropLaneGap = useSharedValue(-1);
  // Which strip is being dragged. Set on start, read by resolve/commit, cleared on release.
  const originRef = useRef<{ row: number; lane: number } | undefined>(undefined);
  const argsRef = useRef(args);
  argsRef.current = args;

  const drag = useGridDragSession<IGridLaneDrop>({
    axis: "y",
    autoScroll,
    resolve: (translationY) => {
      const origin = originRef.current;
      return origin == null
        ? undefined
        : ProgramGridGeometry_laneDropAt(
            geometryRef.current,
            origin.row,
            origin.lane,
            translationY,
            laneHeightRef.current
          );
    },
    show: (drop) => {
      const origin = originRef.current;
      draggedLaneRow.value = drop == null || origin == null ? -1 : origin.row;
      draggedLane.value = drop == null || origin == null ? -1 : origin.lane;
      const isNoop =
        drop == null || origin == null || ProgramGridGeometry_isLaneDropNoop(drop, origin.row, origin.lane);
      dropLaneRow.value = isNoop ? -1 : drop!.toRow;
      dropLaneGap.value = isNoop ? -1 : drop!.gap;
      if (drop != null) {
        ghostY.value = drop.ghostY;
      }
    },
    commit: (drop) => {
      const origin = originRef.current;
      const grid = gridRef.current;
      // Both the thing being moved and the thing it lands above are identities, so both come from
      // the model's lanes rather than from the geometry rows the drag was drawn against.
      const sourceLanes = origin != null ? ProgramGrid_laneNames(grid, origin.row) : [];
      const fullName = origin != null ? sourceLanes[origin.lane] : undefined;
      if (origin == null || fullName == null || fullName === "") {
        return;
      }
      if (drop.toRow === origin.row) {
        const to = ProgramGridGeometry_indexForGap(origin.lane, drop.gap);
        if (to === origin.lane) {
          return;
        }
        const order = sourceLanes.slice();
        order.splice(to, 0, ...order.splice(origin.lane, 1));
        argsRef.current.onReorderExercisesInDay(
          origin.row,
          order.filter((n) => n !== "")
        );
        return;
      }
      // Anchored by the name it was dropped above rather than by index: the target day can hold a
      // different number of exercises in each week.
      const before = ProgramGrid_laneNames(grid, drop.toRow)[drop.gap];
      argsRef.current.onMoveExerciseToDay(origin.row, fullName, drop.toRow, before === "" ? undefined : before);
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

  return { onLaneDragStart, onLaneDragMove, onLaneDragEnd, draggedLaneRow, draggedLane, dropLaneRow, dropLaneGap };
}
