import { JSX, memo, useCallback } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Text } from "../../primitives/text";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { IProgramGrid, IProgramGridColumn } from "../../../pages/planner/models/programGrid";
import { GridDragHandle } from "./gridDragHandle";
import { IGridDrags } from "./useGridDrags";
import { useGridWeekDrag } from "./useGridWeekDrag";

export interface IWeekHeaderRowProps {
  grid: IProgramGrid;
  columnWidth: number;
  selectedWeek?: number;
  onSelectWeek: (weekIndex: number) => void;
  onMoveWeek: (from: number, to: number) => void;
  drags: IGridDrags;
}

export const WeekHeaderRow = memo(function WeekHeaderRow(props: IWeekHeaderRowProps): JSX.Element {
  const { grid, columnWidth } = props;
  return (
    <View className="flex-row border-b border-border-neutral">
      {grid.columns.map((column) => (
        <WeekHeaderCell
          key={column.weekIndex}
          column={column}
          weekCount={grid.columns.length}
          columnWidth={columnWidth}
          isSelected={props.selectedWeek === column.weekIndex}
          isDimmed={props.selectedWeek != null && props.selectedWeek !== column.weekIndex}
          isLast={column.weekIndex === grid.columns.length - 1}
          onSelectWeek={props.onSelectWeek}
          onMoveWeek={props.onMoveWeek}
          drags={props.drags}
        />
      ))}
    </View>
  );
});

interface IWeekHeaderCellProps {
  column: IProgramGridColumn;
  weekCount: number;
  columnWidth: number;
  isSelected: boolean;
  isDimmed: boolean;
  isLast: boolean;
  onSelectWeek: (weekIndex: number) => void;
  onMoveWeek: (from: number, to: number) => void;
  drags: IGridDrags;
}

const WeekHeaderCell = memo(function WeekHeaderCell(props: IWeekHeaderCellProps): JSX.Element {
  const { column, onSelectWeek, onMoveWeek, columnWidth, weekCount } = props;
  const { draggedWeek, dropWeekGap } = props.drags;
  const weekIndex = column.weekIndex;
  const onTap = useCallback(() => onSelectWeek(weekIndex), [onSelectWeek, weekIndex]);

  const drag = useGridWeekDrag({
    weekIndex,
    weekCount,
    columnWidth,
    drags: props.drags,
    onMoveWeek,
  });

  const liftStyle = useAnimatedStyle(() => ({ opacity: draggedWeek.value === weekIndex ? 0.25 : 0 }));
  // Each column owns the gap on its left; the last one owns the gap past its right edge too.
  const dropLeftStyle = useAnimatedStyle(() => ({ opacity: dropWeekGap.value === weekIndex ? 1 : 0 }));
  const dropRightStyle = useAnimatedStyle(() => ({
    opacity: props.isLast && dropWeekGap.value === weekIndex + 1 ? 1 : 0,
  }));
  // Orange, where everything else about a drag is purple: the line says where the drop *lands*, and
  // it has to be told apart at a glance from the purple that says what is selected and what is on
  // the move.
  const line = {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
    backgroundColor: Tailwind_semantic().graph.orange,
  };

  return (
    <View style={{ width: props.columnWidth, opacity: props.isDimmed ? 0.35 : 1 }}>
      <GridDragHandle
        axis="x"
        onTap={onTap}
        onDragStart={drag.onDragStart}
        onDragMove={drag.onDragMove}
        onDragEnd={drag.onDragEnd}
      >
        <View
          className="px-2 py-2 rounded nm-grid-select-week"
          testID={`grid-select-week-${weekIndex}`}
          style={{
            borderWidth: props.isSelected ? 2 : 0,
            borderColor: Tailwind_semantic().icon.purple,
          }}
        >
          <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>
            {column.name}
          </Text>
        </View>
      </GridDragHandle>
      <Animated.View
        pointerEvents="none"
        style={[
          liftStyle,
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
      <Animated.View pointerEvents="none" style={[dropLeftStyle, { ...line, left: -2 }]} />
      <Animated.View pointerEvents="none" style={[dropRightStyle, { ...line, right: -2 }]} />
    </View>
  );
});
