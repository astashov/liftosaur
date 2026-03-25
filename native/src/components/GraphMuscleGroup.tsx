import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LineChart, type ILineChartVerticalLine } from "./LineChart";
import { Muscle_getMuscleGroupName } from "@shared/models/muscle";
import { StringUtils_capitalize } from "@shared/utils/string";
import { DateUtils_format } from "@shared/utils/date";
import { Tailwind_colors, Tailwind_semantic } from "@shared/utils/tailwindConfig";
import type { ISettings, IVolumeSelectedType } from "@shared/types";

interface IProps {
  data: [number[], number[], number[]];
  programChangeTimes?: [number, string][];
  muscleGroup: string;
  settings: ISettings;
  initialType?: IVolumeSelectedType;
  width: number;
}

export function GraphMuscleGroup(props: IProps): React.ReactElement {
  const [selectedType, setSelectedType] = useState<IVolumeSelectedType>(props.initialType || "volume");
  const colors = Tailwind_colors();
  const sem = Tailwind_semantic();
  const { data } = props;

  const dataMaxX = data[0]?.[data[0].length - 1] || new Date(0).getTime() / 1000;
  const dataMinX = Math.max(data[0]?.[0] || 0, dataMaxX - 365 * 24 * 60 * 60);

  const verticalLines: ILineChartVerticalLine[] | undefined = props.programChangeTimes
    ? props.programChangeTimes.map(([x, label]) => ({ x, label }))
    : undefined;

  const series = useMemo(
    () => [
      { color: colors.red[500], label: "Volume", show: selectedType === "volume" },
      { color: colors.red[500], label: "Sets", show: selectedType === "sets" },
    ],
    [selectedType, colors]
  );

  const formatY = useCallback(
    (v: number) => {
      if (selectedType === "volume") {
        return `${Math.round(v / 1000)}k`;
      }
      return String(Math.round(v));
    },
    [selectedType]
  );

  const [tooltipData, setTooltipData] = useState<{
    date: Date;
    volume: number | null;
    sets: number | null;
  } | null>(null);

  const handleCursorChange = useCallback(
    (index: number | null) => {
      if (index == null) {
        setTooltipData(null);
        return;
      }
      const timestamp = data[0][index];
      if (timestamp == null) {
        setTooltipData(null);
        return;
      }
      setTooltipData({
        date: new Date(timestamp * 1000),
        volume: data[1][index],
        sets: data[2][index],
      });
    },
    [data]
  );

  const title = `${Muscle_getMuscleGroupName(props.muscleGroup, props.settings)} Weekly ${StringUtils_capitalize(selectedType)}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View />
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setSelectedType("volume")}
            style={[styles.toggleBtn, selectedType === "volume" && { backgroundColor: sem.background.neutral }]}
          >
            <Text style={[styles.toggleText, { color: sem.text.primary }]}>Volume</Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedType("sets")}
            style={[styles.toggleBtn, selectedType === "sets" && { backgroundColor: sem.background.neutral }]}
          >
            <Text style={[styles.toggleText, { color: sem.text.primary }]}>Sets</Text>
          </Pressable>
        </View>
      </View>
      <LineChart
        width={props.width}
        height={240}
        data={data}
        series={series}
        minX={dataMinX}
        maxX={dataMaxX}
        verticalLines={verticalLines}
        onCursorChange={handleCursorChange}
        formatY={formatY}
        title={title}
      />
      {tooltipData && (
        <View style={styles.tooltip}>
          {selectedType === "volume" && tooltipData.volume != null && (
            <Text style={[styles.tooltipText, { color: sem.text.primary }]}>
              {DateUtils_format(tooltipData.date)}, Volume:{" "}
              <Text style={styles.bold}>
                {tooltipData.volume} {props.settings.units}s
              </Text>
            </Text>
          )}
          {selectedType === "sets" && tooltipData.sets != null && (
            <Text style={[styles.tooltipText, { color: sem.text.primary }]}>
              {DateUtils_format(tooltipData.date)}, Sets: <Text style={styles.bold}>{tooltipData.sets}</Text>
            </Text>
          )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 4,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  toggleText: {
    fontSize: 12,
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
