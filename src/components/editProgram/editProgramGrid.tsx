import { JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, LayoutChangeEvent, Platform, useWindowDimensions } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { Pressable } from "../primitives/pressable";
import { IEvaluatedProgram } from "../../models/program";
import { IPlannerProgram, ISettings } from "../../types";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { useRem } from "../../utils/useRem";
import { StringUtils_pluralize } from "../../utils/string";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";
import Animated, { useAnimatedStyle, useSharedValue, SharedValue } from "react-native-reanimated";
import { useGridPinch } from "./gridPinch";
import {
  IProgramGrid,
  IProgramGridColumn,
  IProgramGridDensity,
  IProgramGridPlacement,
  IProgramGridSelection,
  IProgramGridTokenKind,
  ProgramGrid_build,
  ProgramGrid_cellScheme,
  ProgramGrid_errorAt,
  ProgramGrid_isRelated,
  ProgramGrid_select,
} from "../../pages/planner/models/programGrid";
import { FastText } from "../primitives/fastText";
import { StyledText, StyledText_remToPx } from "../../utils/styledText";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { IDispatch } from "../../ducks/types";
import { Thunk_pushToEditProgramExercise } from "../../ducks/thunks";
import { Program_getProgramExerciseForKeyAndShortDayData } from "../../models/program";
import { EditProgramUiHelpers_deleteCurrentInstance } from "./editProgramUi/editProgramUiHelpers";
import { pickerStateFromPlannerExercise } from "./editProgramUtils";
import { Dialog_alert } from "../../utils/dialog";
import { useGridSelectionPublish, IGridSelectionTarget } from "./gridSelectionContext";
import { IconPlus2 } from "../icons/iconPlus2";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { IconArrowRight } from "../icons/iconArrowRight";
import { GridResizeHandle } from "./gridResizeHandle";
import { GridDragHandle } from "./gridDragHandle";
import {
  IProgramGridTransformResult,
  ProgramGridTransforms_setRepeatRange,
  ProgramGridTransforms_deleteDayRow,
  ProgramGridTransforms_duplicateDayRow,
  ProgramGridTransforms_moveDayRow,
  ProgramGridTransforms_reorderExercisesInDay,
  ProgramGridTransforms_moveExerciseToDay,
  ProgramGridTransforms_moveWeek,
  ProgramGridTransforms_deleteWeek,
  ProgramGridTransforms_duplicateWeek,
  ProgramGridTransforms_uniqueWeekName,
} from "../../pages/planner/models/programGridTransforms";

// Column width at scale 1, in rem; pinch multiplies it. Below SCHEME_MIN_WIDTH a column is too
// narrow to say anything useful with numbers, so cells shed their scheme and show names only --
// zoomed all the way out is therefore the whole-program structure view, not a separate mode.
const BASE_COLUMN_WIDTH = 9.5;
const SCHEME_MIN_WIDTH = 7.5;
const LANE_HEIGHT_WITH_SCHEME = 3.25;
const LANE_HEIGHT_NAME_ONLY = 2;
// Up to this many weeks, columns divide the available width instead of scrolling.
const WEEKS_THAT_FIT = 2;
const SCALE_PRESETS: { label: string; scale: number }[] = [
  { label: "S", scale: 0.6 },
  { label: "M", scale: 1 },
  { label: "L", scale: 1.5 },
];
// Grid gutters, in rem. A day box is inset from its column by DAY_BOX_INSET (so neighbouring boxes
// are separated by twice that), and a strip is inset by CELL_INSET — the difference between them is
// the breathing room *inside* the box, and BOTTOM_GAP keeps the same room under the last strip.
const DAY_BOX_INSET = 0.1875;
const CELL_INSET_X = 0.4375;
const CELL_INSET_Y = 0.1875;
const BOTTOM_GAP = 0.25;
const ADD_ROW_HEIGHT = 1.5;
const DAY_LABEL_HEIGHT = 2;
const RESIZE_HANDLE_WIDTH = 1;
const MARGIN_BETWEEN_ROWS = 0.25;

// Where every row and lane sits, derived from the model rather than measured: a drag has to resolve
// a finger position to a day and a slot in *another* row, and measuring that means a layout event
// per row, which is a re-render per row — the thing that cancels the pan mid-drag.
interface IGridGeometryRow {
  top: number;
  height: number;
  outerHeight: number;
  // Top of lane 0, i.e. under the day label.
  contentTop: number;
  lanes: number;
  laneNames: string[];
  isCollapsed: boolean;
}

function buildGridGeometry(
  grid: IProgramGrid,
  collapsedRows: number[],
  laneHeight: number,
  rem: number
): IGridGeometryRow[] {
  const labelHeight = DAY_LABEL_HEIGHT * rem;
  const addHeight = ADD_ROW_HEIGHT * rem;
  let top = 0;
  return grid.rows.map((row) => {
    const isCollapsed = collapsedRows.indexOf(row.rowIndex) !== -1;
    const laneNames: string[] = [];
    for (const placement of grid.placements) {
      if (placement.rowIndex === row.rowIndex) {
        laneNames[placement.laneIndex] = placement.fullName;
      }
    }
    const lanes = laneNames.length;
    // The row is taller than its content by the box's own padding, so the last strip clears the
    // bottom edge by the same gap it keeps from the sides.
    const height = isCollapsed
      ? labelHeight + BOTTOM_GAP * rem
      : labelHeight + lanes * laneHeight + addHeight + BOTTOM_GAP * rem;
    const result: IGridGeometryRow = {
      top,
      height,
      outerHeight: height + MARGIN_BETWEEN_ROWS * rem,
      contentTop: top + labelHeight,
      lanes,
      laneNames: Array.from({ length: lanes }, (_, i) => laneNames[i] ?? ""),
      isCollapsed,
    };
    top += result.outerHeight;
    return result;
  });
}

