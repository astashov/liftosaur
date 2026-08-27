import { JSX, memo, useCallback, useMemo, useRef, useState } from "react";
import { View, Platform } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useRem } from "../../../utils/useRem";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { IProgramGrid, IProgramGridPlacement, IProgramGridSelection } from "../../../pages/planner/models/programGrid";
import {
  GRID_CELL_INSET_Y,
  GRID_CELL_INSET_X,
  ProgramGridGeometry_canResize,
  ProgramGridGeometry_clampWeek,
  ProgramGridGeometry_laneSegments,
  ProgramGridGeometry_resizeHitLeft,
  ProgramGridGeometry_resizeHitWidth,
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
  showScheme: boolean;
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
  const { grid, rowIndex, laneIndex, onLaneDragStart, onLaneDragMove, columnWidth } = props;
  // Stable for the same reason the day handlers are: a rebuilt gesture drops the drag.
  const onDragStartLane = useCallback(
    (absolute: number) => onLaneDragStart(rowIndex, laneIndex, absolute),
    [onLaneDragStart, rowIndex, laneIndex]
  );
  const onDragMoveLane = useCallback(
    (dy: number, absolute: number) => onLaneDragMove(rowIndex, laneIndex, dy, absolute),
    [onLaneDragMove, rowIndex, laneIndex]
  );
  // The live preview rides shared values on native: the finger is on the resize handle, and a
  // re-render of the subtree under it cancels the pan. Web keeps a state-driven preview — Reanimated
  // is stubbed there and its handle uses the responder system, which has no pan to cancel.
  const resizePreviewEnd = useSharedValue(-1);
  const resizeHandleOffset = useSharedValue(0);
  const [webResize, setWebResize] = useState<{ id: string; colEnd: number } | undefined>(undefined);
  const segments = useMemo(
    () => ProgramGridGeometry_laneSegments(grid, rowIndex, laneIndex),
    [grid, rowIndex, laneIndex]
  );

  // Only the lane's last run can be dragged: extending a run that has another after it would have
  // to move that one's start too, which is a different (v2) operation. And only when it has a week
  // to be dragged to — undefined here takes the handle off the strip entirely.
  const resizablePlacement = useMemo(() => {
    const withPlacement = segments.filter((s) => s.placement != null);
    const placement = withPlacement[withPlacement.length - 1]?.placement;
    return placement != null && ProgramGridGeometry_canResize(grid, placement) ? placement : undefined;
  }, [segments, grid]);

  // The pending drag is mirrored in a ref so the commit can read it from an event handler, and so
  // the end/finalize pair is idempotent — the first one clears it.
  const resizeRef = useRef<{ id: string; colEnd: number } | undefined>(undefined);
  const onSetRepeatRange = props.onSetRepeatRange;

  const onResizeStart = useCallback(
    (deltaWeeks: number) => {
      if (resizablePlacement == null) {
        return;
      }
      // Clamping happens here rather than in the preview, so what is drawn is exactly what a
      // release would commit.
      const colEnd = ProgramGridGeometry_clampWeek(grid, resizablePlacement, deltaWeeks);
      resizeRef.current = { id: resizablePlacement.id, colEnd };
      resizePreviewEnd.value = colEnd;
      resizeHandleOffset.value = columnWidth * (colEnd - resizablePlacement.colEnd);
      if (Platform.OS === "web") {
        setWebResize({ id: resizablePlacement.id, colEnd });
      }
    },
    [grid, resizablePlacement, columnWidth, resizePreviewEnd, resizeHandleOffset]
  );

  const onResizeEnd = useCallback(
    (commit: boolean) => {
      const current = resizeRef.current;
      resizeRef.current = undefined;
      resizePreviewEnd.value = -1;
      resizeHandleOffset.value = 0;
      if (Platform.OS === "web") {
        setWebResize(undefined);
      }
      if (!commit || current == null) {
        return;
      }
      const placement = grid.placements.find((p) => p.id === current.id);
      if (placement != null && current.colEnd !== placement.colEnd) {
        onSetRepeatRange(placement, current.colEnd);
      }
    },
    [grid, onSetRepeatRange, resizePreviewEnd, resizeHandleOffset]
  );

  // Width rather than a transform, deliberately: this is one leaf node with no children, and the
  // rule it bends ("animate opacity and transform only") exists to stop per-frame layout commits
  // across the whole grid. Nothing under the finger re-renders either way.
  const previewColStart = resizablePlacement?.colStart ?? 0;
  const previewInset = 2 * GRID_CELL_INSET_X * rem;
  const previewStyle = useAnimatedStyle(() => {
    const end = resizePreviewEnd.value;
    return end < 0
      ? { opacity: 0, width: 0 }
      : { opacity: 1, width: columnWidth * (end - previewColStart + 1) - previewInset };
  });

  // Where the resize handle sits: centred on the right edge of the last run's card, following the
  // preview while a resize is in flight.
  const resizeLeft =
    resizablePlacement == null
      ? 0
      : ProgramGridGeometry_resizeHitLeft({
          colEnd: webResize?.id === resizablePlacement.id ? webResize.colEnd : resizablePlacement.colEnd,
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
                  (webResize?.id === segment.placement.id
                    ? webResize.colEnd - segment.placement.colStart + 1
                    : segment.span)
                }
                height={props.laneHeight}
                showScheme={props.showScheme}
                selection={props.selection}
                onSelect={props.onSelect}
                isResizing={webResize?.id === segment.placement.id}
              />
            ) : (
              <View key={i} style={{ width: props.columnWidth * segment.span, height: props.laneHeight }} />
            )
          )}
        </View>
      </GridDragHandle>
      {resizablePlacement != null && Platform.OS !== "web" && (
        <Animated.View
          pointerEvents="none"
          className="absolute rounded"
          style={[
            {
              left: props.columnWidth * resizablePlacement.colStart + GRID_CELL_INSET_X * rem,
              top: GRID_CELL_INSET_Y * rem,
              height: props.laneHeight - 2 * GRID_CELL_INSET_Y * rem,
              borderWidth: 2,
              borderColor: Tailwind_semantic().icon.purple,
            },
            previewStyle,
          ]}
        />
      )}
      {resizablePlacement != null && (
        <GridResizeHandle
          width={ProgramGridGeometry_resizeHitWidth(props.columnWidth, rem)}
          columnWidth={props.columnWidth}
          onResize={onResizeStart}
          onResizeEnd={onResizeEnd}
          left={resizeLeft}
          offsetX={resizeHandleOffset}
          top={GRID_CELL_INSET_Y * rem}
          height={props.laneHeight - 2 * GRID_CELL_INSET_Y * rem}
        />
      )}
    </View>
  );
});
