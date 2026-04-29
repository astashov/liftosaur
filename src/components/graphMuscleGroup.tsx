import { JSX, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Select } from "./primitives/select";
import { ISettings, IVolumeSelectedType } from "../types";
import { StringUtils_capitalize } from "../utils/string";
import { DateUtils_format } from "../utils/date";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { Muscle_getMuscleGroupName } from "../models/muscle";
import { LineChart, ILineChartSeries } from "./lineChart";

interface IGraphMuscleGroupProps {
  id?: string;
  data: [number[], number[], number[]];
  programChangeTimes?: [number, string][];
  muscleGroup: string;
  settings: ISettings;
  initialType?: IVolumeSelectedType;
}

export function GraphMuscleGroup(props: IGraphMuscleGroupProps): JSX.Element {
  const [selectedType, setSelectedType] = useState<IVolumeSelectedType>(props.initialType || "volume");
  const [cursorIdx, setCursorIdx] = useState<number | null>(null);

  const series: ILineChartSeries[] = useMemo(
    () => [
      {
        label: "Volume",
        show: selectedType === "volume",
        color: Tailwind_colors().red[500],
        width: 1.5,
      },
      {
        label: "Sets",
        show: selectedType === "sets",
        color: Tailwind_colors().red[500],
        width: 1.5,
      },
    ],
    [selectedType]
  );

  const yAxisFormatter = useMemo(() => {
    if (selectedType === "volume") {
      return (v: number) => `${Math.round(v / 1000)}k`;
    }
    return (v: number) => `${Math.round(v)}`;
  }, [selectedType]);

  const title = `${Muscle_getMuscleGroupName(props.muscleGroup, props.settings)} Weekly ${StringUtils_capitalize(
    selectedType
  )}`;

  const timestamp = cursorIdx != null ? props.data[0][cursorIdx] : null;
  const volume = cursorIdx != null ? props.data[1][cursorIdx] : null;
  const sets = cursorIdx != null ? props.data[2][cursorIdx] : null;
  const units = props.settings.units;

  return (
    <View className="relative" testID="graph" data-testid="graph">
      <View testID="graph-data" data-testid="graph-data">
        <View className="flex-row items-center mb-1">
          <View className="flex-1">
            <Text className="text-lg font-semibold leading-6 text-left u-title">{title}</Text>
          </View>
          <View>
            <Select
              value={selectedType}
              onChange={(v) => setSelectedType(v as IVolumeSelectedType)}
              options={[
                { value: "volume", label: "Volume" },
                { value: "sets", label: "Sets" },
              ]}
              className="p-2 text-right bg-background-default"
            />
          </View>
        </View>
        <View className="relative">
          <LineChart
            data={props.data}
            series={series}
            height={320}
            programLines={props.programChangeTimes}
            onCursorChange={setCursorIdx}
            yAxisFormatter={yAxisFormatter}
          />
          <View className="box-content items-center px-8 pt-8 pb-2" style={{ minHeight: 40 }}>
            {timestamp != null && selectedType === "volume" && volume != null && (
              <Text className="text-sm">
                {DateUtils_format(new Date(timestamp * 1000))}, Volume:{" "}
                <Text className="text-sm font-bold">
                  {volume} {units}s
                </Text>
              </Text>
            )}
            {timestamp != null && selectedType === "sets" && sets != null && (
              <Text className="text-sm">
                {DateUtils_format(new Date(timestamp * 1000))}, Sets: <Text className="text-sm font-bold">{sets}</Text>
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
