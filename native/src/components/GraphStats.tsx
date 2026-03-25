import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LineChart } from "./LineChart";
import { Stats_name } from "@shared/models/stats";
import { DateUtils_format } from "@shared/utils/date";
import { Tailwind_colors, Tailwind_semantic } from "@shared/utils/tailwindConfig";
import type { IStatsKey, IUnit, ILengthUnit, IPercentageUnit } from "@shared/types";

interface IProps {
  collection: [number, number][];
  units: IUnit | ILengthUnit | IPercentageUnit;
  statsKey: IStatsKey;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  movingAverageWindowSize?: number;
  width: number;
  title?: string | null;
}

export function GraphStats(props: IProps): React.ReactElement {
  const colors = Tailwind_colors();
  const sem = Tailwind_semantic();
  const { movingAverageWindowSize } = props;

  const chartData = useMemo(() => {
    const timestamps: number[] = [];
    const values: number[] = [];
    const movingAvg: number[] = [];

    for (let i = 0; i < props.collection.length; i++) {
      const [t, v] = props.collection[i];
      timestamps.push(t);
      values.push(v);

      if (movingAverageWindowSize != null) {
        if (i >= movingAverageWindowSize - 1) {
          const sum = values.slice(i - movingAverageWindowSize + 1, i + 1).reduce((a, b) => a + b, 0);
          movingAvg.push(Math.round((sum / movingAverageWindowSize) * 10) / 10);
        } else {
          movingAvg.push(v);
        }
      }
    }

    const data: (number | null)[][] = [timestamps, values];
    if (movingAverageWindowSize != null) {
      data.push(movingAvg);
    }
    return data;
  }, [props.collection, movingAverageWindowSize]);

  const dataMaxX = chartData[0]?.[chartData[0].length - 1] || new Date(0).getTime() / 1000;
  const dataMinX = Math.max((chartData[0]?.[0] as number) || 0, (dataMaxX as number) - 365 * 24 * 60 * 60);
  const allMaxX = props.maxX;
  const allMinX = Math.max(props.minX, allMaxX - 365 * 24 * 60 * 60);

  const series = useMemo(
    () => {
      const s = [
        {
          color: colors.red[500],
          label: props.statsKey === "weight" ? "Weight" : props.statsKey === "bodyfat" ? "Percentage" : "Size",
          show: true,
        },
      ];
      if (movingAverageWindowSize != null) {
        s.push({ color: colors.blue[500], label: "Moving Average", show: true });
      }
      return s;
    },
    [props.statsKey, movingAverageWindowSize, colors]
  );

  const [tooltipData, setTooltipData] = useState<{
    date: Date;
    value: number | null;
    avg: number | null;
  } | null>(null);

  const handleCursorChange = useCallback(
    (index: number | null) => {
      if (index == null) {
        setTooltipData(null);
        return;
      }
      const timestamp = chartData[0][index];
      if (timestamp == null) {
        setTooltipData(null);
        return;
      }
      setTooltipData({
        date: new Date((timestamp as number) * 1000),
        value: chartData[1][index] as number | null,
        avg: chartData[2]?.[index] as number | null ?? null,
      });
    },
    [chartData]
  );

  const displayTitle = props.title === undefined ? Stats_name(props.statsKey) : props.title || undefined;

  return (
    <View style={styles.container}>
      <LineChart
        width={props.width}
        height={240}
        data={chartData}
        series={series}
        minX={props.isSameXAxis ? allMinX : dataMinX}
        maxX={props.isSameXAxis ? allMaxX : dataMaxX}
        onCursorChange={handleCursorChange}
        formatY={(v) => `${Math.round(v * 10) / 10}`}
        title={displayTitle ?? undefined}
      />
      {tooltipData && tooltipData.value != null && (
        <View style={styles.tooltip}>
          <Text style={[styles.tooltipText, { color: sem.text.primary }]}>
            {DateUtils_format(tooltipData.date)},{" "}
            <Text style={styles.bold}>{tooltipData.value}</Text> {props.units}
            {movingAverageWindowSize != null && tooltipData.avg != null && (
              <Text> (Avg. {tooltipData.avg} {props.units})</Text>
            )}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  tooltip: {
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tooltipText: {
    fontSize: 13,
    textAlign: "center",
  },
  bold: {
    fontWeight: "700",
  },
});
