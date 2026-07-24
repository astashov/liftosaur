import { JSX, useMemo } from "react";
import { View } from "react-native";
import { LineChart, ILineChartSeries } from "../../components/lineChart";
import { GraphLegendOverlay, useGraphActiveCursor } from "../../components/graphLegendOverlay";
import { MathUtils_formatCompact } from "../../utils/math";
import { Text } from "../../components/primitives/text";

interface IPlannerGraphProps {
  id: string;
  title: string;
  yAxisLabel: string;
  color: string;
  height?: string;
  data: [number[], number[]];
}

function parseHeight(height?: string): number {
  if (!height) {
    return 160;
  }
  const match = height.match(/^([\d.]+)(em|rem|px)?$/);
  if (!match) {
    return 160;
  }
  const value = parseFloat(match[1]);
  const unit = match[2] || "px";
  if (unit === "em" || unit === "rem") {
    return value * 16;
  }
  return value;
}

export function PlannerGraph(props: IPlannerGraphProps): JSX.Element {
  const height = parseHeight(props.height);
  const series: ILineChartSeries[] = useMemo(
    () => [{ label: props.yAxisLabel, color: props.color, show: true }],
    [props.yAxisLabel, props.color]
  );
  const xAxisTicks = useMemo(() => props.data[0], [props.data]);
  const { cursorIdx, chartRef, handleCursorChange, onCloseOverlay, overlayVisible } = useGraphActiveCursor(props.id);

  const week = cursorIdx != null ? props.data[0][cursorIdx] : null;
  const value = cursorIdx != null ? props.data[1][cursorIdx] : null;

  return (
    <View className="relative" testID="graph" data-testid="graph">
      <View testID="graph-data" data-testid="graph-data">
        <View className="items-center pt-1">
          <Text className="text-xs text-text-primary">{props.title}</Text>
        </View>
        <LineChart
          ref={chartRef}
          data={props.data}
          series={series}
          height={height}
          xMode="linear"
          xAxisTicks={xAxisTicks}
          xAxisFormatter={(v) => `${v}`}
          yAxisFormatter={(v) => MathUtils_formatCompact(v)}
          yAxisWidth={32}
          onCursorChange={handleCursorChange}
        />
        <GraphLegendOverlay visible={overlayVisible} onClose={onCloseOverlay}>
          {week != null && value != null && (
            <Text className="text-sm">
              Week {week}, {props.yAxisLabel}: <Text className="text-sm font-bold">{value}</Text>
            </Text>
          )}
        </GraphLegendOverlay>
      </View>
    </View>
  );
}