// What is being dragged, floating over the grid: one per row for the day drag and one for the
// exercise drag, both mounted for the whole life of the grid. Building a ghost when the drag starts
// would mean a render while the pan is live, which is what cancels the pan.
//
// Only `opacity` and `transform` are ever animated. Animating `top`/`height`/`zIndex` instead —
// which is what the first version did — makes Fabric commit a new shadow tree and reorder subviews
// on every frame of the drag, right under the finger, and the pan dies exactly as it did before.
// So every ghost has a static size and sits at the top of the rows, and the drag moves it.
interface IGridDragGhostProps {
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

const GridDragGhost = memo(function GridDragGhost(props: IGridDragGhostProps): JSX.Element {
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
      style={{ height: laneHeight, paddingHorizontal: CELL_INSET_X * rem, paddingVertical: CELL_INSET_Y * rem }}
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
interface IGridWeekGhostProps {
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

const GridWeekGhost = memo(function GridWeekGhost(props: IGridWeekGhostProps): JSX.Element {
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
          left: DAY_BOX_INSET * rem,
          right: DAY_BOX_INSET * rem,
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
            left: DAY_BOX_INSET * rem,
            right: DAY_BOX_INSET * rem,
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
                  top: labelHeight + laneIndex * laneHeight + CELL_INSET_Y * rem,
                  left: CELL_INSET_X * rem,
                  right: CELL_INSET_X * rem,
                  height: laneHeight - 2 * CELL_INSET_Y * rem,
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

interface IEditProgramGridProps {
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
  programId: string;
  dispatch: IDispatch;
  // Undefined until the user pinches or picks a preset, which is what lets a short program fit the
  // screen by default without freezing that choice the moment they zoom.
  scale?: number;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export const EditProgramGrid = memo(function EditProgramGrid(props: IEditProgramGridProps): JSX.Element {
  usePerfRenderCount("EditProgramGrid");
  const rem = useRem();
  const { evaluatedProgram, settings } = props;
  const grid = useMemo(() => ProgramGrid_build(evaluatedProgram, settings), [evaluatedProgram, settings]);
  const windowWidth = useWindowDimensions().width;
  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const onLayout = useCallback((e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width), []);
  // A one- or two-week program has no reason to leave half the screen empty, so it fills the width
  // until the user says otherwise; three or more weeks start at the readable base width and scroll.
  const autoColumnWidth =
    grid.columns.length > 0 && grid.columns.length <= WEEKS_THAT_FIT
      ? containerWidth / grid.columns.length
      : BASE_COLUMN_WIDTH * rem;
  const columnWidth = props.scale != null ? BASE_COLUMN_WIDTH * props.scale * rem : autoColumnWidth;
  const scale = columnWidth / (BASE_COLUMN_WIDTH * rem);
  const totalWidth = columnWidth * grid.columns.length;
  const density: IProgramGridDensity = columnWidth >= SCHEME_MIN_WIDTH * rem ? 2 : 0;
  const laneHeight = (density === 0 ? LANE_HEIGHT_NAME_ONLY : LANE_HEIGHT_WITH_SCHEME) * rem;

  // Read by the delete pre-flight, which has to answer "can this be done" before dispatching so it
  // can explain itself rather than silently doing nothing inside a lens modifier.
  const plannerRef = useRef(evaluatedProgram.planner);
  plannerRef.current = evaluatedProgram.planner;

  const plannerDispatch = props.plannerDispatch;
  const onChangeScale = useCallback(
    (newScale: number) => {
      plannerDispatch(lb<IPlannerState>().p("ui").p("gridScale").record(newScale), `Change grid scale to ${newScale}`);
    },
    [plannerDispatch]
  );
  const { Wrap } = useGridPinch({ scale, onScaleChange: onChangeScale });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDayRow, setSelectedDayRow] = useState<number | undefined>(undefined);
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>(undefined);
  const selection = useMemo(() => ProgramGrid_select(grid, selectedIds), [grid, selectedIds]);
  // Tapping is a toggle, so multi-select needs no mode to enter or leave: tap to add, tap again to
  // drop, tap the background to clear.
  const onSelect = useCallback((placementId: string) => {
    setSelectedDayRow(undefined);
    setSelectedWeek(undefined);
    setSelectedIds((current) =>
      current.indexOf(placementId) !== -1 ? current.filter((id) => id !== placementId) : [...current, placementId]
    );
  }, []);
  const onClearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectedDayRow(undefined);
    setSelectedWeek(undefined);
  }, []);

  // A day is selected as a row, across every week — its operations restructure the program, and
  // doing that in one week only would shift that week's slots while leaving the rest, which is how
  // repeats and `...main[2]` end up meaning different days in different weeks.
  const onSelectDay = useCallback((rowIndex: number) => {
    setSelectedIds([]);
    setSelectedWeek(undefined);
    setSelectedDayRow((current) => (current === rowIndex ? undefined : rowIndex));
  }, []);

  // A week is the other whole-program axis: selecting one is selecting the column, and its actions
  // restructure the program the same way a day row's do.
  const onSelectWeek = useCallback((weekIndex: number) => {
    setSelectedIds([]);
    setSelectedDayRow(undefined);
    setSelectedWeek((current) => (current === weekIndex ? undefined : weekIndex));
  }, []);

  // Every structural edit runs the same way: ask the transform first so a refusal can be shown,
  // then dispatch. Doing the check inside the lens modifier instead would leave a refusal with
  // nowhere to go, and the edit would look like it simply did nothing.
  const applyTransform = useCallback(
    (transform: (planner: IPlannerProgram) => IProgramGridTransformResult, description: string) => {
      const check = transform(plannerRef.current);
      if (!check.ok) {
        Dialog_alert(check.reason);
        return;
      }
      plannerDispatch(
        lb<IPlannerState>()
          .p("current")
          .p("program")
          .pi("planner")
          .recordModify((planner) => {
            const result = transform(planner);
            return result.ok ? result.planner : planner;
          }),
        description
      );
    },
    [plannerDispatch]
  );

  // Filled from the geometry memo below — read only from drag handlers, which run long after the
  // render that wrote it. A ref rather than a value so a handler can see the current layout without
  // being rebuilt when it changes, since rebuilding a gesture's callbacks mid-drag drops the drag.
  const geometryRef = useRef<IGridGeometryRow[]>([]);
  const laneHeightRef = useRef(laneHeight);
  laneHeightRef.current = laneHeight;
  const labelHeightRef = useRef(DAY_LABEL_HEIGHT * rem);
  labelHeightRef.current = DAY_LABEL_HEIGHT * rem;
  // Every drag in the grid follows the same two rules: what it will do is written synchronously to
  // a ref as the finger moves, and what it looks like rides on shared values. No state changes
  // until the finger lifts — re-rendering the tree under the finger is what makes gesture-handler
  // cancel the pan, and reading the target from state would read a commit React hadn't flushed.
  const draggedRow = useSharedValue(-1);
  // The *gap* the dragged row will land in, counted in the rows' current positions: gap N sits
  // above row N, and gap rowCount is below the last one. Not the destination index — moving row 0
  // to index 1 leaves it after row 1, so the line belongs below row 1, not above it. -1 hides it.
  const dropBoundary = useSharedValue(-1);
  // Where the floating copy of whatever is being dragged currently sits, in the rows' own
  // coordinates. Which ghost shows is decided by the same values that dim the source.
  const ghostY = useSharedValue(0);

  // Committing a day move is all the parent does — a day only ever lands among the rows it can
  // already see, so the row itself can track the drag.
  const onMoveDayRow = useCallback(
    (from: number, to: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_moveDayRow(planner, from, to, settings),
        `Move day ${from + 1} to position ${to + 1}`
      );
    },
    [applyTransform, settings]
  );

  const [collapsedRows, setCollapsedRows] = useState<number[]>([]);
  const onToggleCollapsed = useCallback((rowIndex: number) => {
    setCollapsedRows((current) =>
      current.indexOf(rowIndex) !== -1 ? current.filter((r) => r !== rowIndex) : [...current, rowIndex]
    );
  }, []);
  const geometry = useMemo(
    () => buildGridGeometry(grid, collapsedRows, laneHeight, rem),
    [grid, collapsedRows, laneHeight, rem]
  );
  geometryRef.current = geometry;
  const rowsHeight = geometry.reduce((acc, row) => acc + row.outerHeight, 0);
  // What each week holds, by row and lane — the week ghost's contents. A run spanning several weeks
  // appears in each of the columns it covers, because it is what that week prescribes there.
  const weekLaneNames = useMemo(() => {
    return grid.columns.map((column) =>
      geometry.map((row, rowIndex) => {
        const names = Array.from({ length: row.lanes }, () => "");
        for (const placement of grid.placements) {
          if (
            placement.rowIndex === rowIndex &&
            placement.colStart <= column.weekIndex &&
            placement.colEnd >= column.weekIndex
          ) {
            names[placement.laneIndex] = placement.fullName;
          }
        }
        return names;
      })
    );
  }, [grid.columns, grid.placements, geometry]);

  // An exercise drag is owned up here rather than by its row, because it can end in a different
  // row than it started in: only the grid knows where the other rows are, and only shared values
  // can show the drop line in one row while the finger is being tracked by another's gesture.
  // Nothing here calls setState — the whole drag is refs and shared values until the finger lifts.
  const draggedLaneRow = useSharedValue(-1);
  const draggedLane = useSharedValue(-1);
  const dropLaneRow = useSharedValue(-1);
  // The gap, in the target row's current lanes: gap N sits above lane N, and gap `lanes` sits below
  // the last one. -1 hides it.
  const dropLaneGap = useSharedValue(-1);
  // Weeks run across the grid rather than down it, so they get their own pair: which column is
  // lifted, and which gap between columns it would drop into.
  const draggedWeek = useSharedValue(-1);
  const dropWeekGap = useSharedValue(-1);
  const ghostX = useSharedValue(0);
  const laneDragRef = useRef<{ fromRow: number; fromLane: number; toRow: number; gap: number } | undefined>(undefined);

  const onLaneDragStart = useCallback(
    (rowIndex: number, laneIndex: number) => {
      laneDragRef.current = { fromRow: rowIndex, fromLane: laneIndex, toRow: rowIndex, gap: laneIndex };
      draggedLaneRow.value = rowIndex;
      draggedLane.value = laneIndex;
      dropLaneRow.value = -1;
      dropLaneGap.value = -1;
      const source = geometryRef.current[rowIndex];
      if (source != null) {
        ghostY.value = source.contentTop + laneIndex * laneHeightRef.current;
      }
    },
    [draggedLaneRow, draggedLane, dropLaneRow, dropLaneGap, ghostY]
  );

  const onLaneDragMove = useCallback(
    (rowIndex: number, laneIndex: number, translationY: number) => {
      const drag = laneDragRef.current;
      const geo = geometryRef.current;
      const source = geo[rowIndex];
      if (drag == null || source == null) {
        return;
      }
      const height = laneHeightRef.current;
      // The strip's own centre is what chases the finger, so the drop follows what you see rather
      // than where you happened to grab it.
      const y = source.contentTop + (laneIndex + 0.5) * height + translationY;
      ghostY.value = y - height / 2;
      let toRow = 0;
      for (let i = 0; i < geo.length; i += 1) {
        if (y >= geo[i].top) {
          toRow = i;
        }
      }
      const target = geo[toRow];
      // A collapsed row shows no lanes to aim between, so anything dropped on it goes to the end.
      const gap = target.isCollapsed
        ? target.lanes
        : Math.max(0, Math.min(target.lanes, Math.round((y - target.contentTop) / height)));
      laneDragRef.current = { ...drag, toRow, gap };
      // Within its own row, the gap just above the strip and the one just below it are both where
      // it already is, so neither gets a line.
      const isNoop = toRow === drag.fromRow && (gap === drag.fromLane || gap === drag.fromLane + 1);
      dropLaneRow.value = isNoop ? -1 : toRow;
      dropLaneGap.value = isNoop ? -1 : gap;
    },
    [dropLaneRow, dropLaneGap, ghostY]
  );

  const onLaneDragEnd = useCallback(
    (commit: boolean) => {
      const drag = laneDragRef.current;
      laneDragRef.current = undefined;
      draggedLaneRow.value = -1;
      draggedLane.value = -1;
      dropLaneRow.value = -1;
      dropLaneGap.value = -1;
      const geo = geometryRef.current;
      const source = drag != null ? geo[drag.fromRow] : undefined;
      const fullName = drag != null && source != null ? source.laneNames[drag.fromLane] : undefined;
      if (!commit || drag == null || source == null || fullName == null || fullName === "") {
        return;
      }
      if (drag.toRow === drag.fromRow) {
        // The strip is lifted out before it lands, so a gap below its own position is one index
        // further along than the slot it ends up in.
        const to = drag.gap > drag.fromLane ? drag.gap - 1 : drag.gap;
        if (to === drag.fromLane) {
          return;
        }
        const order = source.laneNames.slice();
        order.splice(to, 0, ...order.splice(drag.fromLane, 1));
        applyTransform(
          (planner) =>
            ProgramGridTransforms_reorderExercisesInDay(
              planner,
              drag.fromRow,
              order.filter((n) => n !== ""),
              settings
            ),
          `Reorder exercises in day ${drag.fromRow + 1}`
        );
        return;
      }
      const before = geo[drag.toRow]?.laneNames[drag.gap];
      applyTransform(
        (planner) =>
          ProgramGridTransforms_moveExerciseToDay(
            planner,
            drag.fromRow,
            fullName,
            drag.toRow,
            before === "" ? undefined : before,
            settings
          ),
        `Move ${fullName} to day ${drag.toRow + 1}`
      );
    },
    [applyTransform, settings, draggedLaneRow, draggedLane, dropLaneRow, dropLaneGap]
  );

  const dispatch = props.dispatch;
  const programId = props.programId;
  const onEditPlacement = useCallback(
    (placement: IProgramGridPlacement) => {
      dispatch(Thunk_pushToEditProgramExercise(placement.key, placement.dayData, programId));
    },
    [dispatch, programId]
  );

  const onDuplicatePlacement = useCallback(
    (placement: IProgramGridPlacement) => {
      const exercise = Program_getProgramExerciseForKeyAndShortDayData(
        evaluatedProgram,
        placement.dayData,
        placement.key
      );
      plannerDispatch(
        lb<IPlannerState>()
          .p("ui")
          .p("exercisePicker")
          .record({
            state: pickerStateFromPlannerExercise(settings, exercise),
            dayData: placement.dayData,
            exerciseKey: placement.key,
            change: "duplicate",
          }),
        "Open duplicate exercise modal"
      );
    },
    [plannerDispatch, evaluatedProgram, settings]
  );

  const onDeletePlacements = useCallback(
    (placements: IProgramGridPlacement[]) => {
      // Deleting an exercise that others reuse orphans them, and materializing the reusers is the
      // v2 work. Until then this refuses rather than quietly breaking the program.
      const sources = placements.filter((p) => p.isReuseSource);
      if (sources.length > 0) {
        Dialog_alert(
          `${sources.map((p) => p.fullName).join(", ")} ${sources.length === 1 ? "is" : "are"} reused by other exercises. Change those to stop reusing it first.`
        );
        return;
      }
      plannerDispatch(
        lb<IPlannerState>()
          .p("current")
          .p("program")
          .pi("planner")
          .recordModify((planner) => {
            return placements.reduce(
              (acc, placement) =>
                EditProgramUiHelpers_deleteCurrentInstance(
                  acc,
                  placement.dayData,
                  placement.fullName,
                  settings,
                  false,
                  true
                ),
              planner
            );
          }),
        `Delete ${placements.length} exercise(s) from grid`
      );
      setSelectedIds([]);
    },
    [plannerDispatch, settings]
  );

  const onAddExercise = useCallback(
    (weekIndex: number, rowIndex: number) => {
      plannerDispatch(
        lb<IPlannerState>()
          .p("ui")
          .p("exercisePicker")
          .record({
            dayData: { week: weekIndex + 1, dayInWeek: rowIndex + 1 },
            change: "all",
            state: pickerStateFromPlannerExercise(settings),
          }),
        "Open add exercise picker"
      );
    },
    [plannerDispatch, settings]
  );

  const onAddDay = useCallback(
    (weekIndex: number) => {
      plannerDispatch(
        lb<IPlannerState>()
          .p("current")
          .p("program")
          .pi("planner")
          .p("weeks")
          .i(weekIndex)
          .p("days")
          .recordModify((days) => [...days, { name: `Day ${days.length + 1}`, exerciseText: "" }]),
        "Add new day"
      );
    },
    [plannerDispatch]
  );

  const onSetRepeatRange = useCallback(
    (placement: IProgramGridPlacement, toWeekIndex: number) => {
      plannerDispatch(
        lb<IPlannerState>()
          .p("current")
          .p("program")
          .pi("planner")
          .recordModify((planner) =>
            ProgramGridTransforms_setRepeatRange(planner, placement.dayData, placement.fullName, toWeekIndex + 1)
          ),
        `Repeat ${placement.fullName} through week ${toWeekIndex + 1}`
      );
    },
    [plannerDispatch]
  );

  const onAddWeek = useCallback(() => {
    plannerDispatch(
      lb<IPlannerState>()
        .p("current")
        .p("program")
        .pi("planner")
        .p("weeks")
        .recordModify((weeks) => [
          ...weeks,
          {
            name: ProgramGridTransforms_uniqueWeekName({ ...plannerRef.current, weeks }, `Week ${weeks.length + 1}`),
            days: [],
          },
        ]),
      "Add new week"
    );
  }, [plannerDispatch]);

  const onDuplicateDay = useCallback(
    (rowIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_duplicateDayRow(planner, rowIndex, settings),
        `Duplicate day ${rowIndex + 1} in every week`
      );
      setSelectedDayRow(undefined);
    },
    [applyTransform, settings]
  );

  const onDeleteDay = useCallback(
    (rowIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_deleteDayRow(planner, rowIndex, settings),
        `Delete day ${rowIndex + 1} from every week`
      );
      setSelectedDayRow(undefined);
    },
    [applyTransform, settings]
  );

  const onDuplicateWeek = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_duplicateWeek(planner, weekIndex, settings),
        `Duplicate week ${weekIndex + 1}`
      );
      setSelectedWeek(undefined);
    },
    [applyTransform, settings]
  );

  const onDeleteWeek = useCallback(
    (weekIndex: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_deleteWeek(planner, weekIndex, settings),
        `Delete week ${weekIndex + 1}`
      );
      setSelectedWeek(undefined);
    },
    [applyTransform, settings]
  );

  const onMoveWeek = useCallback(
    (from: number, to: number) => {
      applyTransform(
        (planner) => ProgramGridTransforms_moveWeek(planner, from, to, settings),
        `Move week ${from + 1} to position ${to + 1}`
      );
    },
    [applyTransform, settings]
  );

  const publishSelection = useGridSelectionPublish();
  const dayRow = selectedDayRow != null ? grid.rows[selectedDayRow] : undefined;
  const weekColumn = selectedWeek != null ? grid.columns[selectedWeek] : undefined;
  const payload = useMemo(() => {
    const target: IGridSelectionTarget | undefined =
      selectedWeek != null && weekColumn != null
        ? {
            kind: "week",
            weekIndex: selectedWeek,
            name: weekColumn.name,
            dayCount: weekColumn.numberOfDays,
            // Distinct exercises across the week's days, counting a run that spans several weeks
            // once — it is one exercise in this week like any other.
            exerciseCount: new Set(
              grid.placements
                .filter((p) => p.colStart <= selectedWeek && p.colEnd >= selectedWeek)
                .map((p) => `${p.rowIndex}:${p.fullName}`)
            ).size,
          }
        : selectedDayRow != null && dayRow != null
          ? {
              kind: "day",
              rowIndex: selectedDayRow,
              name: dayRow.namePerWeek.find((n) => n != null) ?? `Day ${selectedDayRow + 1}`,
              placements: grid.placements.filter((p) => p.rowIndex === selectedDayRow),
            }
          : selection != null
            ? { kind: "exercises", placements: selection.placements }
            : undefined;
    return target != null
      ? {
          target,
          onEdit: onEditPlacement,
          onDuplicate: onDuplicatePlacement,
          onDelete: onDeletePlacements,
          onDuplicateDay,
          onDeleteDay,
          onDuplicateWeek,
          onDeleteWeek,
          onClear: onClearSelection,
        }
      : undefined;
  }, [
    grid.placements,
    selection,
    selectedDayRow,
    dayRow,
    selectedWeek,
    weekColumn,
    onEditPlacement,
    onDuplicatePlacement,
    onDeletePlacements,
    onDuplicateDay,
    onDeleteDay,
    onDuplicateWeek,
    onDeleteWeek,
    onClearSelection,
  ]);
  useEffect(() => {
    publishSelection(payload);
  }, [payload, publishSelection]);
  // Leaving the grid (mode switch, tab change) must take the dock with it.
  useEffect(() => () => publishSelection(undefined), [publishSelection]);

  return (
    <View className="pb-4" onLayout={onLayout}>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-xs text-text-secondary">
          {grid.counts.weeks} {StringUtils_pluralize("week", grid.counts.weeks)} · {grid.counts.exercises}{" "}
          {StringUtils_pluralize("exercise", grid.counts.exercises)}
          {grid.counts.templates > 0
            ? ` · ${grid.counts.templates} ${StringUtils_pluralize("template", grid.counts.templates)}`
            : ""}
        </Text>
        <View className="flex-row items-center">
          {SCALE_PRESETS.map((preset, i) => (
            <Pressable
              key={preset.label}
              className={`px-2 py-1 ml-1 rounded nm-grid-density-${i}`}
              testID={`grid-density-${i}`}
              onPress={() => onChangeScale(preset.scale)}
            >
              <Text
                className={`text-xs ${
                  Math.abs(scale - preset.scale) < 0.01 ? "font-bold text-text-link" : "text-text-secondary"
                }`}
              >
                {preset.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Wrap>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          {/* Deliberately not a Pressable for tap-to-clear. A day name is a gesture detector rather
              than a Pressable, so it does not consume the touch from an ancestor Pressable: the tap
              would select the day and the background would immediately clear it, and the same
              ancestor competed with the long-press drag. Clearing lives on the dock's ✕ and on
              tapping a selected thing again. */}
          <View className="flex-row">
            <View style={{ width: totalWidth }}>
              <WeekHeaderRow
                grid={grid}
                columnWidth={columnWidth}
                selectedWeek={selectedWeek}
                onSelectWeek={onSelectWeek}
                onMoveWeek={onMoveWeek}
                draggedWeek={draggedWeek}
                dropWeekGap={dropWeekGap}
                ghostX={ghostX}
              />
              {/* The rows and the ghosts share one coordinate space — the geometry's — and it
                  starts here, below the week header. zIndex keeps a ghost dragged past the last row
                  above the "+ Day" strip that follows. */}
              <View style={{ zIndex: 1 }}>
                {grid.rows.map((row) => (
                  <GridRow
                    key={row.rowIndex}
                    grid={grid}
                    rowIndex={row.rowIndex}
                    columnWidth={columnWidth}
                    laneHeight={laneHeight}
                    density={density}
                    selection={selection}
                    onSelect={onSelect}
                    onAddExercise={onAddExercise}
                    onSetRepeatRange={onSetRepeatRange}
                    onSelectDay={onSelectDay}
                    onToggleCollapsed={onToggleCollapsed}
                    isCollapsed={collapsedRows.indexOf(row.rowIndex) !== -1}
                    isDaySelected={selectedDayRow === row.rowIndex}
                    isDayDimmed={selectedDayRow != null && selectedDayRow !== row.rowIndex}
                    geometryRef={geometryRef}
                    lanes={geometry[row.rowIndex].lanes}
                    rowHeight={geometry[row.rowIndex].height}
                    onMoveDayRow={onMoveDayRow}
                    onLaneDragStart={onLaneDragStart}
                    onLaneDragMove={onLaneDragMove}
                    onLaneDragEnd={onLaneDragEnd}
                    draggedRow={draggedRow}
                    dropBoundary={dropBoundary}
                    draggedLaneRow={draggedLaneRow}
                    draggedLane={draggedLane}
                    dropLaneRow={dropLaneRow}
                    dropLaneGap={dropLaneGap}
                    ghostY={ghostY}
                  />
                ))}
                {/* Last, so they paint over every row. Mounted with the grid rather than with the
                    drag: see GridDragGhost. Reanimated is stubbed on web, where they would land in
                    the flow with their positioning dropped, so web goes without. */}
                {Platform.OS !== "web" &&
                  grid.rows.map((row) => (
                    <GridDragGhost
                      key={row.rowIndex}
                      rowIndex={row.rowIndex}
                      name={row.namePerWeek.find((n) => n != null) ?? `Day ${row.rowIndex + 1}`}
                      laneNames={geometry[row.rowIndex].isCollapsed ? [] : geometry[row.rowIndex].laneNames}
                      width={totalWidth}
                      labelHeight={DAY_LABEL_HEIGHT * rem}
                      laneHeight={laneHeight}
                      draggedRow={draggedRow}
                      draggedLaneRow={draggedLaneRow}
                      draggedLane={draggedLane}
                      ghostY={ghostY}
                    />
                  ))}
                {Platform.OS !== "web" &&
                  grid.columns.map((column) => (
                    <GridWeekGhost
                      key={column.weekIndex}
                      weekIndex={column.weekIndex}
                      name={column.name}
                      numberOfDays={column.numberOfDays}
                      columnWidth={columnWidth}
                      height={rowsHeight}
                      rows={geometry}
                      dayNames={grid.rows.map((row) => row.namePerWeek[column.weekIndex])}
                      laneNames={weekLaneNames[column.weekIndex]}
                      labelHeight={DAY_LABEL_HEIGHT * rem}
                      laneHeight={laneHeight}
                      draggedWeek={draggedWeek}
                      ghostX={ghostX}
                    />
                  ))}
              </View>
              <View className="flex-row">
                {grid.columns.map((column) => (
                  <View
                    key={column.weekIndex}
                    style={{ width: columnWidth, padding: DAY_BOX_INSET * rem }}
                    className="justify-center"
                  >
                    <AddButton
                      label="Day"
                      testID={`grid-add-day-${column.weekIndex}`}
                      onPress={() => onAddDay(column.weekIndex)}
                    />
                  </View>
                ))}
              </View>
            </View>
            <View style={{ width: columnWidth, padding: DAY_BOX_INSET * rem }}>
              <AddButton label="Week" testID="grid-add-week" onPress={onAddWeek} />
            </View>
          </View>
        </ScrollView>
      </Wrap>
      <Text className="px-4 pt-2 text-xs text-text-secondary">Weeks and days never reorder</Text>
    </View>
  );
});

interface IAddButtonProps {
  label: string;
  testID: string;
  onPress: () => void;
}

const AddButton = memo(function AddButton(props: IAddButtonProps): JSX.Element {
  return (
    <Pressable
      className={`flex-row items-center justify-center px-1 py-1 border rounded nm-${props.testID}`}
      // A filled placeholder rather than an outline: against the warm day box an unfilled button
      // reads as part of the box, and "+ Exercise" in particular went unnoticed. The pale purple is
      // the exercise strip's own colour, drained — an empty slot waiting for one.
      style={{
        borderStyle: "dashed",
        borderColor: Tailwind_semantic().border.cardpurple,
        backgroundColor: Tailwind_semantic().background.cardpurple,
      }}
      testID={props.testID}
      accessibilityLabel={`Add ${props.label}`}
      onPress={props.onPress}
    >
      <IconPlus2 size={10} color={Tailwind_semantic().text.link} />
      <Text className="ml-1 text-xs font-semibold text-text-link" numberOfLines={1}>
        {props.label}
      </Text>
    </Pressable>
  );
});

interface IWeekHeaderRowProps {
  grid: IProgramGrid;
  columnWidth: number;
  selectedWeek?: number;
  onSelectWeek: (weekIndex: number) => void;
  onMoveWeek: (from: number, to: number) => void;
  draggedWeek: SharedValue<number>;
  dropWeekGap: SharedValue<number>;
  ghostX: SharedValue<number>;
}

const WeekHeaderRow = memo(function WeekHeaderRow(props: IWeekHeaderRowProps): JSX.Element {
  const { grid, columnWidth, onMoveWeek, draggedWeek, dropWeekGap, ghostX } = props;
  // Same rules as the other two drags: the target lives in a ref, the feedback in shared values,
  // and nothing above the gesture re-renders while it is live.
  const weekDragToRef = useRef<number | undefined>(undefined);

  const onWeekDragStart = useCallback(
    (weekIndex: number) => {
      weekDragToRef.current = weekIndex;
      draggedWeek.value = weekIndex;
      dropWeekGap.value = -1;
      ghostX.value = weekIndex * columnWidth;
    },
    [draggedWeek, dropWeekGap, ghostX, columnWidth]
  );

  const onWeekDragMove = useCallback(
    (weekIndex: number, translationX: number) => {
      ghostX.value = weekIndex * columnWidth + translationX;
      // Every column is the same width, so unlike the day rows this is one division.
      const to = Math.max(0, Math.min(grid.columns.length - 1, weekIndex + Math.round(translationX / columnWidth)));
      weekDragToRef.current = to;
      dropWeekGap.value = to === weekIndex ? -1 : to > weekIndex ? to + 1 : to;
    },
    [grid.columns.length, columnWidth, dropWeekGap, ghostX]
  );

  const onWeekDragEnd = useCallback(
    (weekIndex: number, commit: boolean) => {
      const to = weekDragToRef.current;
      weekDragToRef.current = undefined;
      draggedWeek.value = -1;
      dropWeekGap.value = -1;
      if (commit && to != null && to !== weekIndex) {
        onMoveWeek(weekIndex, to);
      }
    },
    [onMoveWeek, draggedWeek, dropWeekGap]
  );

  return (
    <View className="flex-row border-b border-border-neutral">
      {grid.columns.map((column) => (
        <WeekHeaderCell
          key={column.weekIndex}
          column={column}
          columnWidth={columnWidth}
          isSelected={props.selectedWeek === column.weekIndex}
          isDimmed={props.selectedWeek != null && props.selectedWeek !== column.weekIndex}
          isLast={column.weekIndex === grid.columns.length - 1}
          onSelectWeek={props.onSelectWeek}
          onWeekDragStart={onWeekDragStart}
          onWeekDragMove={onWeekDragMove}
          onWeekDragEnd={onWeekDragEnd}
          draggedWeek={draggedWeek}
          dropWeekGap={dropWeekGap}
        />
      ))}
    </View>
  );
});

interface IWeekHeaderCellProps {
  column: IProgramGridColumn;
  columnWidth: number;
  isSelected: boolean;
  isDimmed: boolean;
  isLast: boolean;
  onSelectWeek: (weekIndex: number) => void;
  onWeekDragStart: (weekIndex: number) => void;
  onWeekDragMove: (weekIndex: number, translationX: number) => void;
  onWeekDragEnd: (weekIndex: number, commit: boolean) => void;
  draggedWeek: SharedValue<number>;
  dropWeekGap: SharedValue<number>;
}

const WeekHeaderCell = memo(function WeekHeaderCell(props: IWeekHeaderCellProps): JSX.Element {
  const { column, onWeekDragStart, onWeekDragMove, onWeekDragEnd, onSelectWeek, draggedWeek, dropWeekGap } = props;
  const weekIndex = column.weekIndex;
  const onTap = useCallback(() => onSelectWeek(weekIndex), [onSelectWeek, weekIndex]);
  const onDragStart = useCallback(() => onWeekDragStart(weekIndex), [onWeekDragStart, weekIndex]);
  const onDragMove = useCallback((dx: number) => onWeekDragMove(weekIndex, dx), [onWeekDragMove, weekIndex]);
  const onDragEnd = useCallback((commit: boolean) => onWeekDragEnd(weekIndex, commit), [onWeekDragEnd, weekIndex]);

  const liftStyle = useAnimatedStyle(() => ({ opacity: draggedWeek.value === weekIndex ? 0.25 : 0 }));
  // Each column owns the gap on its left; the last one owns the gap past its right edge too.
  const dropLeftStyle = useAnimatedStyle(() => ({ opacity: dropWeekGap.value === weekIndex ? 1 : 0 }));
  const dropRightStyle = useAnimatedStyle(() => ({
    opacity: props.isLast && dropWeekGap.value === weekIndex + 1 ? 1 : 0,
  }));

  return (
    <View style={{ width: props.columnWidth, opacity: props.isDimmed ? 0.35 : 1 }}>
      <GridDragHandle axis="x" onTap={onTap} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}>
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
            {column.numberOfDays} days
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
      <Animated.View
        pointerEvents="none"
        style={[
          dropLeftStyle,
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: -2,
            width: 3,
            borderRadius: 2,
            backgroundColor: Tailwind_semantic().icon.purple,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          dropRightStyle,
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            right: -2,
            width: 3,
            borderRadius: 2,
            backgroundColor: Tailwind_semantic().icon.purple,
          },
        ]}
      />
    </View>
  );
});

