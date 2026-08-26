import { JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  View,
  ScrollView,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  useWindowDimensions,
} from "react-native";
import { lb } from "lens-shmens";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { IEvaluatedProgram } from "../../../models/program";
import { ISettings } from "../../../types";
import { IPlannerState } from "../../../pages/planner/models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { useRem } from "../../../utils/useRem";
import { StringUtils_pluralize } from "../../../utils/string";
import { usePerfRenderCount } from "../../../utils/usePerfRenderCount";
import { IDispatch } from "../../../ducks/types";
import { ProgramGrid_build, ProgramGrid_counts } from "../../../pages/planner/models/programGrid";
import {
  GRID_ADD_WEEK_WIDTH,
  GRID_DAY_BOX_INSET,
  GRID_DAY_LABEL_HEIGHT,
  ProgramGridGeometry_build,
  ProgramGridGeometry_metrics,
} from "../../../pages/planner/models/programGridGeometry";
import { useGridSelectionPublish, IGridSelectionTarget } from "./gridSelectionContext";
import { useGridPinch } from "./gridPinch";
import { useGridActions } from "./useGridActions";
import { useGridNavigation } from "./useGridNavigation";
import { useGridSelectionState } from "./useGridSelectionState";
import { useGridDragAutoScroll } from "./gridDragAutoScroll";
import { IGridActiveGhost, useGridDrags } from "./useGridDrags";
import { WeekHeaderRow } from "./gridWeekHeaderRow";
import { GridRow } from "./gridRow";
import { GridDragGhost, GridWeekGhost } from "./gridDragGhost";
import { AddButton, VerticalAddButton } from "./gridAddButton";
import { useGridStickyHeader } from "./useGridStickyHeader";
import { useGridEditDetails } from "./useGridEditDetails";

// Scale presets for the zoom control; pinch fills in everything between them.
const SCALE_PRESETS: { label: string; scale: number }[] = [
  { label: "S", scale: 0.6 },
  { label: "M", scale: 1 },
  { label: "L", scale: 1.5 },
];

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

