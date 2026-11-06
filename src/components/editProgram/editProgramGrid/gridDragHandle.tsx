import { JSX, ReactNode, memo, useCallback } from "react";
import { DragHandle } from "../../dragHandle";
import { IDragPoint } from "../../../models/dragPress";

export interface IGridDragHandleProps {
  children: ReactNode;
  onDragStart: (absolute: number) => void;
  onDragMove: (translation: number, absolute: number) => void;
  onDragEnd: (commit: boolean) => void;
  onTap?: () => void;
  axis?: "y" | "x";
}

export const GridDragHandle = memo(function GridDragHandle(props: IGridDragHandleProps): JSX.Element {
  const { onDragStart, onDragMove, axis } = props;
  const onStart = useCallback((at: IDragPoint) => onDragStart(axis === "x" ? at.x : at.y), [onDragStart, axis]);
  const onMove = useCallback(
    (translation: IDragPoint, at: IDragPoint) =>
      axis === "x" ? onDragMove(translation.x, at.x) : onDragMove(translation.y, at.y),
    [onDragMove, axis]
  );
  return (
    <DragHandle onDragStart={onStart} onDragMove={onMove} onDragEnd={props.onDragEnd} onTap={props.onTap}>
      {props.children}
    </DragHandle>
  );
});
