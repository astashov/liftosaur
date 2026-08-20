import { RefObject, useCallback, useMemo, useRef } from "react";
import { ScrollView, View, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import { IProgramGrid } from "../../../pages/planner/models/programGrid";
import { IGridGeometryRow } from "../../../pages/planner/models/programGridGeometry";
import { IGridDragAutoScroll, useGridDragAutoScroll } from "./gridDragAutoScroll";
import { IGridLaneDrag, useGridLaneDrag } from "./useGridLaneDrag";

// Everything the three drags share, in one place instead of scattered across the render tree.
//
// Drags can't talk through state — a render under the finger cancels the pan — so they talk through
// Reanimated shared values, and every row and column reads them to know whether it is the one being
// dragged. That makes the values a small bus rather than one component's state, and it used to live
// in EditProgramGrid simply because that was the common ancestor. Here it has a name.
//
// The refs are the other half: handlers are built once per drag and must not be rebuilt while a pan
// is live, so they read the current model and layout through refs rather than closing over them.
export interface IGridDrags {
  // Which row/column/lane is lifted, and where its drop would land. -1 means "no drag".
  draggedRow: SharedValue<number>;
  dropBoundary: SharedValue<number>;
  draggedWeek: SharedValue<number>;
  dropWeekGap: SharedValue<number>;
  draggedLaneRow: SharedValue<number>;
  draggedLane: SharedValue<number>;
  dropLaneRow: SharedValue<number>;
  dropLaneGap: SharedValue<number>;
  // Where the floating copy sits; one per axis, since only one drag can be live.
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  // Current layout and model, for handlers that outlive the render that made them.
  geometryRef: RefObject<IGridGeometryRow[]>;
  laneHeightRef: RefObject<number>;
  gridRef: RefObject<IProgramGrid>;
  autoScroll: IGridDragAutoScroll;
  // The exercise drag is owned here rather than by a row, because it can end in a different row.
  lane: IGridLaneDrag;
  // Attach these to the horizontal scroller so a week drag can scroll it at the edges.
  horizontalScrollRef: RefObject<ScrollView | null>;
  horizontalViewportRef: RefObject<View | null>;
  onHorizontalScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function useGridDrags(args: {
  grid: IProgramGrid;
  geometry: IGridGeometryRow[];
  laneHeight: number;
  // The grid's own horizontal extent, for clamping edge-scroll.
  contentWidth: number;
  containerWidth: number;
  onReorderExercisesInDay: (rowIndex: number, order: string[]) => void;
  onMoveExerciseToDay: (fromRow: number, fullName: string, toRow: number, before: string | undefined) => void;
}): IGridDrags {
  const draggedRow = useSharedValue(-1);
  const dropBoundary = useSharedValue(-1);
  const draggedWeek = useSharedValue(-1);
  const dropWeekGap = useSharedValue(-1);
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);

  const geometryRef = useRef<IGridGeometryRow[]>(args.geometry);
  geometryRef.current = args.geometry;
  const laneHeightRef = useRef(args.laneHeight);
  laneHeightRef.current = args.laneHeight;
  const gridRef = useRef(args.grid);
  gridRef.current = args.grid;

  const horizontalScrollRef = useRef<ScrollView | null>(null);
  const horizontalViewportRef = useRef<View | null>(null);
  const horizontalOffsetRef = useRef(0);
  const onHorizontalScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    horizontalOffsetRef.current = e.nativeEvent.contentOffset.x;
  }, []);
  const contentWidthRef = useRef(args.contentWidth);
  contentWidthRef.current = args.contentWidth;
  const containerWidthRef = useRef(args.containerWidth);
  containerWidthRef.current = args.containerWidth;
  const maxHorizontalScroll = useCallback(() => Math.max(0, contentWidthRef.current - containerWidthRef.current), []);

  const autoScroll = useGridDragAutoScroll({
    horizontalRef: horizontalScrollRef,
    horizontalViewportRef,
    horizontalOffsetRef,
    maxHorizontalScroll,
  });

  const lane = useGridLaneDrag({
    gridRef,
    geometryRef,
    laneHeightRef,
    ghostY,
    autoScroll,
    onReorderExercisesInDay: args.onReorderExercisesInDay,
    onMoveExerciseToDay: args.onMoveExerciseToDay,
  });

  return useMemo(
    () => ({
      draggedRow,
      dropBoundary,
      draggedWeek,
      dropWeekGap,
      draggedLaneRow: lane.draggedLaneRow,
      draggedLane: lane.draggedLane,
      dropLaneRow: lane.dropLaneRow,
      dropLaneGap: lane.dropLaneGap,
      ghostX,
      ghostY,
      geometryRef,
      laneHeightRef,
      gridRef,
      autoScroll,
      lane,
      horizontalScrollRef,
      horizontalViewportRef,
      onHorizontalScroll,
    }),
    [draggedRow, dropBoundary, draggedWeek, dropWeekGap, ghostX, ghostY, autoScroll, lane, onHorizontalScroll]
  );
}
