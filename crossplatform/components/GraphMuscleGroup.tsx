import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
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

  const series = [
    { color: colors.red[500], label: "Volume", show: selectedType === "volume" },
    { color: colors.red[500], label: "Sets", show: selectedType === "sets" },
  ];

  const [tooltipData, setTooltipData] = useState<{
    date: Date;
    volume: number | null;
    sets: number | null;
  } | null>(null);

  function handleCursorChange(index: number | null): void {
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
  }

  const title = `${Muscle_getMuscleGroupName(props.muscleGroup, props.settings)} Weekly ${StringUtils_capitalize(selectedType)}`;

  return (
    <View className="mx-1 mb-2">
      <View className="flex-row justify-end items-center px-3 pt-2">
        <View className="flex-row gap-1">
          <Pressable
            onPress={() => setSelectedType("volume")}
            className={`px-2 py-1 rounded ${selectedType === "volume" ? "bg-background-neutral" : ""}`}
          >
            <Text className="text-xs text-text-primary">Volume</Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedType("sets")}
            className={`px-2 py-1 rounded ${selectedType === "sets" ? "bg-background-neutral" : ""}`}
          >
            <Text className="text-xs text-text-primary">Sets</Text>
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
        formatY={(v) => (selectedType === "volume" ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
        title={title}
      />
      {tooltipData && (
        <View className="px-8 pt-2 pb-1">
          {selectedType === "volume" && tooltipData.volume != null && (
            <Text className="text-sm text-center text-text-primary">
              {DateUtils_format(tooltipData.date)}, Volume:{" "}
              <Text className="font-bold">
                {tooltipData.volume} {props.settings.units}s
              </Text>
            </Text>
          )}
          {selectedType === "sets" && tooltipData.sets != null && (
            <Text className="text-sm text-center text-text-primary">
              {DateUtils_format(tooltipData.date)}, Sets: <Text className="font-bold">{tooltipData.sets}</Text>
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
