import { JSX, memo } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, SharedValue } from "react-native-reanimated";
import { Text } from "../../primitives/text";
import { useRem } from "../../../utils/useRem";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import {
  GRID_CELL_INSET_X,
  GRID_CELL_INSET_Y,
  GRID_DAY_BOX_INSET,
  IGridGeometryRow,
} from "../../../pages/planner/models/programGridGeometry";

// What is being dragged, floating over the grid: one per row for the day drag and one for the
// exercise drag, both mounted for the whole life of the grid. Building a ghost when the drag starts
// would mean a render while the pan is live, which is what cancels the pan.
//
// Only `opacity` and `transform` are ever animated. Animating `top`/`height`/`zIndex` instead —
// which is what the first version did — makes Fabric commit a new shadow tree and reorder subviews
// on every frame of the drag, right under the finger, and the pan dies exactly as it did before.
// So every ghost has a static size and sits at the top of the rows, and the drag moves it.
export interface IGridDragGhostProps {
  rowIndex: number;
  name: string;
  laneNames: string[];
  width: number;
  labelHeight: number;
  laneHeight: number;
  // Which row is being dragged as a day, and which as an exercise — the same values that dim the
  // source, so a ghost needs nothing of its own to know it is the one on the move.
  draggedRow: SharedValue<number>;
  draggedLaneRow: SharedValue<number>;
  draggedLane: SharedValue<number>;
  ghostY: SharedValue<number>;
}

export const GridDragGhost = memo(function GridDragGhost(props: IGridDragGhostProps): JSX.Element {
  const rem = useRem();
  const { rowIndex, draggedRow, draggedLaneRow, draggedLane, ghostY, laneHeight, labelHeight } = props;
  const dayStyle = useAnimatedStyle(() => ({
    opacity: draggedRow.value === rowIndex ? 0.9 : 0,
    transform: [{ translateY: ghostY.value }],
  }));
  const laneStyle = useAnimatedStyle(() => ({
    opacity: draggedLaneRow.value === rowIndex ? 0.9 : 0,
    transform: [{ translateY: ghostY.value }],
  }));
  // The band shows one lane of the same list, scrolled to it — cheaper than a ghost per exercise,
  // and it can't drift out of step with the day ghost.
  const laneContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, draggedLane.value) * laneHeight }],
  }));

  const laneStrips = props.laneNames.map((laneName, laneIndex) => (
    <View
      key={laneIndex}
      style={{
        height: laneHeight,
        paddingHorizontal: GRID_CELL_INSET_X * rem,
        paddingVertical: GRID_CELL_INSET_Y * rem,
      }}
    >
      <View
        className="justify-center flex-1 px-2 rounded"
        style={{
          borderWidth: 1,
          borderColor: Tailwind_semantic().text.purple,
          backgroundColor: Tailwind_semantic().background.cardpurpleselected,
        }}
      >
        <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
          {laneName}
        </Text>
      </View>
    </View>
  ));
  // The shadow lives on the outer view of each pair: clipping the lane band to one strip would clip
  // its shadow away with the rest.
  const lift = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: props.width,
    // Also as a style, not only as the prop: a ghost sits over the very day names whose long press
    // starts the drag, and it must never be what the finger lands on.
    pointerEvents: "none" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  };
  const card = {
    borderWidth: 2,
    borderColor: Tailwind_semantic().icon.purple,
    backgroundColor: Tailwind_semantic().background.cardyellow,
  };

  return (
    <>
      <Animated.View pointerEvents="none" style={[dayStyle, lift]}>
        <View className="overflow-hidden rounded" style={card}>
          <View className="justify-center px-[0.375rem]" style={{ height: labelHeight }}>
            <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
              {props.name}
            </Text>
          </View>
          {laneStrips}
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[laneStyle, lift]}>
        <View className="overflow-hidden rounded" style={[card, { height: laneHeight }]}>
          <Animated.View style={laneContentStyle}>{laneStrips}</Animated.View>
        </View>
      </Animated.View>
    </>
  );
});

// The same idea one axis over: a week is a column, so its ghost is a column — the days stacked at
// the tops the geometry already knows, each showing what that week prescribes. Mounted per week and
// animated on opacity and translateX only, for the reasons above.
export interface IGridWeekGhostProps {
  weekIndex: number;
  name: string;
  numberOfDays: number;
  columnWidth: number;
  height: number;
  rows: IGridGeometryRow[];
  dayNames: (string | undefined)[];
  // Per row, per lane, what this week holds there — blank where the run doesn't reach this column.
  laneNames: string[][];
  labelHeight: number;
  laneHeight: number;
  draggedWeek: SharedValue<number>;
  ghostX: SharedValue<number>;
}

export const GridWeekGhost = memo(function GridWeekGhost(props: IGridWeekGhostProps): JSX.Element {
  const rem = useRem();
  const { weekIndex, draggedWeek, ghostX, laneHeight, labelHeight } = props;
  const style = useAnimatedStyle(() => ({
    opacity: draggedWeek.value === weekIndex ? 0.9 : 0,
    transform: [{ translateX: ghostX.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: props.columnWidth,
          height: props.height,
          pointerEvents: "none" as const,
          shadowColor: "#000",
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
        },
      ]}
    >
      {/* The name rides above the ghost's top edge rather than inside it, so the day boxes below
          stay lined up with the rows they came from — `bottom: 100%` puts it exactly where the
          week header it was lifted from sits. */}
      <View
        className="absolute px-2 py-2 rounded"
        style={{
          bottom: "100%",
          left: GRID_DAY_BOX_INSET * rem,
          right: GRID_DAY_BOX_INSET * rem,
          borderWidth: 2,
          borderColor: Tailwind_semantic().icon.purple,
          backgroundColor: Tailwind_semantic().background.cardyellow,
        }}
      >
        <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>
          {props.name}
        </Text>
        <Text className="text-xs text-text-secondary" numberOfLines={1}>
          {props.numberOfDays} days
        </Text>
      </View>
      {props.rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          className="absolute overflow-hidden rounded"
          style={{
            top: row.top,
            left: GRID_DAY_BOX_INSET * rem,
            right: GRID_DAY_BOX_INSET * rem,
            height: row.height,
            borderWidth: 2,
            borderColor: Tailwind_semantic().icon.purple,
            backgroundColor: Tailwind_semantic().background.cardyellow,
          }}
        >
          <View className="justify-center px-[0.375rem]" style={{ height: labelHeight }}>
            <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
              {props.dayNames[rowIndex] ?? ""}
            </Text>
          </View>
          {(props.laneNames[rowIndex] ?? []).map((laneName, laneIndex) =>
            laneName === "" ? null : (
              <View
                key={laneIndex}
                className="absolute rounded"
                style={{
                  top: labelHeight + laneIndex * laneHeight + GRID_CELL_INSET_Y * rem,
                  left: GRID_CELL_INSET_X * rem,
                  right: GRID_CELL_INSET_X * rem,
                  height: laneHeight - 2 * GRID_CELL_INSET_Y * rem,
                  justifyContent: "center",
                  paddingHorizontal: 0.5 * rem,
                  borderWidth: 1,
                  borderColor: Tailwind_semantic().text.purple,
                  backgroundColor: Tailwind_semantic().background.cardpurpleselected,
                }}
              >
                <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
                  {laneName}
                </Text>
              </View>
            )
          )}
        </View>
      ))}
    </Animated.View>
  );
});