interface IGridRowProps {
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
  onLaneDragStart: (rowIndex: number, laneIndex: number) => void;
  onLaneDragMove: (rowIndex: number, laneIndex: number, translationY: number) => void;
  onLaneDragEnd: (commit: boolean) => void;
  draggedRow: SharedValue<number>;
  dropBoundary: SharedValue<number>;
  draggedLaneRow: SharedValue<number>;
  draggedLane: SharedValue<number>;
  dropLaneRow: SharedValue<number>;
  dropLaneGap: SharedValue<number>;
  ghostY: SharedValue<number>;
}

const GridRow = memo(function GridRow(props: IGridRowProps): JSX.Element {
  const rem = useRem();
  const { grid, rowIndex, lanes, rowHeight } = props;
  const row = grid.rows[rowIndex];
  const labelHeight = DAY_LABEL_HEIGHT * rem;
  const addHeight = ADD_ROW_HEIGHT * rem;
  const isCollapsed = props.isCollapsed;

  // The whole day drag is owned here rather than by the grid: a state update in the parent
  // re-renders every row, and gesture-handler cancels a pan whose subtree is rebuilt under the
  // finger — measured at ~57ms after the drag started, one update in.
  const { geometryRef, onMoveDayRow, draggedRow, dropBoundary } = props;
  // No state changes at all until the finger lifts: any re-render of this subtree while the pan is
  // live gets it cancelled by gesture-handler (measured — cancelled 57ms in, after one update). The
  // ref carries the drop target, and the shared values carry the feedback.
  const dayDragToRef = useRef<number | undefined>(undefined);

  const onSelectDay = props.onSelectDay;
  const onTapDay = useCallback(() => onSelectDay(rowIndex), [onSelectDay, rowIndex]);

  const ghostY = props.ghostY;
  const onDragStartDay = useCallback(() => {
    dayDragToRef.current = rowIndex;
    draggedRow.value = rowIndex;
    dropBoundary.value = -1;
    ghostY.value = geometryRef.current[rowIndex]?.top ?? 0;
  }, [rowIndex, draggedRow, dropBoundary, geometryRef, ghostY]);

  const onDragMoveDay = useCallback(
    (translationY: number) => {
      const heights = geometryRef.current;
      ghostY.value = (heights[rowIndex]?.top ?? 0) + translationY;
      let to = rowIndex;
      let travelled = 0;
      const step = translationY > 0 ? 1 : -1;
      // Accumulate the neighbours' own heights, so rows of different sizes each need their own
      // distance travelled before the drop target moves past them.
      for (let i = rowIndex + step; i >= 0 && i < heights.length; i += step) {
        travelled += (heights[i]?.outerHeight ?? 0) / 2 + (heights[i - step]?.outerHeight ?? 0) / 2;
        if (Math.abs(translationY) < travelled) {
          break;
        }
        to = i;
      }
      dayDragToRef.current = to;
      // Dragging down, the row lands *after* its destination once it has been lifted out, so the
      // gap is one further along than the index; dragging up, index and gap coincide.
      dropBoundary.value = to === rowIndex ? -1 : to > rowIndex ? to + 1 : to;
    },
    [geometryRef, rowIndex, dropBoundary, ghostY]
  );

  const onDragEndDay = useCallback(
    (commit: boolean) => {
      const to = dayDragToRef.current;
      dayDragToRef.current = undefined;
      draggedRow.value = -1;
      dropBoundary.value = -1;
      if (commit && to != null && to !== rowIndex) {
        onMoveDayRow(rowIndex, to);
      }
    },
    [onMoveDayRow, rowIndex, draggedRow, dropBoundary]
  );

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
        marginBottom: MARGIN_BETWEEN_ROWS * rem,
      }}
    >
      {/* The day boxes sit behind the strips, which are translucent enough to keep the box edges
          readable where a strip spans several weeks. Drawing them in front instead would put a
          line through the exercise names. */}
      <View className="absolute inset-0 flex-row">
        {grid.columns.map((column) => {
          const error = ProgramGrid_errorAt(grid, rowIndex, column.weekIndex);
          const exists = row.weekIndexes.indexOf(column.weekIndex) !== -1;
          return (
            <View key={column.weekIndex} style={{ width: props.columnWidth, padding: DAY_BOX_INSET * rem }}>
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
          const exists = row.weekIndexes.indexOf(column.weekIndex) !== -1;
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
                      onDragStart={onDragStartDay}
                      onDragMove={onDragMoveDay}
                      onDragEnd={onDragEndDay}
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
              style={{ width: props.columnWidth, paddingHorizontal: CELL_INSET_X * rem }}
              className="justify-center"
            >
              {row.weekIndexes.indexOf(column.weekIndex) !== -1 && (
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
            left: CELL_INSET_X * rem,
            right: CELL_INSET_X * rem,
            height: 3,
            borderRadius: 2,
            backgroundColor: Tailwind_semantic().icon.purple,
          },
        ]}
      />
    </View>
  );
});