// The whole calendar view. This file is composition only: the layout maths lives in
// programGridGeometry, the edits in plannerStructure via useGridActions, and each drag in
// useGridDragSession — see lambda/scripts/archdocs/program-grid.md.
export const EditProgramGrid = memo(function EditProgramGrid(props: IEditProgramGridProps): JSX.Element {
  usePerfRenderCount("EditProgramGrid");
  const rem = useRem();
  const { evaluatedProgram, settings } = props;
  const grid = useMemo(() => ProgramGrid_build(evaluatedProgram, settings), [evaluatedProgram, settings]);
  const counts = useMemo(() => ProgramGrid_counts(grid), [grid]);
  const windowWidth = useWindowDimensions().width;
  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const onLayout = useCallback((e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width), []);
  // What a live pinch is showing, before it is worth writing down. The committed scale is the
  // remembered one — it outlives the screen — so the preview only ever shadows it, and a preset
  // clears the shadow so the committed value wins again.
  const [previewScale, setPreviewScale] = useState<number | undefined>(undefined);
  const { columnWidth, totalWidth, laneHeight, showScheme, scale } = ProgramGridGeometry_metrics({
    weekCount: grid.columns.length,
    containerWidth,
    scale: previewScale ?? props.scale,
    rem,
  });

  const plannerDispatch = props.plannerDispatch;
  const onCommitScale = useCallback(
    (newScale: number) => {
      plannerDispatch(lb<IPlannerState>().p("ui").p("gridScale").record(newScale), `Change grid scale to ${newScale}`);
    },
    [plannerDispatch]
  );
  const onChangeScale = useCallback(
    (newScale: number) => {
      setPreviewScale(undefined);
      onCommitScale(newScale);
    },
    [onCommitScale]
  );
  const { Wrap } = useGridPinch({ scale, onScalePreview: setPreviewScale, onScaleCommit: onCommitScale });

  const { selectedDayRows, selectedWeek, selection, selectedLanes, onSelect, onSelectDay, onSelectWeek, onClear } =
    useGridSelectionState(grid);

  // Two hooks on purpose: everything that changes the program goes through `actions`, and every one
  // of those goes through a transform. `navigation` changes what is on screen and never touches the
  // program text.
  const navigation = useGridNavigation({
    grid,
    evaluatedProgram,
    settings,
    programId: props.programId,
    dispatch: props.dispatch,
    plannerDispatch,
  });

  const actions = useGridActions({
    grid,
    evaluatedProgram,
    settings,
    plannerDispatch,
    onStructuralChange: onClear,
  });

  const editDetails = useGridEditDetails({
    grid,
    onSetWeekDetails: actions.onSetWeekDetails,
    onSetDayDetails: actions.onSetDayDetails,
  });

  const [collapsedRows, setCollapsedRows] = useState<number[]>([]);
  const onToggleCollapsed = useCallback((rowIndex: number) => {
    setCollapsedRows((current) =>
      current.indexOf(rowIndex) !== -1 ? current.filter((r) => r !== rowIndex) : [...current, rowIndex]
    );
  }, []);

  const geometry = useMemo(
    () => ProgramGridGeometry_build(grid, collapsedRows, laneHeight, rem),
    [grid, collapsedRows, laneHeight, rem]
  );

  // Every drag's shared values, refs and edge-scrolling live together in one hook rather than in
  // this component's state — see useGridDrags. What comes back is a bus the rows and columns read,
  // plus the exercise drag, which is the one the grid owns because it can cross rows.
  // The scroller belongs to this component, so its refs live here and go into auto-scroll rather
  // than onto the drag bus. The "+ Week" rail sits past the last column, so the content is that
  // much wider than the grid.
  const horizontalScrollRef = useRef<ScrollView | null>(null);
  const horizontalViewportRef = useRef<View | null>(null);
  const horizontalOffsetRef = useRef(0);
  const onHorizontalScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    horizontalOffsetRef.current = e.nativeEvent.contentOffset.x;
  }, []);
  const contentWidthRef = useRef(0);
  contentWidthRef.current = totalWidth + GRID_ADD_WEEK_WIDTH * rem;
  const containerWidthRef = useRef(0);
  containerWidthRef.current = containerWidth;
  const maxHorizontalScroll = useCallback(() => Math.max(0, contentWidthRef.current - containerWidthRef.current), []);
  const autoScroll = useGridDragAutoScroll({
    horizontalRef: horizontalScrollRef,
    horizontalViewportRef,
    horizontalOffsetRef,
    maxHorizontalScroll,
  });

  const sticky = useGridStickyHeader();

  // Only the ghosts get this, never a row: setting it re-renders the grid at the moment a pan goes
  // live, and every row has to fall through its memo untouched for the pan to survive.
  const [activeGhost, setActiveGhost] = useState<IGridActiveGhost | undefined>(undefined);

  const drags = useGridDrags({
    grid,
    geometry,
    laneHeight,
    selectedDayRows,
    selectedLanes,
    autoScroll,
    onGhostActive: setActiveGhost,
    onReorderExercisesInDay: actions.onReorderExercisesInDay,
    onMoveExercisesToDay: actions.onMoveExercisesToDay,
  });

  const publishSelection = useGridSelectionPublish();
  const weekColumn = selectedWeek != null ? grid.columns[selectedWeek] : undefined;
  const payload = useMemo(() => {
    const target: IGridSelectionTarget | undefined =
      selectedWeek != null && weekColumn != null
        ? {
            kind: "week",
            weekIndex: selectedWeek,
            name: weekColumn.name,
            description: weekColumn.description,
          }
        : selectedDayRows.length > 0
          ? {
              kind: "day",
              rowIndexes: selectedDayRows,
              // One day is named; several are counted, because a list of names is what the dock has
              // the least room for and the least use of.
              name:
                selectedDayRows.length === 1
                  ? (grid.rows[selectedDayRows[0]]?.namePerWeek.find((n) => n != null) ??
                    `Day ${selectedDayRows[0] + 1}`)
                  : `${selectedDayRows.length} days`,
              description:
                selectedDayRows.length === 1
                  ? grid.rows[selectedDayRows[0]]?.descriptionPerWeek.find((d) => d != null)
                  : undefined,
              placements: grid.placements.filter((p) => selectedDayRows.indexOf(p.rowIndex) !== -1),
            }
          : selection != null
            ? { kind: "exercises", placements: selection.placements }
            : undefined;
    return target != null
      ? {
          target,
          onEdit: navigation.onEditPlacement,
          onDuplicate: navigation.onDuplicatePlacement,
          onDelete: actions.onDeletePlacements,
          onDuplicateDays: actions.onDuplicateDays,
          onDeleteDays: actions.onDeleteDays,
          onDuplicateWeek: actions.onDuplicateWeek,
          onDeleteWeek: actions.onDeleteWeek,
          onEditWeek: editDetails.onEditWeek,
          onEditDay: editDetails.onEditDay,
          onClear: onClear,
        }
      : undefined;
  }, [
    grid,
    selection,
    selectedDayRows,
    selectedWeek,
    weekColumn,
    navigation.onEditPlacement,
    navigation.onDuplicatePlacement,
    actions.onDeletePlacements,
    actions.onDuplicateDays,
    actions.onDeleteDays,
    actions.onDuplicateWeek,
    actions.onDeleteWeek,
    editDetails.onEditWeek,
    editDetails.onEditDay,
    onClear,
  ]);
  useEffect(() => {
    publishSelection(payload);
  }, [payload, publishSelection]);
  // Leaving the grid (mode switch, tab change) must take the dock with it.
  useEffect(() => () => publishSelection(undefined), [publishSelection]);

  return (
    <View className="pb-4" onLayout={onLayout} ref={horizontalViewportRef}>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-xs text-text-secondary">
          {counts.weeks} {StringUtils_pluralize("week", counts.weeks)} · {counts.exercises}{" "}
          {StringUtils_pluralize("exercise", counts.exercises)}
          {counts.templates > 0 ? ` · ${counts.templates} ${StringUtils_pluralize("template", counts.templates)}` : ""}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          ref={horizontalScrollRef}
          onScroll={onHorizontalScroll}
          scrollEventThrottle={16}
        >
          {/* Deliberately not a Pressable for tap-to-clear. A day name is a gesture detector rather
              than a Pressable, so it does not consume the touch from an ancestor Pressable: the tap
              would select the day and the background would immediately clear it, and the same
              ancestor competed with the long-press drag. Clearing lives on the dock's ✕ and on
              tapping a selected thing again. */}
          <View className="flex-row">
            <View style={{ width: totalWidth }} ref={sticky.containerRef} onLayout={sticky.onContainerLayout}>
              {/* Rides down with the scroll to stay at the top of the grid, and paints over the rows
                  it slides across — so it needs a background of its own and an order above them. */}
              <Animated.View
                className="bg-background-default"
                onLayout={sticky.onHeaderLayout}
                style={{ transform: [{ translateY: sticky.translateY }], zIndex: 2 }}
              >
                <WeekHeaderRow
                  grid={grid}
                  columnWidth={columnWidth}
                  selectedWeek={selectedWeek}
                  onSelectWeek={onSelectWeek}
                  onMoveWeek={actions.onMoveWeek}
                  drags={drags}
                />
                {/* Inside the header rather than over the grid: a week ghost is its name, and this
                    is the row of names it is being dragged among. */}
                {Platform.OS !== "web" &&
                  grid.columns.map((column) => (
                    <GridWeekGhost
                      key={column.weekIndex}
                      weekIndex={column.weekIndex}
                      name={column.name}
                      columnWidth={columnWidth}
                      draggedWeek={drags.draggedWeek}
                      ghostX={drags.ghostX}
                      activeGhost={activeGhost}
                    />
                  ))}
              </Animated.View>
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
                    showScheme={showScheme}
                    selection={selection}
                    onSelect={onSelect}
                    onAddExercise={navigation.onAddExercise}
                    onSetRepeatRange={actions.onSetRepeatRange}
                    onSelectDay={onSelectDay}
                    onToggleCollapsed={onToggleCollapsed}
                    isCollapsed={collapsedRows.indexOf(row.rowIndex) !== -1}
                    isDaySelected={selectedDayRows.indexOf(row.rowIndex) !== -1}
                    isDayDimmed={selectedDayRows.length > 0 && selectedDayRows.indexOf(row.rowIndex) === -1}
                    lanes={geometry[row.rowIndex].laneNames.length}
                    rowHeight={geometry[row.rowIndex].height}
                    onMoveDayRows={actions.onMoveDayRows}
                    drags={drags}
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
                      top={geometry[row.rowIndex].top}
                      labelHeight={GRID_DAY_LABEL_HEIGHT * rem}
                      laneHeight={laneHeight}
                      draggedRows={drags.draggedRows}
                      draggedLanes={drags.draggedLanes}
                      ghostY={drags.ghostY}
                      activeGhost={activeGhost}
                    />
                  ))}
              </View>
              <View className="flex-row">
                {grid.columns.map((column) => (
                  <View
                    key={column.weekIndex}
                    style={{ width: columnWidth, padding: GRID_DAY_BOX_INSET * rem }}
                    className="justify-center"
                  >
                    <AddButton
                      label="Day"
                      testID={`grid-add-day-${column.weekIndex}`}
                      onPress={() => actions.onAddDay(column.weekIndex)}
                    />
                  </View>
                ))}
              </View>
            </View>
            <View style={{ width: GRID_ADD_WEEK_WIDTH * rem, padding: GRID_DAY_BOX_INSET * rem }}>
              <VerticalAddButton label="Week" testID="grid-add-week" onPress={actions.onAddWeek} />
            </View>
          </View>
        </ScrollView>
      </Wrap>
      <Text className="px-4 pt-2 text-xs text-text-secondary">Long-press a day, an exercise or a week to move it</Text>
    </View>
  );
});
