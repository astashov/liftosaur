import { JSX, memo, useCallback, useMemo } from "react";
import { View, ScrollView } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { Pressable } from "../primitives/pressable";
import { IEvaluatedProgram } from "../../models/program";
import { ISettings } from "../../types";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { useRem } from "../../utils/useRem";
import { StringUtils_pluralize } from "../../utils/string";
import {
  IProgramGrid,
  IProgramGridDensity,
  IProgramGridPlacement,
  IProgramGridTokenKind,
  ProgramGrid_build,
  ProgramGrid_cellScheme,
  ProgramGrid_errorAt,
} from "../../pages/planner/models/programGrid";
import { FastText } from "../primitives/fastText";
import { StyledText, StyledText_remToPx } from "../../utils/styledText";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

const COLUMN_WIDTH_BY_DENSITY: Record<IProgramGridDensity, number> = { 0: 6, 1: 9.5, 2: 14 };
const DENSITY_LABELS: Record<IProgramGridDensity, string> = { 0: "S", 1: "M", 2: "L" };
const LANE_HEIGHT_BY_DENSITY: Record<IProgramGridDensity, number> = { 0: 2, 1: 3.25, 2: 3.25 };
// Grid gutters, in rem. A day box is inset from its column by DAY_BOX_INSET (so neighbouring boxes
// are separated by twice that), and a strip is inset by CELL_INSET — the difference between them is
// the breathing room *inside* the box, and BOTTOM_GAP keeps the same room under the last strip.
const DAY_BOX_INSET = 0.1875;
const CELL_INSET_X = 0.4375;
const CELL_INSET_Y = 0.1875;
const BOTTOM_GAP = 0.25;

interface IEditProgramGridProps {
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
  density: IProgramGridDensity;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export const EditProgramGrid = memo(function EditProgramGrid(props: IEditProgramGridProps): JSX.Element {
  const rem = useRem();
  const { evaluatedProgram, settings, density } = props;
  const grid = useMemo(() => ProgramGrid_build(evaluatedProgram, settings), [evaluatedProgram, settings]);
  const columnWidth = COLUMN_WIDTH_BY_DENSITY[density] * rem;
  const totalWidth = columnWidth * grid.columns.length;

  const onChangeDensity = useCallback(
    (newDensity: IProgramGridDensity) => {
      props.plannerDispatch(
        lb<IPlannerState>().p("ui").p("gridDensity").record(newDensity),
        `Change grid density to ${newDensity}`
      );
    },
    [props]
  );

  return (
    <View className="pb-4">
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-xs text-text-secondary">
          {grid.counts.weeks} {StringUtils_pluralize("week", grid.counts.weeks)} · {grid.counts.exercises}{" "}
          {StringUtils_pluralize("exercise", grid.counts.exercises)}
          {grid.counts.templates > 0
            ? ` · ${grid.counts.templates} ${StringUtils_pluralize("template", grid.counts.templates)}`
            : ""}
        </Text>
        <View className="flex-row items-center">
          {([0, 1, 2] as IProgramGridDensity[]).map((d) => (
            <Pressable
              key={d}
              className={`px-2 py-1 ml-1 rounded nm-grid-density-${d}`}
              testID={`grid-density-${d}`}
              onPress={() => onChangeDensity(d)}
            >
              <Text className={`text-xs ${d === density ? "font-bold text-text-link" : "text-text-secondary"}`}>
                {DENSITY_LABELS[d]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ width: totalWidth }}>
          <WeekHeaderRow grid={grid} columnWidth={columnWidth} />
          {grid.rows.map((row) => (
            <GridRow
              key={row.rowIndex}
              grid={grid}
              rowIndex={row.rowIndex}
              columnWidth={columnWidth}
              laneHeight={LANE_HEIGHT_BY_DENSITY[density] * rem}
              density={density}
            />
          ))}
        </View>
      </ScrollView>
      <Text className="px-4 pt-2 text-xs text-text-secondary">Weeks and days never reorder</Text>
    </View>
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
  const rowHeight = labelHeight + lanes * props.laneHeight + BOTTOM_GAP * rem;

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
        />
      ))}
    </View>
  );
});

interface ILaneRowProps {
  grid: IProgramGrid;
  rowIndex: number;
  laneIndex: number;
  columnWidth: number;
  laneHeight: number;
  density: IProgramGridDensity;
}

const LaneRow = memo(function LaneRow(props: ILaneRowProps): JSX.Element {
  const { grid, rowIndex, laneIndex } = props;
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

  return (
    <View className="flex-row">
      {segments.map((segment, i) =>
        segment.placement != null ? (
          <GridCell
            key={i}
            placement={segment.placement}
            width={props.columnWidth * segment.span}
            height={props.laneHeight}
            density={props.density}
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
}

const GridCell = memo(function GridCell(props: IGridCellProps): JSX.Element {
  const rem = useRem();
  const { placement } = props;
  const scheme = ProgramGrid_cellScheme(placement, props.density);
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
    <View
      style={{
        width: props.width,
        height: props.height,
        paddingHorizontal: CELL_INSET_X * rem,
        paddingVertical: CELL_INSET_Y * rem,
      }}
    >
      <View
        className="flex-1 overflow-hidden rounded"
        style={{
          borderColor,
          borderWidth: placement.isOverride ? 2 : 1,
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
    </View>
  );
});
