import { JSX, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/text";
import { LineChart } from "../lineChart";
import { useGraphActiveCursor } from "../graphLegendOverlay";
import { ILiftographDuration, ILiftographWidget } from "../../liftograph/liftographCompile";
import { LiftographEngine_evaluateWidget } from "../../liftograph/liftographEngine";
import { ILiftographSeriesEval } from "../../liftograph/liftographSeriesEval";
import {
  LiftographChartData_build,
  LiftographChartData_numericWindow,
  LiftographChartData_rangeLabel,
  LiftographChartData_ranges,
  LiftographChartData_readout,
  LiftographChartData_toggleHidden,
  LiftographChartData_window,
} from "../../liftograph/liftographChartData";
import { MathUtils_formatCompact } from "../../utils/math";
import { DashboardCard } from "./dashboardCard";
import { DashboardNotice } from "./dashboardNotice";

const CHART_HEIGHT = 176;

export function DashboardGraph(props: {
  id: string;
  widget: Extract<ILiftographWidget, { kind: "graph" }>;
  evaluation: ILiftographSeriesEval;
}): JSX.Element {
  const { widget, evaluation } = props;
  const [rangeOverride, setRangeOverride] = useState<ILiftographDuration | undefined>(undefined);
  const [hidden, setHidden] = useState<number[]>([]);
  const range = rangeOverride ?? widget.range;
  const { cursorIdx, chartRef, handleCursorChange } = useGraphActiveCursor(props.id);
  const chart = useMemo(() => {
    const result = LiftographEngine_evaluateWidget(widget, evaluation, rangeOverride);
    return result.type === "graph" ? LiftographChartData_build(result, evaluation.input.settings) : undefined;
  }, [widget, evaluation, rangeOverride]);
  if (chart == null) {
    return <DashboardNotice caption={widget.caption} message="This graph can't be shown" isError />;
  }
  const readout = LiftographChartData_readout(chart, cursorIdx, hidden);
  const window =
    chart.xMode === "time"
      ? LiftographChartData_window(range, evaluation.input.today)
      : LiftographChartData_numericWindow(chart);
  const rangeLabel = LiftographChartData_rangeLabel(range);
  return (
    <DashboardCard caption={widget.caption} testID="dashboard-graph">
      <View className="flex-row flex-wrap gap-2 mb-2">
        {chart.series.map((series) => {
          const isHidden = hidden.indexOf(series.id) !== -1;
          return (
            <Pressable
              key={series.id}
              testID="dashboard-graph-legend"
              className={`flex-row items-center px-3 py-1 border rounded-full border-border-neutral ${
                isHidden ? "opacity-50" : ""
              }`}
              onPress={() => setHidden(LiftographChartData_toggleHidden(hidden, series.id))}
            >
              <View className="w-2 h-2 mr-2 rounded-full" style={{ backgroundColor: series.color }} />
              <Text className={`text-xs ${isHidden ? "line-through" : ""}`}>{series.label}</Text>
              {series.axis === "right" ? (
                <Text className="ml-1 text-xs text-text-secondarysubtle">right axis</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {chart.errors.map((error, index) => (
        <Text key={index} className="mb-1 text-xs text-text-error">
          {error.name != null ? `${error.name}: ` : ""}
          {error.message}
        </Text>
      ))}
      <LineChart
        ref={chartRef}
        data={chart.data}
        series={chart.series.map((series) => ({ ...series, show: hidden.indexOf(series.id) === -1 }))}
        height={CHART_HEIGHT}
        xMode={chart.xMode}
        xMin={window.xMin}
        xMax={window.xMax}
        maxInitialSpan={Infinity}
        viewportKey={rangeLabel}
        onCursorChange={handleCursorChange}
        yAxisFormatter={(v) => MathUtils_formatCompact(v)}
      />
      <View className="flex-row flex-wrap items-baseline mt-1">
        <Text className={`mr-3 text-xs ${cursorIdx == null ? "text-text-secondarysubtle" : "font-semibold"}`}>
          {readout.label}
        </Text>
        {readout.values.map((value, index) => (
          <Text key={index} className="mr-3 text-xs" style={{ color: value.color }}>
            {value.name}{" "}
            <Text className="text-sm font-semibold" style={{ color: value.color }}>
              {value.value}
            </Text>
          </Text>
        ))}
      </View>
      <View className="flex-row p-0.5 mt-2 rounded-lg bg-background-neutral">
        {LiftographChartData_ranges.map((option) => {
          const label = LiftographChartData_rangeLabel(option);
          const isActive = label === rangeLabel;
          return (
            <Pressable
              key={label}
              testID={`dashboard-graph-range-${label}`}
              className={`items-center flex-1 py-1.5 rounded-md ${isActive ? "bg-background-default" : ""}`}
              onPress={() => setRangeOverride(option)}
            >
              <Text className={`text-xs ${isActive ? "font-semibold text-text-purple" : "text-text-secondary"}`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </DashboardCard>
  );
}
