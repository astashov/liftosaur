import { JSX, memo, useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useRem } from "../../../utils/useRem";
import {
  IProgramGrid,
  IProgramGridDensity,
  IProgramGridPlacement,
  IProgramGridSelection,
} from "../../../pages/planner/models/programGrid";
import {
  GRID_CELL_INSET_Y,
  GRID_RESIZE_HANDLE_WIDTH,
  ProgramGridGeometry_clampWeek,
  ProgramGridGeometry_laneSegments,
  ProgramGridGeometry_resizeHandleLeft,
} from "../../../pages/planner/models/programGridGeometry";
import { GridDragHandle } from "./gridDragHandle";
import { GridResizeHandle } from "./gridResizeHandle";
import { GridCell } from "./gridCell";

export interface ILaneRowProps {
  grid: IProgramGrid;
  rowIndex: number;
  laneIndex: number;
  columnWidth: number;
  laneHeight: number;
  density: IProgramGridDensity;
  selection?: IProgramGridSelection;
  onSelect: (placementId: string) => void;
  onSetRepeatRange: (placement: IProgramGridPlacement, toWeekIndex: number) => void;
  laneCount: number;
  onLaneDragStart: (rowIndex: number, laneIndex: number, absolute: number) => void;
  onLaneDragMove: (rowIndex: number, laneIndex: number, translation: number, absolute: number) => void;
  onLaneDragEnd: (commit: boolean) => void;
}

export const LaneRow = memo(function LaneRow(props: ILaneRowProps): JSX.Element {
  const rem = useRem();
  const { grid, rowIndex, laneIndex, onLaneDragStart, onLaneDragMove } = props;
  // Stable for the same reason the day handlers are: a rebuilt gesture drops the drag.
  const onDragStartLane = useCallback(
    (absolute: number) => onLaneDragStart(rowIndex, laneIndex, absolute),
    [onLaneDragStart, rowIndex, laneIndex]
  );
  const onDragMoveLane = useCallback(
    (dy: number, absolute: number) => onLaneDragMove(rowIndex, laneIndex, dy, absolute),
    [onLaneDragMove, rowIndex, laneIndex]
  );
  // Held here rather than at the top so a drag only re-renders its own lane.
  const [resize, setResize] = useState<{ id: string; deltaWeeks: number } | undefined>(undefined);
  const segments = useMemo(
    () => ProgramGridGeometry_laneSegments(grid, rowIndex, laneIndex),
    [grid, rowIndex, laneIndex]
  );

  // Only the lane's last run can be dragged: extending a run that has another after it would have
  // to move that one's start too, which is a different (v2) operation.
  const lastPlacement = useMemo(() => {
    const withPlacement = segments.filter((s) => s.placement != null);
    return withPlacement[withPlacement.length - 1]?.placement;
  }, [segments]);

  // The pending drag is mirrored in a ref so the commit can read it from an event handler. Doing it
  // inside the setState updater instead would dispatch during render, which React rejects — and the
  // ref also makes the end/finalize pair idempotent, since the first one clears it.
  const resizeRef = useRef(resize);
  resizeRef.current = resize;
  const onResizeEnd = useCallback(() => {
    const current = resizeRef.current;
    resizeRef.current = undefined;
    if (current != null && current.deltaWeeks !== 0) {
      const placement = grid.placements.find((p) => p.id === current.id);
      if (placement != null) {
        props.onSetRepeatRange(placement, ProgramGridGeometry_clampWeek(grid, placement, current.deltaWeeks));
      }
    }
    setResize(undefined);
  }, [grid, props]);

  const onResizeStart = useCallback(
    (deltaWeeks: number) => {
      if (lastPlacement != null) {
        setResize({ id: lastPlacement.id, deltaWeeks });
      }
    },
    [lastPlacement]
  );

  // Where the resize handle sits: the right edge of the last run's card, following the preview
  // while a resize is in flight.
  const resizeLeft =
    lastPlacement == null
      ? 0
      : ProgramGridGeometry_resizeHandleLeft({
          colEnd:
            resize?.id === lastPlacement.id
              ? ProgramGridGeometry_clampWeek(grid, lastPlacement, resize.deltaWeeks)
              : lastPlacement.colEnd,
          columnWidth: props.columnWidth,
          rem,
        });

  return (
    // The resize handle is deliberately a sibling of the drag detector rather than a child of a
    // cell inside it. Nested, the two competed for the same touch: holding still on the handle for
    // the long press started an exercise drag instead of a resize. Outside it, which gesture you
    // get is decided by where the finger lands, which is the whole point of a handle.
    <View>
      <GridDragHandle onDragStart={onDragStartLane} onDragMove={onDragMoveLane} onDragEnd={props.onLaneDragEnd}>
        <View className="flex-row">
          {segments.map((segment, i) =>
            segment.placement != null ? (
              <GridCell
                key={i}
                placement={segment.placement}
                width={
                  props.columnWidth *
                  (resize?.id === segment.placement.id
                    ? ProgramGridGeometry_clampWeek(grid, segment.placement, resize.deltaWeeks) -
                      segment.placement.colStart +
                      1
                    : segment.span)
                }
                height={props.laneHeight}
                density={props.density}
                selection={props.selection}
                onSelect={props.onSelect}
                isResizing={resize?.id === segment.placement.id}
              />
            ) : (
              <View key={i} style={{ width: props.columnWidth * segment.span, height: props.laneHeight }} />
            )
          )}
        </View>
      </GridDragHandle>
      {lastPlacement != null && (
        <GridResizeHandle
          width={GRID_RESIZE_HANDLE_WIDTH * rem}
          columnWidth={props.columnWidth}
          onResize={onResizeStart}
          onResizeEnd={onResizeEnd}
          left={resizeLeft}
          top={GRID_CELL_INSET_Y * rem}
          height={props.laneHeight - 2 * GRID_CELL_INSET_Y * rem}
        />
      )}
    </View>
  );
});
