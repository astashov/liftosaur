import { useRef } from "react";
import {
  ProgramGridGeometry_gapForMove,
  ProgramGridGeometry_weekDropAt,
} from "../../../pages/planner/models/programGridGeometry";
import { IGridDrags } from "./useGridDrags";
import { IGridDragSession, useGridDragSession } from "./useGridDragSession";

// Dragging a week column — the one drag on the horizontal axis.
export function useGridWeekDrag(args: {
  weekIndex: number;
  weekCount: number;
  columnWidth: number;
  drags: IGridDrags;
  onMoveWeek: (from: number, to: number) => void;
}): IGridDragSession {
  const { weekIndex, weekCount, columnWidth, drags } = args;
  const { draggedWeek, dropWeekGap, ghostX } = drags;
  const onMoveRef = useRef(args.onMoveWeek);
  onMoveRef.current = args.onMoveWeek;

  return useGridDragSession<number>({
    axis: "x",
    autoScroll: drags.autoScroll,
    resolve: (translationX) => ProgramGridGeometry_weekDropAt(weekCount, weekIndex, translationX, columnWidth),
    show: (to, translationX) => {
      draggedWeek.value = to == null ? -1 : weekIndex;
      dropWeekGap.value = to == null ? -1 : ProgramGridGeometry_gapForMove(weekIndex, to);
      if (to != null) {
        // The column snaps to `to`; the copy under the finger does not.
        ghostX.value = weekIndex * columnWidth + translationX;
      }
    },
    commit: (to) => {
      if (to !== weekIndex) {
        onMoveRef.current(weekIndex, to);
      }
    },
  });
}
