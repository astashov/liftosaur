import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LineChart, type ILineChartVerticalLine } from "./LineChart";
import { GraphData_exerciseData } from "@shared/models/graphData";
import { Exercise_get, equipmentName, Exercise_eq } from "@shared/models/exercise";
import { Weight_isOrPct, Weight_display } from "@shared/models/weight";
import { DateUtils_format } from "@shared/utils/date";
import { ObjectUtils_keys } from "@shared/utils/object";
import { Tailwind_colors, Tailwind_semantic } from "@shared/utils/tailwindConfig";
import type { IHistoryRecord, IExerciseType, ISettings, IExerciseSelectedType } from "@shared/types";

interface IProps {
  history: IHistoryRecord[];
  isWithOneRm?: boolean;
  isWithProgramLines?: boolean;
  exercise: IExerciseType;
  settings: ISettings;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  bodyweightData?: [number, number][];
  initialType?: IExerciseSelectedType;
  width: number;
  onGoToWorkout?: (historyRecord: IHistoryRecord) => void;
}

export function GraphExercise(props: IProps): React.ReactElement {
  const [selectedType, setSelectedType] = useState<IExerciseSelectedType>(props.initialType || "weight");
  const exercise = Exercise_get(props.exercise, props.settings.exercises);
  const eqName = equipmentName(props.exercise.equipment);
  const units = props.settings.units;
  const colors = Tailwind_colors();
  const sem = Tailwind_semantic();

  const result = useMemo(
    () => GraphData_exerciseData(props.history, props.exercise, props.settings, props.isWithOneRm, props.bodyweightData),
    [props.history, props.exercise, props.settings, props.isWithOneRm, props.bodyweightData]
  );

  const { data, changeProgramTimes, historyRecords } = result;
  const dataMaxX = data[0]?.[data[0].length - 1] || new Date(0).getTime() / 1000;
  const dataMinX = Math.max(data[0]?.[0] || 0, dataMaxX - 365 * 24 * 60 * 60);
  const allMaxX = props.maxX;
  const allMinX = Math.max(props.minX, allMaxX - 365 * 24 * 60 * 60);

  const verticalLines: ILineChartVerticalLine[] | undefined = props.isWithProgramLines
    ? changeProgramTimes.map(([x, label]) => ({ x, label }))
    : undefined;

  const series = useMemo(
    () => [
      { color: colors.red[500], label: "Weight", show: selectedType === "weight" },
      { color: colors.yellow[500], label: "Reps", show: false },
      { color: colors.blue[500], label: "e1RM", show: !!props.isWithOneRm && selectedType === "weight" },
      { color: colors.red[500], label: "Volume", show: selectedType === "volume" },
      { color: colors.green[500], label: "Bodyweight", show: !!props.bodyweightData },
    ],
    [selectedType, props.isWithOneRm, props.bodyweightData, colors]
  );

  const [tooltipData, setTooltipData] = useState<{
    date: Date;
    weight: number | null;
    reps: number | null;
    onerm: number | null;
    volume: number | null;
    bodyweight: number | null;
    historyRecord: IHistoryRecord | undefined;
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
        weight: data[1][index],
        reps: data[2][index],
        onerm: data[3][index],
        volume: data[4][index],
        bodyweight: data[5][index],
        historyRecord: historyRecords[timestamp],
      });
    },
    [data, historyRecords]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: sem.text.secondary }]}>{eqName}</Text>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setSelectedType("weight")}
            style={[styles.toggleBtn, selectedType === "weight" && { backgroundColor: sem.background.neutral }]}
          >
            <Text style={[styles.toggleText, { color: sem.text.primary }]}>Max Weight</Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedType("volume")}
            style={[styles.toggleBtn, selectedType === "volume" && { backgroundColor: sem.background.neutral }]}
          >
            <Text style={[styles.toggleText, { color: sem.text.primary }]}>Volume</Text>
          </Pressable>
        </View>
      </View>
      <LineChart
        width={props.width}
        height={240}
        data={data}
        series={series}
        minX={props.isSameXAxis ? allMinX : dataMinX}
        maxX={props.isSameXAxis ? allMaxX : dataMaxX}
        verticalLines={verticalLines}
        onCursorChange={handleCursorChange}
        formatY={(v) => `${Math.round(v)}`}
        title={exercise.name}
      />
      {tooltipData && (
        <TooltipContent
          data={tooltipData}
          selectedType={selectedType}
          units={units}
          isWithOneRm={props.isWithOneRm}
          exercise={props.exercise}
          onGoToWorkout={props.onGoToWorkout}
          sem={sem}
        />
      )}
    </View>
  );
}

