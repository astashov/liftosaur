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
  ProgramGrid_build,
  ProgramGrid_cellText,
  ProgramGrid_errorAt,
} from "../../pages/planner/models/programGrid";

const COLUMN_WIDTH_BY_DENSITY: Record<IProgramGridDensity, number> = { 0: 6, 1: 9.5, 2: 14 };
const DENSITY_LABELS: Record<IProgramGridDensity, string> = { 0: "S", 1: "M", 2: "L" };
const LANE_HEIGHT_BY_DENSITY: Record<IProgramGridDensity, number> = { 0: 2, 1: 3.25, 2: 3.25 };

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
  const { grid, rowIndex } = props;
  const row = grid.rows[rowIndex];
  const lanes = useMemo(() => {
    const laneIndexes = grid.placements.filter((p) => p.rowIndex === rowIndex).map((p) => p.laneIndex);
    return laneIndexes.length > 0 ? Math.max(...laneIndexes) + 1 : 0;
  }, [grid.placements, rowIndex]);

  return (
    <View className="border-b border-border-neutral">
      <View className="flex-row bg-background-subtle">
        {grid.columns.map((column) => {
          const name = row.namePerWeek[column.weekIndex];
          const error = ProgramGrid_errorAt(grid, rowIndex, column.weekIndex);
          return (
            <View key={column.weekIndex} className="px-2 py-1" style={{ width: props.columnWidth }}>
              <Text
                className={`text-xs ${error != null ? "text-text-error font-bold" : "text-text-secondary"}`}
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
  const { placement } = props;
  const text = ProgramGrid_cellText(placement, props.density);
  const background = placement.isOverride
    ? "bg-background-cardyellow"
    : placement.isTemplate
      ? "bg-background-subtle"
      : "bg-background-cardpurple";
  const border = placement.isOverride ? "border-border-cardyellow" : "border-border-purple";
  return (
    <View style={{ width: props.width, height: props.height }} className="p-1">
      <View
        className={`flex-1 justify-center px-2 border rounded ${background} ${border}`}
        style={placement.isTemplate ? { borderStyle: "dashed" } : undefined}
      >
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
          text !== "" && (
            <Text className="text-xs text-text-purple" numberOfLines={1}>
              {text}
            </Text>
          )
        )}
      </View>
    </View>
  );
});
