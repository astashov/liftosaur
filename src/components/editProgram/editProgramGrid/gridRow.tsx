import { JSX, memo, useCallback, useRef } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, SharedValue } from "react-native-reanimated";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { useRem } from "../../../utils/useRem";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { IconArrowDown2 } from "../../icons/iconArrowDown2";
import { IconArrowRight } from "../../icons/iconArrowRight";
import {
  IProgramGrid,
  IProgramGridDensity,
  IProgramGridPlacement,
  IProgramGridSelection,
  ProgramGrid_errorAt,
  ProgramGrid_hasDay,
} from "../../../pages/planner/models/programGrid";
import {
  GRID_ADD_ROW_HEIGHT,
  GRID_CELL_INSET_X,
  GRID_DAY_BOX_INSET,
  GRID_DAY_LABEL_HEIGHT,
  GRID_MARGIN_BETWEEN_ROWS,
  IGridGeometryRow,
  ProgramGridGeometry_dayDropAt,
  ProgramGridGeometry_gapForMove,
} from "../../../pages/planner/models/programGridGeometry";
import { GridDragHandle } from "./gridDragHandle";
import { IGridDragAutoScroll } from "./gridDragAutoScroll";
import { useGridDragSession } from "./useGridDragSession";
import { LaneRow } from "./gridLaneRow";
import { AddButton } from "./gridAddButton";

export interface IGridRowProps {
  grid: IProgramGrid;
  rowIndex: number;
  columnWidth: number;
  laneHeight: number;
  density: IProgramGridDensity;
  selection?: IProgramGridSelection;
  onSelect: (placementId: string) => void;
  onAddExercise: (weekIndex: number, rowIndex: number) => void;
  onSetRepeatRange: (placement: IProgramGridPlacement, toWeekIndex: number) => void;
  onSelectDay: (rowIndex: number) => void;
  onToggleCollapsed: (rowIndex: number) => void;
  isCollapsed: boolean;
  isDaySelected: boolean;
  isDayDimmed: boolean;
  // A ref rather than a value: reading the other rows' geometry during a drag must not make this
  // component depend on it, or every row would re-render whenever any of them changed.
  geometryRef: { current: IGridGeometryRow[] };
  lanes: number;
  rowHeight: number;
  onMoveDayRow: (from: number, to: number) => void;
  onLaneDragStart: (rowIndex: number, laneIndex: number, absolute: number) => void;
  onLaneDragMove: (rowIndex: number, laneIndex: number, translation: number, absolute: number) => void;
  onLaneDragEnd: (commit: boolean) => void;
  draggedRow: SharedValue<number>;
  dropBoundary: SharedValue<number>;
  draggedLaneRow: SharedValue<number>;
  draggedLane: SharedValue<number>;
  dropLaneRow: SharedValue<number>;
  dropLaneGap: SharedValue<number>;
  ghostY: SharedValue<number>;
  autoScroll: IGridDragAutoScroll;
}

