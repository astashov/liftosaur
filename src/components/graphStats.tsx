import { JSX, memo, useMemo } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { CollectionUtils_sort } from "../utils/collection";
import { ILengthUnit, ISettings, IStatsHealthKey, IStatsHealthValue, IStatsKey, IUnit } from "../types";
import { Stats_name } from "../models/stats";
import { DateUtils_format } from "../utils/date";
import { IPercentageUnit } from "../types";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { LineChart, ILineChartSeries } from "./lineChart";
import { GraphLegendOverlay, useGraphActiveCursor } from "./graphLegendOverlay";

interface IGraphStatsProps {
  id?: string;
  data: [number[], number[], number[]];
  units: IUnit | ILengthUnit | IPercentageUnit | string;
  statsKey: IStatsKey | IStatsHealthKey;
  settings: ISettings;
  title?: string | null;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  isInteractive?: boolean;
}

export function getHealthDataForGraph(coll: IStatsHealthValue[], key: IStatsHealthKey): [number, number][] {
  const sortedCollection = CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp);
  // Sleep is stored in minutes; graph it in hours so the axis stays readable.
  const divisor = key === "sleep" ? 60 : 1;
  return sortedCollection.map((i) => [i.timestamp / 1000, Math.round((i.value / divisor) * 10) / 10]);
}

function GraphStatsInner(props: IGraphStatsProps): JSX.Element {
  const { cursorIdx, chartRef, handleCursorChange, onCloseOverlay, overlayVisible } = useGraphActiveCursor(props.id);
  const data = props.data;
  const hasMovingAverage = data[2].length > 0;

  const series: ILineChartSeries[] = useMemo(() => {
    const label =
      props.statsKey === "weight"
        ? "Weight"
        : props.statsKey === "bodyfat"
          ? "Percentage"
          : props.statsKey === "sleep" || props.statsKey === "calories" || props.statsKey === "protein"
            ? Stats_name(props.statsKey)
            : "Size";
    const out: ILineChartSeries[] = [
      {
        label,
        show: true,
        color: Tailwind_colors().red[500],
        width: 1.5,
      },
    ];
    if (hasMovingAverage) {
      out.push({
        label: "Moving Average",
        show: true,
        color: Tailwind_colors().blue[500],
        width: 1.5,
      });
    }
    return out;
  }, [props.statsKey, hasMovingAverage]);

  const yearSec = 365 * 24 * 60 * 60;
  const xMin = props.isSameXAxis ? Math.max(props.minX, props.maxX - yearSec) : undefined;
  const xMax = props.isSameXAxis ? props.maxX : undefined;

  const title = props.title === undefined ? Stats_name(props.statsKey) : props.title || undefined;

  const timestamp = cursorIdx != null ? data[0][cursorIdx] : null;
  const value = cursorIdx != null ? data[1][cursorIdx] : null;
  const movingAvg = cursorIdx != null && hasMovingAverage ? Math.round(data[2][cursorIdx] * 10) / 10 : null;

  return (
    <View className="relative" testID="graph" data-testid="graph">
      <View testID="graph-data" data-testid="graph-data">
        {title && (
          <View className="mb-1">
            <Text className="text-lg font-semibold leading-scaled-6 text-left u-title">{title}</Text>
          </View>
        )}
        <View className="relative">
          <LineChart
            ref={chartRef}
            data={data}
            series={series}
            height={320}
            xMin={xMin}
            xMax={xMax}
            onCursorChange={handleCursorChange}
            yAxisFormatter={(v) => `${Math.round(v * 10) / 10}`}
            isInteractive={props.isInteractive}
          />
          <GraphLegendOverlay visible={overlayVisible} onClose={onCloseOverlay}>
            {timestamp != null && value != null && props.units != null && (
              <Text className="text-sm">
                {DateUtils_format(new Date(timestamp * 1000))}, <Text className="text-sm font-bold">{value}</Text>{" "}
                {props.units}
                {movingAvg != null && (
                  <Text className="text-sm text-text-secondary">
                    {" "}
                    (Avg. {movingAvg} {props.units})
                  </Text>
                )}
              </Text>
            )}
          </GraphLegendOverlay>
        </View>
      </View>
    </View>
  );
}

export const GraphStats = memo(GraphStatsInner);
