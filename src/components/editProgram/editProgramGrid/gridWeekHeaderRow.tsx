import { JSX, memo, useCallback } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, SharedValue } from "react-native-reanimated";
import { Text } from "../../primitives/text";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { IProgramGrid, IProgramGridColumn, ProgramGrid_weekDayCount } from "../../../pages/planner/models/programGrid";
import {
  ProgramGridGeometry_gapForMove,
  ProgramGridGeometry_weekDropAt,
} from "../../../pages/planner/models/programGridGeometry";
import { GridDragHandle } from "./gridDragHandle";
import { IGridDragAutoScroll } from "./gridDragAutoScroll";
import { useGridDragSession } from "./useGridDragSession";

export interface IWeekHeaderRowProps {
  grid: IProgramGrid;
  columnWidth: number;
  selectedWeek?: number;
  onSelectWeek: (weekIndex: number) => void;
  onMoveWeek: (from: number, to: number) => void;
  draggedWeek: SharedValue<number>;
  dropWeekGap: SharedValue<number>;
  ghostX: SharedValue<number>;
  autoScroll: IGridDragAutoScroll;
}

export const WeekHeaderRow = memo(function WeekHeaderRow(props: IWeekHeaderRowProps): JSX.Element {
  const { grid, columnWidth } = props;
  return (
    <View className="flex-row border-b border-border-neutral">
      {grid.columns.map((column) => (
        <WeekHeaderCell
          key={column.weekIndex}
          column={column}
          numberOfDays={ProgramGrid_weekDayCount(grid, column.weekIndex)}
          weekCount={grid.columns.length}
          columnWidth={columnWidth}
          isSelected={props.selectedWeek === column.weekIndex}
          isDimmed={props.selectedWeek != null && props.selectedWeek !== column.weekIndex}
          isLast={column.weekIndex === grid.columns.length - 1}
          onSelectWeek={props.onSelectWeek}
          onMoveWeek={props.onMoveWeek}
          draggedWeek={props.draggedWeek}
          dropWeekGap={props.dropWeekGap}
          ghostX={props.ghostX}
          autoScroll={props.autoScroll}
        />
      ))}
    </View>
  );
});

interface IWeekHeaderCellProps {
  column: IProgramGridColumn;
  numberOfDays: number;
  weekCount: number;
  columnWidth: number;
  isSelected: boolean;
  isDimmed: boolean;
  isLast: boolean;
  onSelectWeek: (weekIndex: number) => void;
  onMoveWeek: (from: number, to: number) => void;
  draggedWeek: SharedValue<number>;
  dropWeekGap: SharedValue<number>;
  ghostX: SharedValue<number>;
  autoScroll: IGridDragAutoScroll;
}

// Where a week drag would land: which column, and where to draw the lifted one.
interface IWeekDropTarget {
  to: number;
  x: number;
}

const WeekHeaderCell = memo(function WeekHeaderCell(props: IWeekHeaderCellProps): JSX.Element {
  const { column, onSelectWeek, onMoveWeek, draggedWeek, dropWeekGap, ghostX, columnWidth, weekCount } = props;
  const weekIndex = column.weekIndex;
  const onTap = useCallback(() => onSelectWeek(weekIndex), [onSelectWeek, weekIndex]);

  const drag = useGridDragSession<IWeekDropTarget>({
    axis: "x",
    autoScroll: props.autoScroll,
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
        onMoveWeek(weekIndex, target.to);
      }
    },
  });

  const liftStyle = useAnimatedStyle(() => ({ opacity: draggedWeek.value === weekIndex ? 0.25 : 0 }));
  // Each column owns the gap on its left; the last one owns the gap past its right edge too.
  const dropLeftStyle = useAnimatedStyle(() => ({ opacity: dropWeekGap.value === weekIndex ? 1 : 0 }));
  const dropRightStyle = useAnimatedStyle(() => ({
    opacity: props.isLast && dropWeekGap.value === weekIndex + 1 ? 1 : 0,
  }));
  const line = {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
    backgroundColor: Tailwind_semantic().icon.purple,
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
          <Text className="text-xs text-text-secondary" numberOfLines={1}>
            {props.numberOfDays} days
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
