import { useRef } from "react";
import {
  ProgramGridGeometry_dayBlockDropAt,
  ProgramGridGeometry_insertAtForGap,
  ProgramGridGeometry_isBlockDropNoop,
} from "../../../pages/planner/models/programGridGeometry";
import { IGridDrags } from "./useGridDrags";
import { IGridDragSession, useGridDragSession } from "./useGridDragSession";

// Dragging a whole day row. Unlike the exercise drag this one only ever lands among the rows it can
// already see, so it is instantiated per row — but it is still a hook, so that "drag controllers
// live in hooks, components render them" holds for all three without exceptions.
export function useGridDayDrag(args: {
  rowIndex: number;
  drags: IGridDrags;
  onMoveDayRows: (rows: number[], insertAt: number) => void;
}): IGridDragSession {
  const { rowIndex, drags } = args;
  const { getGeometry, getSelectedDayRows, draggedRows, dropBoundary, ghostY, setActiveGhost } = drags;
  const onMoveRef = useRef(args.onMoveDayRows);
  onMoveRef.current = args.onMoveDayRows;

  // Which rows this drag carries, decided when it starts and fixed for its whole life: grabbing a
  // row that is part of the selection takes the whole selection, grabbing anything else takes just
  // that row — so a drag never moves something the finger is nowhere near, and never changes its
  // mind about what it is moving halfway through.
  const movedRef = useRef<number[]>([]);

  return useGridDragSession<number>({
    axis: "y",
    autoScroll: drags.autoScroll,
    resolve: (translationY) => ProgramGridGeometry_dayBlockDropAt(getGeometry(), movedRef.current, translationY),
    show: (gap, translationY) => {
      draggedRows.value = gap == null ? [] : movedRef.current;
      dropBoundary.value =
        gap == null || ProgramGridGeometry_isBlockDropNoop(getGeometry().length, movedRef.current, gap) ? -1 : gap;
      // Zero when there is no target — see useGridWeekDrag: a ghost left translated still takes up
      // room in the scroller after the drag that moved it is over.
      ghostY.value = gap == null ? 0 : translationY;
    },
    commit: (gap) => {
      const moved = movedRef.current;
      if (!ProgramGridGeometry_isBlockDropNoop(getGeometry().length, moved, gap)) {
        onMoveRef.current(moved, ProgramGridGeometry_insertAtForGap(moved, gap));
      }
    },
    onActive: (active) => {
      if (active) {
        const selected = getSelectedDayRows();
        movedRef.current = selected.indexOf(rowIndex) !== -1 ? selected.slice().sort((a, b) => a - b) : [rowIndex];
      }
      setActiveGhost(active ? { kind: "day", rows: movedRef.current } : undefined);
    },
  });
}