// A run can never end before it starts, nor past the last week. The row being ragged doesn't
// constrain it — a repeat simply stops at the last week that has this day.
function clampWeek(grid: IProgramGrid, placement: IProgramGridPlacement, deltaWeeks: number): number {
  return Math.max(placement.colStart, Math.min(grid.columns.length - 1, placement.colEnd + deltaWeeks));
}

interface ILaneRowProps {
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
  onLaneDragStart: (rowIndex: number, laneIndex: number) => void;
  onLaneDragMove: (rowIndex: number, laneIndex: number, translationY: number) => void;
  onLaneDragEnd: (commit: boolean) => void;
}

const LaneRow = memo(function LaneRow(props: ILaneRowProps): JSX.Element {
  const rem = useRem();
  const { grid, rowIndex, laneIndex, onLaneDragStart, onLaneDragMove } = props;
  // Stable for the same reason the day handlers are: a rebuilt gesture drops the drag.
  const onDragStartLane = useCallback(
    () => onLaneDragStart(rowIndex, laneIndex),
    [onLaneDragStart, rowIndex, laneIndex]
  );
  const onDragMoveLane = useCallback(
    (dy: number) => onLaneDragMove(rowIndex, laneIndex, dy),
    [onLaneDragMove, rowIndex, laneIndex]
  );
  // Held here rather than at the top so a drag only re-renders its own lane.
  const [resize, setResize] = useState<{ id: string; deltaWeeks: number } | undefined>(undefined);
  const segments = useMemo(() => {
    const placements = grid.placements.filter((p) => p.rowIndex === rowIndex && p.laneIndex === laneIndex);
    const result: { placement?: IProgramGridPlacement; span: number }[] = [];
    let weekIndex = 0;
    while (weekIndex < grid.columns.length) {
      const placement = placements.find((p) => p.colStart === weekIndex);
      if (placement != null) {
        result.push({ placement, span: placement.colEnd - placement.colStart + 1 });
        weekIndex = placement.colEnd + 1;
      } else {
        result.push({ span: 1 });
        weekIndex += 1;
      }
    }
    return result;
  }, [grid.placements, grid.columns.length, rowIndex, laneIndex]);

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
        props.onSetRepeatRange(placement, clampWeek(grid, placement, current.deltaWeeks));
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
      : props.columnWidth *
          (1 +
            (resize?.id === lastPlacement.id
              ? clampWeek(grid, lastPlacement, resize.deltaWeeks)
              : lastPlacement.colEnd)) -
        CELL_INSET_X * rem -
        RESIZE_HANDLE_WIDTH * rem;

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
                    ? clampWeek(grid, segment.placement, resize.deltaWeeks) - segment.placement.colStart + 1
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
          width={RESIZE_HANDLE_WIDTH * rem}
          columnWidth={props.columnWidth}
          onResize={onResizeStart}
          onResizeEnd={onResizeEnd}
          left={resizeLeft}
          top={CELL_INSET_Y * rem}
          height={props.laneHeight - 2 * CELL_INSET_Y * rem}
        />
      )}
    </View>
  );
});

