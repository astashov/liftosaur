import { JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, LayoutChangeEvent, useWindowDimensions } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { Pressable } from "../primitives/pressable";
import { IEvaluatedProgram } from "../../models/program";
import { ISettings } from "../../types";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { useRem } from "../../utils/useRem";
import { StringUtils_pluralize } from "../../utils/string";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";
import { useGridPinch } from "./gridPinch";
import {
  IProgramGrid,
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
import { useGridSelectionPublish } from "./gridSelectionContext";
import { IconPlus2 } from "../icons/iconPlus2";
import { GridResizeHandle } from "./gridResizeHandle";
import { ProgramGridTransforms_setRepeatRange } from "../../pages/planner/models/programGridTransforms";

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
const RESIZE_HANDLE_WIDTH = 1;

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

  const plannerDispatch = props.plannerDispatch;
  const onChangeScale = useCallback(
    (newScale: number) => {
      plannerDispatch(lb<IPlannerState>().p("ui").p("gridScale").record(newScale), `Change grid scale to ${newScale}`);
    },
    [plannerDispatch]
  );
  const { Wrap } = useGridPinch({ scale, onScaleChange: onChangeScale });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selection = useMemo(() => ProgramGrid_select(grid, selectedIds), [grid, selectedIds]);
  // Tapping is a toggle, so multi-select needs no mode to enter or leave: tap to add, tap again to
  // drop, tap the background to clear.
  const onSelect = useCallback((placementId: string) => {
    setSelectedIds((current) =>
      current.indexOf(placementId) !== -1 ? current.filter((id) => id !== placementId) : [...current, placementId]
    );
  }, []);
  const onClearSelection = useCallback(() => setSelectedIds([]), []);

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
        .recordModify((weeks) => [...weeks, { name: `Week ${weeks.length + 1}`, days: [] }]),
      "Add new week"
    );
  }, [plannerDispatch]);

  const publishSelection = useGridSelectionPublish();
  const payload = useMemo(
    () =>
      selection != null
        ? {
            placements: selection.placements,
            onEdit: onEditPlacement,
            onDuplicate: onDuplicatePlacement,
            onDelete: onDeletePlacements,
            onClear: onClearSelection,
          }
        : undefined,
    [selection, onEditPlacement, onDuplicatePlacement, onDeletePlacements, onClearSelection]
  );
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
          {/* RN presses don't bubble, so a tap that lands on a cell selects it and a tap that
              lands anywhere else falls through to here and clears. */}
          <Pressable className="flex-row" onPress={onClearSelection}>
            <View style={{ width: totalWidth }}>
              <WeekHeaderRow grid={grid} columnWidth={columnWidth} />
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
                />
              ))}
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
          </Pressable>
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

const WeekHeaderRow = memo(function WeekHeaderRow(props: { grid: IProgramGrid; columnWidth: number }): JSX.Element {
  return (
    <View className="flex-row border-b border-border-neutral">
      {props.grid.columns.map((column) => (
        <View key={column.weekIndex} className="px-2 py-2" style={{ width: props.columnWidth }}>
          <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>
            {column.name}
          </Text>
          <Text className="text-xs text-text-secondary" numberOfLines={1}>
            {column.numberOfDays} days
          </Text>
        </View>
      ))}
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
}

const GridRow = memo(function GridRow(props: IGridRowProps): JSX.Element {
  const rem = useRem();
  const { grid, rowIndex } = props;
  const row = grid.rows[rowIndex];
  const lanes = useMemo(() => {
    const laneIndexes = grid.placements.filter((p) => p.rowIndex === rowIndex).map((p) => p.laneIndex);
    return laneIndexes.length > 0 ? Math.max(...laneIndexes) + 1 : 0;
  }, [grid.placements, rowIndex]);
  const labelHeight = 1.5 * rem;
  // The row is taller than its content by the box's own padding, so the last strip clears the
  // bottom edge by the same gap it keeps from the sides.
  const addHeight = ADD_ROW_HEIGHT * rem;
  const rowHeight = labelHeight + lanes * props.laneHeight + addHeight + BOTTOM_GAP * rem;

  return (
    <View style={{ height: rowHeight }} className="mb-1">
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
                <View
                  className={`flex-1 border rounded border-border-prominent ${
                    error != null ? "bg-background-lighterror" : "bg-background-cardyellow"
                  }`}
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
          return (
            <View key={column.weekIndex} className="justify-center px-[0.5rem]" style={{ width: props.columnWidth }}>
              <Text
                className={`text-xs ${error != null ? "font-bold text-text-error" : "text-text-secondary"}`}
                numberOfLines={1}
              >
                {error != null ? "⚠ " : ""}
                {name ?? ""}
              </Text>
            </View>
          );
        })}
      </View>
      {Array.from({ length: lanes }, (_, laneIndex) => (
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
        />
      ))}
      {/* One per week rather than one per row: adding an exercise targets a specific week's day,
          and a ragged week that lacks this day gets no button at all. */}
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
}

const LaneRow = memo(function LaneRow(props: ILaneRowProps): JSX.Element {
  const { grid, rowIndex, laneIndex } = props;
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
  const lastPlacementId = useMemo(() => {
    const withPlacement = segments.filter((s) => s.placement != null);
    return withPlacement[withPlacement.length - 1]?.placement?.id;
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

  return (
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
            columnWidth={props.columnWidth}
            isResizing={resize?.id === segment.placement.id}
            onResize={
              segment.placement.id === lastPlacementId
                ? (deltaWeeks) => setResize({ id: segment.placement!.id, deltaWeeks })
                : undefined
            }
            onResizeEnd={onResizeEnd}
          />
        ) : (
          <View key={i} style={{ width: props.columnWidth * segment.span, height: props.laneHeight }} />
        )
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
  columnWidth: number;
  isResizing: boolean;
  // Absent when this run isn't the lane's last, which is the only one whose end can move.
  onResize?: (deltaWeeks: number) => void;
  onResizeEnd: () => void;
}

const GridCell = memo(function GridCell(props: IGridCellProps): JSX.Element {
  const rem = useRem();
  const { placement, selection } = props;
  const scheme = ProgramGrid_cellScheme(placement, props.density);
  const isSelected = selection?.selectedIds.has(placement.id) ?? false;
  const isLinked = selection?.linkedIds.has(placement.id) ?? false;
  const isRelated = ProgramGrid_isRelated(selection, placement.id);
  const didResizeRef = useRef(false);
  const onResize = props.onResize;
  const onResizeStart = useCallback(
    (deltaWeeks: number) => {
      didResizeRef.current = true;
      onResize?.(deltaWeeks);
    },
    [onResize]
  );
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
      // The handle sits inside this Pressable, so letting go after a drag would otherwise read as a
      // tap and select the strip you were only resizing.
      onPress={() => {
        if (didResizeRef.current) {
          didResizeRef.current = false;
          return;
        }
        props.onSelect(placement.id);
      }}
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
        {props.onResize != null && (
          <GridResizeHandle
            width={RESIZE_HANDLE_WIDTH * rem}
            columnWidth={props.columnWidth}
            onResize={onResizeStart}
            onResizeEnd={props.onResizeEnd}
          />
        )}
      </View>
    </Pressable>
  );
});
