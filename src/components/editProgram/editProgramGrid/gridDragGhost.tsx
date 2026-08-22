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
import { IGridActiveGhost, IGridLaneRef } from "./useGridDrags";

// What is being dragged, floating over the grid: one per row for the day drag and one for the
// exercise drag. The animated *shells* are mounted for the whole life of the grid, because building
// one when the drag starts would mean a render while the pan is live, which is what cancels the pan.
// Their contents are not: a ghost is a second copy of a row, and keeping every copy mounted made a
// zoom re-render the whole grid twice over. So the shells wait empty and fill in at drag start —
// which is safe as long as the flag reaches only the ghosts, never a row (see EditProgramGrid).
//
// A drag can carry several rows or several strips, and each of them lifts from where it already is:
// the shells sit at their own row's coordinates and the drag only ever contributes a translation.
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
  top: number;
  labelHeight: number;
  laneHeight: number;
  // Which rows are being dragged as days, and which strips as exercises — the same values that dim
  // the sources, so a ghost needs nothing of its own to know it is one of the ones on the move.
  draggedRows: SharedValue<number[]>;
  draggedLanes: SharedValue<IGridLaneRef[]>;
  ghostY: SharedValue<number>;
  // The shells stay mounted; their contents do not. A ghost is a full second copy of the row it
  // shadows, and mounting all of them at rest made every zoom re-render the grid twice over.
  activeGhost?: IGridActiveGhost;
}

// Enough to read what is being carried, sheer enough that the row it is passing over and the drop
// line under it stay visible through it.
const GHOST_OPACITY = 0.75;

export const GridDragGhost = memo(function GridDragGhost(props: IGridDragGhostProps): JSX.Element {
  const rem = useRem();
  const { rowIndex, draggedRows, draggedLanes, ghostY, laneHeight, labelHeight } = props;
  const dayStyle = useAnimatedStyle(() => ({
    opacity: draggedRows.value.indexOf(rowIndex) !== -1 ? GHOST_OPACITY : 0,
    transform: [{ translateY: ghostY.value }],
  }));
  const laneStyle = useAnimatedStyle(() => ({
    opacity: draggedLanes.value.some((lane) => lane.row === rowIndex) ? GHOST_OPACITY : 0,
    transform: [{ translateY: ghostY.value }],
  }));

  const activeGhost = props.activeGhost;
  const showDay = activeGhost?.kind === "day" && activeGhost.rows.indexOf(rowIndex) !== -1;
  // Which of this row's strips are on the move. They gather into one card from the topmost of them
  // rather than each floating at its own lane, so a scattered selection travels as one thing.
  const movedLanes =
    activeGhost?.kind === "lane"
      ? activeGhost.lanes.filter((lane) => lane.row === rowIndex).map((lane) => lane.lane)
      : [];

  const laneStrip = (laneName: string, key: number): JSX.Element => (
    <View
      key={key}
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
  );
  // The shadow lives on the outer view of each pair: clipping the lane card to its strips would clip
  // its shadow away with the rest.
  const lift = {
    position: "absolute" as const,
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
      <Animated.View pointerEvents="none" style={[dayStyle, lift, { top: props.top }]}>
        {showDay ? (
          <View className="overflow-hidden rounded" style={card}>
            <View className="justify-center px-[0.375rem]" style={{ height: labelHeight }}>
              <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                {props.name}
              </Text>
            </View>
            {props.laneNames.map((laneName, laneIndex) => laneStrip(laneName, laneIndex))}
          </View>
        ) : null}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[laneStyle, lift, { top: props.top + labelHeight }]}>
        {movedLanes.length > 0 ? (
          <View className="overflow-hidden rounded" style={[card, { marginTop: Math.min(...movedLanes) * laneHeight }]}>
            {movedLanes.map((laneIndex) => laneStrip(props.laneNames[laneIndex] ?? "", laneIndex))}
          </View>
        ) : null}
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
  // As for the day ghost: a week ghost is a whole column of day boxes and strips, and there is one
  // per week. Built when a week drag starts, not before.
  activeGhost?: IGridActiveGhost;
}

export const GridWeekGhost = memo(function GridWeekGhost(props: IGridWeekGhostProps): JSX.Element {
  const rem = useRem();
  const { weekIndex, draggedWeek, ghostX, laneHeight, labelHeight } = props;
  const style = useAnimatedStyle(() => ({
    opacity: draggedWeek.value === weekIndex ? GHOST_OPACITY : 0,
    transform: [{ translateX: ghostX.value }],
  }));
  const activeGhost = props.activeGhost;
  const show = activeGhost?.kind === "week" && activeGhost.weeks.indexOf(weekIndex) !== -1;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: "absolute",
          top: 0,
          left: weekIndex * props.columnWidth,
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
      {!show ? null : (
        <>
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
        </>
      )}
    </Animated.View>
  );
});
