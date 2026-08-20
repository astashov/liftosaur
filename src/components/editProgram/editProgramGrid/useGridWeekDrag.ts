import { useRef } from "react";
import {
  ProgramGridGeometry_gapForMove,
  ProgramGridGeometry_weekDropAt,
} from "../../../pages/planner/models/programGridGeometry";
import { IGridDrags } from "./useGridDrags";
import { IGridDragSession, useGridDragSession } from "./useGridDragSession";

// Where a week drag would land, and where to draw the lifted column while it does. The preview
// coordinate rides along with the target because `show` only receives what `resolve` returned —
// see the note on useGridDragSession about preview vs commit payloads.
interface IWeekDropTarget {
  to: number;
  x: number;
}

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

  return useGridDragSession<IWeekDropTarget>({
    axis: "x",
    autoScroll: drags.autoScroll,
    resolve: (translationX) => ({
      to: ProgramGridGeometry_weekDropAt(weekCount, weekIndex, translationX, columnWidth),
      x: weekIndex * columnWidth + translationX,
    }),
    show: (target) => {
      draggedWeek.value = target == null ? -1 : weekIndex;
      dropWeekGap.value = target == null ? -1 : ProgramGridGeometry_gapForMove(weekIndex, target.to);
      if (target != null) {
        ghostX.value = target.x;
      }
    },
    commit: (target) => {
      if (target.to !== weekIndex) {
        onMoveRef.current(weekIndex, target.to);
      }
    },
  });
}
