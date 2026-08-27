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
  const { draggedWeek, dropWeekGap, ghostX, setActiveGhost } = drags;
  const onMoveRef = useRef(args.onMoveWeek);
  onMoveRef.current = args.onMoveWeek;

  return useGridDragSession<number>({
    axis: "x",
    autoScroll: drags.autoScroll,
    resolve: (translationX) => ProgramGridGeometry_weekDropAt(weekCount, weekIndex, translationX, columnWidth),
    show: (to, translationX) => {
      draggedWeek.value = to == null ? -1 : weekIndex;
      dropWeekGap.value = to == null ? -1 : ProgramGridGeometry_gapForMove(weekIndex, to);
      // The column snaps to `to`; the copy under the finger does not. A translation only — the
      // ghost knows which column it is and where that column starts.
      //
      // Back to nothing when there is no target, which is how a drag ends. A ghost left translated
      // is invisible but still laid out where it was dropped, and the grid's scroller keeps room
      // for it — a sideways scroll into blank space that outlives the drag that made it.
      ghostX.value = to == null ? 0 : translationX;
    },
    commit: (to) => {
      if (to !== weekIndex) {
        onMoveRef.current(weekIndex, to);
      }
    },
    onActive: (active) => setActiveGhost(active ? { kind: "week", weeks: [weekIndex] } : undefined),
  });
}