function TooltipContent(props: {
  data: {
    date: Date;
    weight: number | null;
    reps: number | null;
    onerm: number | null;
    volume: number | null;
    bodyweight: number | null;
    historyRecord: IHistoryRecord | undefined;
  };
  selectedType: IExerciseSelectedType;
  units: string;
  isWithOneRm?: boolean;
  exercise: IExerciseType;
  onGoToWorkout?: (hr: IHistoryRecord) => void;
  sem: ReturnType<typeof Tailwind_semantic>;
}): React.ReactElement {
  const { data, selectedType, units, isWithOneRm, sem } = props;

  if (data.weight != null && selectedType === "weight") {
    return (
      <View style={styles.tooltip}>
        <Text style={[styles.tooltipText, { color: sem.text.primary }]}>
          {DateUtils_format(data.date)},{" "}
          <Text style={styles.bold}>{data.weight}</Text> {units}s x{" "}
          <Text style={styles.bold}>{data.reps}</Text> reps
          {isWithOneRm && data.onerm != null && (
            <Text>, e1RM = <Text style={styles.bold}>{data.onerm.toFixed(2)}</Text> {units}s</Text>
          )}
        </Text>
        {data.historyRecord && props.onGoToWorkout && (
          <Pressable onPress={() => props.onGoToWorkout!(data.historyRecord!)}>
            <Text style={[styles.workoutLink, { color: sem.text.link }]}>Workout</Text>
          </Pressable>
        )}
        <StateVars historyRecord={data.historyRecord} exercise={props.exercise} sem={sem} />
      </View>
    );
  }

  if (data.volume != null && selectedType === "volume") {
    return (
      <View style={styles.tooltip}>
        <Text style={[styles.tooltipText, { color: sem.text.primary }]}>
          {DateUtils_format(data.date)}, Volume: <Text style={styles.bold}>{data.volume} {units}s</Text>
        </Text>
        {data.historyRecord && props.onGoToWorkout && (
          <Pressable onPress={() => props.onGoToWorkout!(data.historyRecord!)}>
            <Text style={[styles.workoutLink, { color: sem.text.link }]}>Workout</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (data.bodyweight != null) {
    return (
      <View style={styles.tooltip}>
        <Text style={[styles.tooltipText, { color: sem.text.primary }]}>
          {DateUtils_format(data.date)}, Bodyweight - <Text style={styles.bold}>{data.bodyweight}</Text> {units}
        </Text>
      </View>
    );
  }

  return <View />;
}

function StateVars(props: {
  historyRecord: IHistoryRecord | undefined;
  exercise: IExerciseType;
  sem: ReturnType<typeof Tailwind_semantic>;
}): React.ReactElement | null {
  const { historyRecord, exercise, sem } = props;
  if (!historyRecord) return null;

  const entries = historyRecord.entries.filter((e) => Exercise_eq(e.exercise, exercise));
  const stateVars: string[] = [];
  for (const entry of entries) {
    for (const key of ObjectUtils_keys(entry.state || {})) {
      const value = entry.state?.[key];
      const displayValue = Weight_isOrPct(value) ? Weight_display(value) : String(value);
      stateVars.push(`${key}: ${displayValue}`);
    }
    for (const key of ObjectUtils_keys(entry.vars || {})) {
      const name = ({ rm1: "1 Rep Max" } as Record<string, string>)[key] || key;
      const value = entry.vars?.[key];
      const displayValue = Weight_isOrPct(value) ? Weight_display(value) : String(value);
      stateVars.push(`${name}: ${displayValue}`);
    }
  }

  if (stateVars.length === 0) return null;

  return (
    <View style={styles.stateVarsRow}>
      {stateVars.map((sv, i) => (
        <Text key={i} style={[styles.stateVarText, { color: sem.text.secondary }]}>
          {sv}
        </Text>
      ))}
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
  subtitle: {
    fontSize: 11,
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
  workoutLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
    textAlign: "center",
    marginTop: 4,
  },
  stateVarsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  stateVarText: {
    fontSize: 11,
  },
});
