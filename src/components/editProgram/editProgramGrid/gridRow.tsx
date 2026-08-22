import { JSX, memo, useCallback } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { useRem } from "../../../utils/useRem";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { IconArrowDown2 } from "../../icons/iconArrowDown2";
import { IconArrowRight } from "../../icons/iconArrowRight";
import {
  IProgramGrid,
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
} from "../../../pages/planner/models/programGridGeometry";
import { GridDragHandle } from "./gridDragHandle";
import { IGridDrags } from "./useGridDrags";
import { useGridDayDrag } from "./useGridDayDrag";
import { LaneRow } from "./gridLaneRow";
import { AddButton } from "./gridAddButton";

export interface IGridRowProps {
  grid: IProgramGrid;
  rowIndex: number;
  columnWidth: number;
  laneHeight: number;
  showScheme: boolean;
  selection?: IProgramGridSelection;
  onSelect: (placementId: string) => void;
  onAddExercise: (weekIndex: number, rowIndex: number) => void;
  onSetRepeatRange: (placement: IProgramGridPlacement, toWeekIndex: number) => void;
  onSelectDay: (rowIndex: number) => void;
  onToggleCollapsed: (rowIndex: number) => void;
  isCollapsed: boolean;
  isDaySelected: boolean;
  isDayDimmed: boolean;
  lanes: number;
  rowHeight: number;
  onMoveDayRows: (rows: number[], insertAt: number) => void;
  // The shared drag bus; see useGridDrags.
  drags: IGridDrags;
}

export const GridRow = memo(function GridRow(props: IGridRowProps): JSX.Element {
  const rem = useRem();
  const { grid, rowIndex, lanes, rowHeight } = props;
  const row = grid.rows[rowIndex];
  const labelHeight = GRID_DAY_LABEL_HEIGHT * rem;
  const addHeight = GRID_ADD_ROW_HEIGHT * rem;
  const isCollapsed = props.isCollapsed;

  const { drags, onMoveDayRows } = props;
  const { draggedRows, dropBoundary, draggedLanes, dropLaneRow, dropLaneGap } = drags;
  const onSelectDay = props.onSelectDay;
  const onTapDay = useCallback(() => onSelectDay(rowIndex), [onSelectDay, rowIndex]);

  const dayDrag = useGridDayDrag({ rowIndex, drags, onMoveDayRows });

  // An empty set means no drag, so an idle grid keeps whatever the selection styling asked for.
  const rowOverlayStyle = useAnimatedStyle(() => {
    return { opacity: draggedRows.value.indexOf(rowIndex) !== -1 ? 0.18 : 0 };
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
  // Several strips of this row can be on the move at once, and they gather into one card from the
  // topmost of them — so what is dimmed here is that same span, not each strip where it sits.
  const laneHeight = props.laneHeight;
  const draggedLaneStyle = useAnimatedStyle(() => {
    const dragged = draggedLanes.value.filter((lane) => lane.row === rowIndex);
    if (dragged.length === 0) {
      return { opacity: 0, top: 0, height: 0 };
    }
    let first = dragged[0].lane;
    for (const lane of dragged) {
      first = Math.min(first, lane.lane);
    }
    return { opacity: 0.25, top: labelHeight + first * laneHeight, height: dragged.length * laneHeight };
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
                    // The chevron itself stays small — it is a hint, not a control — so the target
                    // is padding around it plus slop beyond that. The left padding is also what
                    // keeps it off the day box's border, which it otherwise sits right on top of.
                    className="p-2 nm-grid-toggle-day"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
            showScheme={props.showScheme}
            selection={props.selection}
            onSelect={props.onSelect}
            onSetRepeatRange={props.onSetRepeatRange}
            laneCount={lanes}
            onLaneDragStart={drags.lane.onLaneDragStart}
            onLaneDragMove={drags.lane.onLaneDragMove}
            onLaneDragEnd={drags.lane.onLaneDragEnd}
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
      {/* Orange, where everything else about a drag is purple: these say where the drop *lands*, and
          have to be told apart at a glance from the purple that says what is on the move. */}
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
            backgroundColor: Tailwind_semantic().graph.orange,
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
            backgroundColor: Tailwind_semantic().graph.orange,
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
            backgroundColor: Tailwind_semantic().graph.orange,
          },
        ]}
      />
    </View>
  );
});
