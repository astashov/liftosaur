import { useCallback, useMemo, useRef } from "react";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import { IProgramGrid } from "../../../pages/planner/models/programGrid";
import { IPlannerStructureExerciseMove } from "../../../pages/planner/models/plannerStructure";
import { IGridGeometryRow } from "../../../pages/planner/models/programGridGeometry";
import { IGridDragAutoScroll } from "./gridDragAutoScroll";
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

// One exercise strip, by the row and lane it sits in — the identity a drag moves, as opposed to the
// placement, which is one *run* of it across weeks.
export interface IGridLaneRef {
  row: number;
  lane: number;
}

// What the ghosts have to draw, if anything. Deliberately *not* on the bus itself: the bus is read
// by every row, so a value that changed when a drag started would re-render every row at exactly
// the moment the pan must not be disturbed. Only the stable setter lives here; the value lives in
// the grid, and reaches the ghosts alone.
//
// It carries the whole set rather than one index, because dragging a selection drags all of it.
export type IGridActiveGhost =
  | { kind: "day"; rows: number[] }
  | { kind: "lane"; lanes: IGridLaneRef[] }
  | { kind: "week"; weeks: number[] };

export interface IGridDrags {
  // Which rows/lanes/columns are lifted, and where their drop would land. Empty, or -1, means "no
  // drag" — the sets are what a multi-selection drag needs, since every one of its members has to
  // dim itself and none of them is the one true source.
  draggedRows: SharedValue<number[]>;
  dropBoundary: SharedValue<number>;
  draggedWeek: SharedValue<number>;
  dropWeekGap: SharedValue<number>;
  draggedLanes: SharedValue<IGridLaneRef[]>;
  dropLaneRow: SharedValue<number>;
  dropLaneGap: SharedValue<number>;
  // How far the drag has travelled; one per axis, since only one drag can be live. A translation
  // rather than a position, because several ghosts move on it at once and each one starts somewhere
  // different.
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  // Current layout, model and selection, for handlers that outlive the render that made them.
  //
  // Getters, not refs, and that is load-bearing: a gesture's worklet closure reaches everything on
  // this object, and Reanimated freezes any plain object it serializes — a captured ref stops
  // accepting writes *silently*, so every drag then computes against the layout as it was when the
  // first gesture was built. A function is passed by reference and never frozen.
  getGeometry: () => IGridGeometryRow[];
  getLaneHeight: () => number;
  getGrid: () => IProgramGrid;
  // Which rows a day drag should carry: the selection when the grabbed row is part of it, and the
  // grabbed row alone otherwise.
  getSelectedDayRows: () => number[];
  autoScroll: IGridDragAutoScroll;
  setActiveGhost: (ghost: IGridActiveGhost | undefined) => void;
  // The exercise drag is owned here rather than by a row, because it can end in a different row.
  lane: IGridLaneDrag;
}

export function useGridDrags(args: {
  grid: IProgramGrid;
  geometry: IGridGeometryRow[];
  laneHeight: number;
  // The current selection, as the two drags see it: which rows and which strips would come along.
  selectedDayRows: number[];
  selectedLanes: IGridLaneRef[];
  // Edge-scrolling drives the grid's own scroller, which the component renders — so the refs to it
  // come in rather than being owned here. They are render plumbing; a bus that handed them out
  // would be handing out mutable refs again, which is the thing this hook exists not to do.
  autoScroll: IGridDragAutoScroll;
  onGhostActive: (ghost: IGridActiveGhost | undefined) => void;
  onReorderExercisesInDay: (rowIndex: number, order: string[]) => void;
  onMoveExercisesToDay: (moves: IPlannerStructureExerciseMove[], toRow: number, before: string | undefined) => void;
}): IGridDrags {
  const draggedRows = useSharedValue<number[]>([]);
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
  const selectedDayRowsRef = useRef(args.selectedDayRows);
  selectedDayRowsRef.current = args.selectedDayRows;
  const selectedLanesRef = useRef(args.selectedLanes);
  selectedLanesRef.current = args.selectedLanes;

  const getGeometry = useCallback(() => geometryRef.current, []);
  const getLaneHeight = useCallback(() => laneHeightRef.current, []);
  const getGrid = useCallback(() => gridRef.current, []);
  const getSelectedDayRows = useCallback(() => selectedDayRowsRef.current, []);
  const getSelectedLanes = useCallback(() => selectedLanesRef.current, []);
  // Straight through, not via a ref: it is a useState setter, so it is already stable for the life
  // of the grid, and wrapping it only adds a thing that can be stale.
  const setActiveGhost = args.onGhostActive;

  const autoScroll = args.autoScroll;

  const lane = useGridLaneDrag({
    getGrid,
    getGeometry,
    getLaneHeight,
    getSelectedLanes,
    ghostY,
    autoScroll,
    setActiveGhost,
    onReorderExercisesInDay: args.onReorderExercisesInDay,
    onMoveExercisesToDay: args.onMoveExercisesToDay,
  });

  return useMemo(
    () => ({
      draggedRows,
      dropBoundary,
      draggedWeek,
      dropWeekGap,
      draggedLanes: lane.draggedLanes,
      dropLaneRow: lane.dropLaneRow,
      dropLaneGap: lane.dropLaneGap,
      ghostX,
      ghostY,
      getGeometry,
      getLaneHeight,
      getGrid,
      getSelectedDayRows,
      autoScroll,
      setActiveGhost,
      lane,
    }),
    [
      draggedRows,
      dropBoundary,
      draggedWeek,
      dropWeekGap,
      ghostX,
      ghostY,
      getGeometry,
      getLaneHeight,
      getGrid,
      getSelectedDayRows,
      autoScroll,
      setActiveGhost,
      lane,
    ]
  );
}
