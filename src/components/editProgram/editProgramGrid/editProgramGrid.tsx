import { JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  useWindowDimensions,
} from "react-native";
import { lb } from "lens-shmens";
import { useSharedValue } from "react-native-reanimated";
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
import {
  ProgramGrid_build,
  ProgramGrid_counts,
  ProgramGrid_weekDayCount,
} from "../../../pages/planner/models/programGrid";
import {
  GRID_DAY_BOX_INSET,
  GRID_DAY_LABEL_HEIGHT,
  IGridGeometryRow,
  ProgramGridGeometry_build,
  ProgramGridGeometry_metrics,
  ProgramGridGeometry_totalHeight,
  ProgramGridGeometry_weekLaneNames,
} from "../../../pages/planner/models/programGridGeometry";
import { useGridSelectionPublish, IGridSelectionTarget } from "./gridSelectionContext";
import { useGridPinch } from "./gridPinch";
import { useGridDragAutoScroll } from "./gridDragAutoScroll";
import { useGridActions } from "./useGridActions";
import { useGridSelectionState } from "./useGridSelectionState";
import { useGridLaneDrag } from "./useGridLaneDrag";
import { WeekHeaderRow } from "./gridWeekHeaderRow";
import { GridRow } from "./gridRow";
import { GridDragGhost, GridWeekGhost } from "./gridDragGhost";
import { AddButton } from "./gridAddButton";

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
// programGridGeometry, the edits in programGridTransforms via useGridActions, and each drag in
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
  const { columnWidth, totalWidth, laneHeight, density, scale } = ProgramGridGeometry_metrics({
    weekCount: grid.columns.length,
    containerWidth,
    scale: props.scale,
    rem,
  });

  const plannerDispatch = props.plannerDispatch;
  const onChangeScale = useCallback(
    (newScale: number) => {
      plannerDispatch(lb<IPlannerState>().p("ui").p("gridScale").record(newScale), `Change grid scale to ${newScale}`);
    },
    [plannerDispatch]
  );
  const { Wrap } = useGridPinch({ scale, onScaleChange: onChangeScale });

  // The grid scrolls sideways inside its own ScrollView and downwards inside the screen's, so a
  // drag that runs off an edge has two different scrollers to ask, depending on its axis.
  const horizontalScrollRef = useRef<ScrollView | null>(null);
  const horizontalViewportRef = useRef<View | null>(null);
  const horizontalOffsetRef = useRef(0);
  const onHorizontalScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    horizontalOffsetRef.current = e.nativeEvent.contentOffset.x;
  }, []);
  // The "+ Week" button sits past the last column, so the content is one column wider than the grid.
  const contentWidthRef = useRef(totalWidth + columnWidth);
  contentWidthRef.current = totalWidth + columnWidth;
  const containerWidthRef = useRef(containerWidth);
  containerWidthRef.current = containerWidth;
  const maxHorizontalScroll = useCallback(() => Math.max(0, contentWidthRef.current - containerWidthRef.current), []);
  const autoScroll = useGridDragAutoScroll({
    horizontalRef: horizontalScrollRef,
    horizontalViewportRef,
    horizontalOffsetRef,
    maxHorizontalScroll,
  });

  const { selectedDayRow, selectedWeek, selection, onSelect, onSelectDay, onSelectWeek, onClear } =
    useGridSelectionState(grid);

  const actions = useGridActions({
    grid,
    evaluatedProgram,
    settings,
    programId: props.programId,
    dispatch: props.dispatch,
    plannerDispatch,
    onStructuralChange: onClear,
  });

  const [collapsedRows, setCollapsedRows] = useState<number[]>([]);
  const onToggleCollapsed = useCallback((rowIndex: number) => {
    setCollapsedRows((current) =>
      current.indexOf(rowIndex) !== -1 ? current.filter((r) => r !== rowIndex) : [...current, rowIndex]
    );
  }, []);

  // Read only from drag handlers, which run long after the render that wrote it — a ref rather than
  // a value so a handler sees the current layout without being rebuilt when it changes, since
  // rebuilding a gesture's callbacks mid-drag drops the drag.
  const geometryRef = useRef<IGridGeometryRow[]>([]);
  const geometry = useMemo(
    () => ProgramGridGeometry_build(grid, collapsedRows, laneHeight, rem),
    [grid, collapsedRows, laneHeight, rem]
  );
  geometryRef.current = geometry;
  const laneHeightRef = useRef(laneHeight);
  laneHeightRef.current = laneHeight;
  const rowsHeight = ProgramGridGeometry_totalHeight(geometry);
  const weekLaneNames = useMemo(() => ProgramGridGeometry_weekLaneNames(grid, geometry), [grid, geometry]);

  // One ghost position per axis, shared by whichever drag is live — only one can be.
  const ghostY = useSharedValue(0);
  const ghostX = useSharedValue(0);
  const draggedRow = useSharedValue(-1);
  const dropBoundary = useSharedValue(-1);
  const draggedWeek = useSharedValue(-1);
  const dropWeekGap = useSharedValue(-1);

  const laneDrag = useGridLaneDrag({
    geometryRef,
    laneHeightRef,
    ghostY,
    autoScroll,
    onReorderExercisesInDay: actions.onReorderExercisesInDay,
    onMoveExerciseToDay: actions.onMoveExerciseToDay,
  });

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
            dayCount: ProgramGrid_weekDayCount(grid, selectedWeek),
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
          onEdit: actions.onEditPlacement,
          onDuplicate: actions.onDuplicatePlacement,
          onDelete: actions.onDeletePlacements,
          onDuplicateDay: actions.onDuplicateDay,
          onDeleteDay: actions.onDeleteDay,
          onDuplicateWeek: actions.onDuplicateWeek,
          onDeleteWeek: actions.onDeleteWeek,
          onClear: onClear,
        }
      : undefined;
  }, [
    grid.placements,
    selection,
    selectedDayRow,
    dayRow,
    selectedWeek,
    weekColumn,
    actions.onEditPlacement,
    actions.onDuplicatePlacement,
    actions.onDeletePlacements,
    actions.onDuplicateDay,
    actions.onDeleteDay,
    actions.onDuplicateWeek,
    actions.onDeleteWeek,
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
            <View style={{ width: totalWidth }}>
              <WeekHeaderRow
                grid={grid}
                columnWidth={columnWidth}
                selectedWeek={selectedWeek}
                onSelectWeek={onSelectWeek}
                onMoveWeek={actions.onMoveWeek}
                draggedWeek={draggedWeek}
                dropWeekGap={dropWeekGap}
                ghostX={ghostX}
                autoScroll={autoScroll}
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
                    onAddExercise={actions.onAddExercise}
                    onSetRepeatRange={actions.onSetRepeatRange}
                    onSelectDay={onSelectDay}
                    onToggleCollapsed={onToggleCollapsed}
                    isCollapsed={collapsedRows.indexOf(row.rowIndex) !== -1}
                    isDaySelected={selectedDayRow === row.rowIndex}
                    isDayDimmed={selectedDayRow != null && selectedDayRow !== row.rowIndex}
                    geometryRef={geometryRef}
                    lanes={geometry[row.rowIndex].laneNames.length}
                    rowHeight={geometry[row.rowIndex].height}
                    onMoveDayRow={actions.onMoveDayRow}
                    onLaneDragStart={laneDrag.onLaneDragStart}
                    onLaneDragMove={laneDrag.onLaneDragMove}
                    onLaneDragEnd={laneDrag.onLaneDragEnd}
                    draggedRow={draggedRow}
                    dropBoundary={dropBoundary}
                    draggedLaneRow={laneDrag.draggedLaneRow}
                    draggedLane={laneDrag.draggedLane}
                    dropLaneRow={laneDrag.dropLaneRow}
                    dropLaneGap={laneDrag.dropLaneGap}
                    ghostY={ghostY}
                    autoScroll={autoScroll}
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
                      labelHeight={GRID_DAY_LABEL_HEIGHT * rem}
                      laneHeight={laneHeight}
                      draggedRow={draggedRow}
                      draggedLaneRow={laneDrag.draggedLaneRow}
                      draggedLane={laneDrag.draggedLane}
                      ghostY={ghostY}
                    />
                  ))}
                {Platform.OS !== "web" &&
                  grid.columns.map((column) => (
                    <GridWeekGhost
                      key={column.weekIndex}
                      weekIndex={column.weekIndex}
                      name={column.name}
                      numberOfDays={ProgramGrid_weekDayCount(grid, column.weekIndex)}
                      columnWidth={columnWidth}
                      height={rowsHeight}
                      rows={geometry}
                      dayNames={grid.rows.map((row) => row.namePerWeek[column.weekIndex])}
                      laneNames={weekLaneNames[column.weekIndex]}
                      labelHeight={GRID_DAY_LABEL_HEIGHT * rem}
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
            <View style={{ width: columnWidth, padding: GRID_DAY_BOX_INSET * rem }}>
              <AddButton label="Week" testID="grid-add-week" onPress={actions.onAddWeek} />
            </View>
          </View>
        </ScrollView>
      </Wrap>
      <Text className="px-4 pt-2 text-xs text-text-secondary">Long-press a day, an exercise or a week to move it</Text>
    </View>
  );
});