interface IGridCellProps {
  placement: IProgramGridPlacement;
  width: number;
  height: number;
  density: IProgramGridDensity;
  selection?: IProgramGridSelection;
  onSelect: (placementId: string) => void;
  isResizing: boolean;
}

const GridCell = memo(function GridCell(props: IGridCellProps): JSX.Element {
  const rem = useRem();
  const { placement, selection } = props;
  const scheme = ProgramGrid_cellScheme(placement, props.density);
  const isSelected = selection?.selectedIds.has(placement.id) ?? false;
  const isLinked = selection?.linkedIds.has(placement.id) ?? false;
  const isRelated = ProgramGrid_isRelated(selection, placement.id);
  // Saturated enough to hold their own against the warm day box behind them — the paler purple and
  // grey went muddy on yellow. Resolved values rather than `bg-*` classes so a utility that the
  // scanner never emitted can't silently fall back to transparent; these still follow the theme.
  const background = placement.isOverride
    ? Tailwind_semantic().background.yellowdark
    : placement.isTemplate
      ? Tailwind_semantic().border.prominent
      : Tailwind_semantic().background.cardpurpleselected;
  // Each border is a couple of steps darker than its own fill in light mode and lighter in dark, so
  // strips keep a defined edge against both the fill and the day box behind them. The override's is
  // heavier still — it has to read as a punch-in, not just another card.
  const borderColor = placement.isOverride
    ? Tailwind_semantic().text.cardyellowsubtle
    : placement.isTemplate
      ? Tailwind_semantic().text.secondary
      : Tailwind_semantic().text.purple;
  const built = useMemo(() => {
    // The domain half of the syntax palette (reps/weight/rpe/timer/auto) rather than the generic
    // Lezer tags the editor uses — same language, and these are toned for reading on a card.
    const colorByKind: Record<IProgramGridTokenKind, string> = {
      setPart: Tailwind_semantic().syntax.reps,
      weight: Tailwind_semantic().syntax.weight,
      rpe: Tailwind_semantic().syntax.rpe,
      timer: Tailwind_semantic().syntax.timer,
      auto: Tailwind_semantic().syntax.auto,
      separator: Tailwind_semantic().text.secondary,
    };
    const builder = new StyledText();
    for (const token of scheme) {
      builder.add(token.text, { color: colorByKind[token.kind] });
    }
    return builder.build();
  }, [scheme]);

  return (
    <Pressable
      style={{
        width: props.width,
        height: props.height,
        paddingHorizontal: CELL_INSET_X * rem,
        paddingVertical: CELL_INSET_Y * rem,
        // Unrelated strips recede rather than disappear — the shape of the program stays readable
        // while the reuse relationship is what stands out.
        opacity: isRelated ? 1 : 0.3,
      }}
      testID={`grid-cell-${placement.fullName}-${placement.colStart}`}
      onPress={() => props.onSelect(placement.id)}
    >
      <View
        className="flex-1 overflow-hidden rounded"
        style={{
          borderColor: isSelected || isLinked || props.isResizing ? Tailwind_semantic().icon.purple : borderColor,
          borderWidth: isSelected || props.isResizing ? 2 : placement.isOverride ? 2 : 1,
          borderStyle: placement.isTemplate ? "dashed" : "solid",
        }}
      >
        {/* The fill is translucent so the day boxes underneath stay visible through a strip that
            spans several of them. On web an absolutely positioned sibling paints above in-flow
            ones, so the content needs to be positioned too to stay on top. */}
        {/* Opacity via style, not an `opacity-*` class: the utility is only emitted if the scanner
            happens to generate that step, and a missing one silently renders fully opaque. */}
        <View className="absolute inset-0" style={{ opacity: 0.85, backgroundColor: background }} />
        <View className="relative justify-center flex-1 px-2">
          <Text
            className={`text-xs font-bold ${placement.isTemplate ? "text-text-secondary" : "text-text-primary"}`}
            numberOfLines={1}
          >
            {placement.isReuser ? "↳ " : ""}
            {placement.fullName}
            {placement.isTemplate ? " ·tmpl" : ""}
          </Text>
          {placement.isReuser ? (
            // A reuser's resolved numbers vary week to week; the strip is a pointer, so the numbers
            // live in the source's cells (see the grid RFC's run-length rule).
            <Text className="text-xs text-text-secondary" numberOfLines={1}>
              reuses {placement.reuseOf}
            </Text>
          ) : (
            built.text !== "" && (
              <FastText
                text={built.text}
                fragments={built.fragments}
                numberOfLines={1}
                fontSize={StyledText_remToPx("xs", rem)}
              />
            )
          )}
        </View>
      </View>
    </Pressable>
  );
});