export const GridRow = memo(function GridRow(props: IGridRowProps): JSX.Element {
  const rem = useRem();
  const { grid, rowIndex, lanes, rowHeight } = props;
  const row = grid.rows[rowIndex];
  const labelHeight = GRID_DAY_LABEL_HEIGHT * rem;
  const addHeight = GRID_ADD_ROW_HEIGHT * rem;
  const isCollapsed = props.isCollapsed;

  const { geometryRef, onMoveDayRow, draggedRow, dropBoundary } = props;
  const onSelectDay = props.onSelectDay;
  const onTapDay = useCallback(() => onSelectDay(rowIndex), [onSelectDay, rowIndex]);

  const ghostY = props.ghostY;
  // Everything that keeps a drag alive — refs over state, shared values for feedback, an idempotent
  // end, the edge-scroll wiring — lives in useGridDragSession. This supplies only the two things
  // that are specific to dragging a day: where it would land, and what to do about it.
  // The ghost follows the finger, not the drop target, so it needs the raw translation that
  // `resolve` was handed.
  const dayDragTranslationRef = useRef(0);
  const dayDrag = useGridDragSession<number>({
    axis: "y",
    autoScroll: props.autoScroll,
    resolve: (translationY) => {
      dayDragTranslationRef.current = translationY;
      return ProgramGridGeometry_dayDropAt(geometryRef.current, rowIndex, translationY);
    },
    show: (to) => {
      draggedRow.value = to == null ? -1 : rowIndex;
      dropBoundary.value = to == null ? -1 : ProgramGridGeometry_gapForMove(rowIndex, to);
      if (to != null) {
        ghostY.value = (geometryRef.current[rowIndex]?.top ?? 0) + dayDragTranslationRef.current;
      }
    },
    commit: (to) => {
      if (to !== rowIndex) {
        onMoveDayRow(rowIndex, to);
      }
    },
  });

  // -1 means no drag, so an idle grid keeps whatever the selection styling asked for.
  const rowOverlayStyle = useAnimatedStyle(() => {
    const dragging = draggedRow.value;
    if (dragging < 0) {
      return { opacity: 0 };
    }
    return { opacity: dragging === rowIndex ? 0.18 : 0 };
  });
  // Each row owns the gap above it; the last row owns the one below it too, so a drop at the very
  // end has somewhere to draw.
  const dropLineStyle = useAnimatedStyle(() => {
    return { opacity: dropBoundary.value === rowIndex ? 1 : 0 };
  });
  const isLastRow = rowIndex === grid.rows.length - 1;
  const dropLineBottomStyle = useAnimatedStyle(() => {
    return { opacity: isLastRow && dropBoundary.value === rowIndex + 1 ? 1 : 0 };
  });

  // An exercise can be dropped into any day, so both the strip being dragged and the line showing
  // where it will land are drawn here, over the row, from shared values the grid writes. The lanes
  // themselves stay out of it: giving them drag props would re-render the one under the finger.
  const { draggedLaneRow, draggedLane, dropLaneRow, dropLaneGap, laneHeight } = props;
  const draggedLaneStyle = useAnimatedStyle(() => {
    if (draggedLaneRow.value !== rowIndex) {
      return { opacity: 0, top: 0, height: 0 };
    }
    return { opacity: 0.25, top: labelHeight + draggedLane.value * laneHeight, height: laneHeight };
  });
  const dropLaneStyle = useAnimatedStyle(() => {
    if (dropLaneRow.value !== rowIndex) {
      return { opacity: 0, top: 0 };
    }
    // A collapsed row hides its lanes, so the line sits right under the day name — the whole row is
    // the target.
    return {
      opacity: 1,
      top: isCollapsed ? labelHeight : labelHeight + dropLaneGap.value * laneHeight - 1.5,
    };
  });

  return (
    // Selecting a day tames the other rows rather than hiding them, so the program's shape stays
    // readable while it is clear which row an action is about to restructure.
    <View
      style={{
        height: rowHeight,
        opacity: props.isDayDimmed ? 0.35 : 1,
        marginBottom: GRID_MARGIN_BETWEEN_ROWS * rem,
      }}
    >
      {/* The day boxes sit behind the strips, which are translucent enough to keep the box edges
          readable where a strip spans several weeks. Drawing them in front instead would put a
          line through the exercise names. */}
      <View className="absolute inset-0 flex-row">
        {grid.columns.map((column) => {
          const error = ProgramGrid_errorAt(grid, rowIndex, column.weekIndex);
          const exists = ProgramGrid_hasDay(row, column.weekIndex);
          return (
            <View key={column.weekIndex} style={{ width: props.columnWidth, padding: GRID_DAY_BOX_INSET * rem }}>
              {exists && (
                // The day box itself is what a day selection highlights — the exercises inside are
                // not what is selected, so they keep their own borders.
                <View
                  className={`flex-1 rounded ${error != null ? "bg-background-lighterror" : "bg-background-cardyellow"}`}
                  style={{
                    borderWidth: props.isDaySelected ? 2 : 1,
                    borderColor: props.isDaySelected
                      ? Tailwind_semantic().icon.purple
                      : Tailwind_semantic().border.prominent,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
      <View className="flex-row" style={{ height: labelHeight }}>
        {grid.columns.map((column) => {
          const name = row.namePerWeek[column.weekIndex];
          const error = ProgramGrid_errorAt(grid, rowIndex, column.weekIndex);
          const exists = ProgramGrid_hasDay(row, column.weekIndex);
          return (
            <View
              key={column.weekIndex}
              className="flex-row items-center px-[0.375rem]"
              style={{ width: props.columnWidth }}
            >
              {exists && (
                <>
                  {/* Collapsing is a property of the row, not of one week's day — the columns have
                      to keep the same height to stay a grid — so every week's chevron toggles the
                      whole row, and whichever one you have scrolled to is the one you can reach. */}
                  <Pressable
                    className="py-1 pr-1 nm-grid-toggle-day"
                    testID={`grid-toggle-day-${rowIndex}`}
                    accessibilityLabel={isCollapsed ? "Expand day" : "Collapse day"}
                    onPress={() => props.onToggleCollapsed(rowIndex)}
                  >
                    {isCollapsed ? (
                      <IconArrowRight width={8} height={11} color={Tailwind_semantic().icon.neutral} />
                    ) : (
                      <IconArrowDown2 width={11} height={8} color={Tailwind_semantic().icon.neutral} />
                    )}
                  </Pressable>
                  {/* Tap selects the day, long press starts the drag — both on the name, since one
                      gesture detector arbitrates them (Exclusive: the pan gets first refusal, and a
                      quick release falls through to the tap). A nested Pressable would instead
                      claim the touch before the long press could promote it. */}
                  <View className="flex-1">
                    <GridDragHandle
                      onTap={onTapDay}
                      onDragStart={dayDrag.onDragStart}
                      onDragMove={dayDrag.onDragMove}
                      onDragEnd={dayDrag.onDragEnd}
                    >
                      <View
                        className="py-1 nm-grid-select-day"
                        testID={`grid-select-day-${column.weekIndex}-${rowIndex}`}
                      >
                        <Text
                          className={`text-sm font-semibold ${error != null ? "text-text-error" : "text-text-primary"}`}
                          numberOfLines={1}
                        >
                          {error != null ? "⚠ " : ""}
                          {name ?? ""}
                        </Text>
                      </View>
                    </GridDragHandle>
                  </View>
                </>
              )}
            </View>
          );
        })}
      </View>
      {!isCollapsed &&
        Array.from({ length: lanes }, (_, laneIndex) => (
          <LaneRow
            key={laneIndex}
            grid={grid}
            rowIndex={rowIndex}
            laneIndex={laneIndex}
            columnWidth={props.columnWidth}
            laneHeight={props.laneHeight}
            density={props.density}
            selection={props.selection}
            onSelect={props.onSelect}
            onSetRepeatRange={props.onSetRepeatRange}
            laneCount={lanes}
            onLaneDragStart={props.onLaneDragStart}
            onLaneDragMove={props.onLaneDragMove}
            onLaneDragEnd={props.onLaneDragEnd}
          />
        ))}
      {/* One per week rather than one per row: adding an exercise targets a specific week's day,
          and a ragged week that lacks this day gets no button at all. */}
      {!isCollapsed && (
        <View className="flex-row" style={{ height: addHeight }}>
          {grid.columns.map((column) => (
            <View
              key={column.weekIndex}
              style={{ width: props.columnWidth, paddingHorizontal: GRID_CELL_INSET_X * rem }}
              className="justify-center"
            >
              {ProgramGrid_hasDay(row, column.weekIndex) && (
                <AddButton
                  label="Exercise"
                  testID={`grid-add-exercise-${column.weekIndex}-${rowIndex}`}
                  onPress={() => props.onAddExercise(column.weekIndex, rowIndex)}
                />
              )}
            </View>
          ))}
        </View>
      )}
      {/* Both are absolutely positioned so the web stub — which renders Animated.View as a fragment
          — drops them without disturbing the layout. Last in the row so they paint on top. */}
      <Animated.View
        pointerEvents="none"
        style={[
          rowOverlayStyle,
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: Tailwind_semantic().icon.purple,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          dropLineStyle,
          {
            position: "absolute",
            top: -2,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: 2,
            backgroundColor: Tailwind_semantic().icon.purple,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          dropLineBottomStyle,
          {
            position: "absolute",
            bottom: -2,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: 2,
            backgroundColor: Tailwind_semantic().icon.purple,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          draggedLaneStyle,
          {
            position: "absolute",
            left: 0,
            right: 0,
            backgroundColor: Tailwind_semantic().icon.purple,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          dropLaneStyle,
          {
            position: "absolute",
            left: GRID_CELL_INSET_X * rem,
            right: GRID_CELL_INSET_X * rem,
            height: 3,
            borderRadius: 2,
            backgroundColor: Tailwind_semantic().icon.purple,
          },
        ]}
      />
    </View>
  );
});
