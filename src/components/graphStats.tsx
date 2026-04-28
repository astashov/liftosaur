import { JSX, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { CollectionUtils_sort } from "../utils/collection";
import { Weight_convertTo } from "../models/weight";
import {
  ILengthUnit,
  ISettings,
  IStatsKey,
  IStatsLengthValue,
  IStatsPercentageValue,
  IStatsWeightValue,
  IUnit,
} from "../types";
import { Length_convertTo } from "../models/length";
import { Stats_name } from "../models/stats";
import { DateUtils_format } from "../utils/date";
import { IPercentageUnit } from "../types";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { LineChart, ILineChartSeries } from "./lineChart";

interface IGraphStatsProps {
  id?: string;
  collection: [number, number][];
  units: IUnit | ILengthUnit | IPercentageUnit;
  statsKey: IStatsKey;
  settings: ISettings;
  title?: string | null;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  movingAverageWindowSize?: number;
}

export function getWeightDataForGraph(coll: IStatsWeightValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, Weight_convertTo(i.value, settings.units).value];
  });
}

export function getLengthDataForGraph(coll: IStatsLengthValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, Length_convertTo(i.value, settings.lengthUnits).value];
  });
}

export function getPercentageDataForGraph(coll: IStatsPercentageValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, i.value.value];
  });
}

export function GraphStats(props: IGraphStatsProps): JSX.Element {
  const [cursorIdx, setCursorIdx] = useState<number | null>(null);
  const movingAverageWindowSize = props.movingAverageWindowSize;

  const data = useMemo(() => {
    const result: [number[], number[], number[]] = [[], [], []];
    for (let index = 0; index < props.collection.length; index++) {
      const i = props.collection[index];
      result[0].push(i[0]);
      result[1].push(i[1]);
      if (movingAverageWindowSize != null) {
        if (index >= movingAverageWindowSize - 1) {
          let sum = 0;
          for (let j = index - movingAverageWindowSize + 1; j <= index; j++) {
            sum += result[1][j];
          }
          const movingAvg = sum / movingAverageWindowSize;
          result[2].push(Math.round(movingAvg * 10) / 10);
        } else {
          result[2].push(i[1]);
        }
      }
    }
    return result;
  }, [props.collection, movingAverageWindowSize]);

  const series: ILineChartSeries[] = useMemo(() => {
    const label = props.statsKey === "weight" ? "Weight" : props.statsKey === "bodyfat" ? "Percentage" : "Size";
    const out: ILineChartSeries[] = [
      {
        label,
        show: true,
        color: Tailwind_colors().red[500],
        width: 1.5,
      },
    ];
    if (movingAverageWindowSize != null) {
      out.push({
        label: "Moving Average",
        show: true,
        color: Tailwind_colors().blue[500],
        width: 1.5,
      });
    }
    return out;
  }, [props.statsKey, movingAverageWindowSize]);

  const yearSec = 365 * 24 * 60 * 60;
  const xMin = props.isSameXAxis ? Math.max(props.minX, props.maxX - yearSec) : undefined;
  const xMax = props.isSameXAxis ? props.maxX : undefined;

  const title = props.title === undefined ? Stats_name(props.statsKey) : props.title || undefined;

  const timestamp = cursorIdx != null ? data[0][cursorIdx] : null;
  const value = cursorIdx != null ? data[1][cursorIdx] : null;
  const movingAvg = cursorIdx != null && movingAverageWindowSize != null ? data[2][cursorIdx] : null;

  return (
    <View className="relative" testID="graph" data-testid="graph">
      <View testID="graph-data" data-testid="graph-data">
        {title && (
          <View className="mb-1">
            <Text className="text-lg font-semibold leading-6 u-title">{title}</Text>
          </View>
        )}
        <View className="relative">
          <LineChart
            data={data}
            series={series}
            height={320}
            xMin={xMin}
            xMax={xMax}
            onCursorChange={setCursorIdx}
            yAxisFormatter={(v) => `${Math.round(v * 10) / 10}`}
          />
          <View
            className={`box-content px-8 ${props.title === null ? "pt-2" : "pt-8"} pb-2 items-center`}
            style={{ minHeight: 24 }}
          >
            {timestamp != null && value != null && props.units != null && (
              <Text className="text-sm">
                {DateUtils_format(new Date(timestamp * 1000))}, <Text className="font-bold text-sm">{value}</Text>{" "}
                {props.units}
                {movingAvg != null && (
                  <Text className="text-sm text-text-secondary">
                    {" "}
                    (Avg. {movingAvg} {props.units})
                  </Text>
                )}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
