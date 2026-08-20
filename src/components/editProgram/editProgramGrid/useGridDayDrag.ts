import { useRef } from "react";
import {
  ProgramGridGeometry_dayDropAt,
  ProgramGridGeometry_gapForMove,
} from "../../../pages/planner/models/programGridGeometry";
import { IGridDrags } from "./useGridDrags";
import { IGridDragSession, useGridDragSession } from "./useGridDragSession";

// Dragging a whole day row. Unlike the exercise drag this one only ever lands among the rows it can
// already see, so it is instantiated per row — but it is still a hook, so that "drag controllers
// live in hooks, components render them" holds for all three without exceptions.
export function useGridDayDrag(args: {
  rowIndex: number;
  drags: IGridDrags;
  onMoveDayRow: (from: number, to: number) => void;
}): IGridDragSession {
  const { rowIndex, drags } = args;
  const { geometryRef, draggedRow, dropBoundary, ghostY } = drags;
  // The ghost follows the finger rather than the drop target, so it needs the raw translation that
  // `resolve` was handed — the session's target says where it would *land*, not where it is.
  const translationRef = useRef(0);
  const onMoveRef = useRef(args.onMoveDayRow);
  onMoveRef.current = args.onMoveDayRow;

  return useGridDragSession<number>({
    axis: "y",
    autoScroll: drags.autoScroll,
    resolve: (translationY) => {
      translationRef.current = translationY;
      return ProgramGridGeometry_dayDropAt(geometryRef.current, rowIndex, translationY);
    },
    show: (to) => {
      draggedRow.value = to == null ? -1 : rowIndex;
      dropBoundary.value = to == null ? -1 : ProgramGridGeometry_gapForMove(rowIndex, to);
      if (to != null) {
        ghostY.value = (geometryRef.current[rowIndex]?.top ?? 0) + translationRef.current;
      }
    },
    commit: (to) => {
      if (to !== rowIndex) {
        onMoveRef.current(rowIndex, to);
      }
    },
  });
}
