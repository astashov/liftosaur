import { useState } from "react";
import type { JSX } from "react";
import { View, Text, Pressable } from "react-native";
import type { ISetSplit } from "@shared/pages/planner/models/types";
import type { ISettings, IScreenMuscle } from "@shared/types";
import { n } from "@shared/utils/math";
import { CollectionUtils_sort } from "@shared/utils/collection";

export function colorPctValue(total: number, num: number, target: number): string {
  const pct = total > 0 ? Math.round((num * 100) / total) : 0;
  if (pct >= target) {
    return "text-text-success";
  } else if (pct >= target - 10) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}

export function colorRangeValue(value: number, min: number, max: number): string {
  if (value >= min && value <= max) {
    return "text-text-success";
  } else if (value >= min * 0.7 && value <= max * 1.3) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}

export function directionValue(value: number, min: number, max: number): string {
  if (value < min) {
    return "\u2191";
  } else if (value > max) {
    return "\u2193";
  } else {
    return "";
  }
}

function colorThresholdValue(value: number, threshold: number): string {
  if (value >= threshold) {
    return "text-text-success";
  } else if (value >= threshold * 0.5) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}

interface IProps {
  split: ISetSplit;
  settings: ISettings;
  shouldIncludeFrequency: boolean;
  muscle?: IScreenMuscle;
}

export function PlannerSetSplit(props: IProps): JSX.Element {
  const { split, settings, shouldIncludeFrequency, muscle } = props;
  const [showTooltip, setShowTooltip] = useState(false);
  const total = split.strength + split.hypertrophy;
  const frequency = Object.keys(split.frequency).length;
  const setColor = muscle
    ? colorRangeValue(
        total,
        settings.planner.weeklyRangeSets[muscle]?.[0] ?? 0,
        settings.planner.weeklyRangeSets[muscle]?.[1] ?? 0
      )
    : "";
  const setDir = muscle
    ? directionValue(
        total,
        settings.planner.weeklyRangeSets[muscle]?.[0] ?? 0,
        settings.planner.weeklyRangeSets[muscle]?.[1] ?? 0
      )
    : "";
  const frequencyColor = muscle ? colorThresholdValue(frequency, settings.planner.weeklyFrequency[muscle] ?? 0) : "";

  return (
    <Pressable onPress={() => setShowTooltip(!showTooltip)}>
      <Text>
        <Text className={setColor}>
          {n(total, 0)}
          {setDir}
        </Text>
        {total > 0 && (
          <Text>
            {" ("}
            {split.strength > 0 && <Text>{n(split.strength, 0)}s</Text>}
            {split.strength > 0 && split.hypertrophy > 0 && ", "}
            {split.hypertrophy > 0 && <Text>{n(split.hypertrophy, 0)}h</Text>}
            {")"}
          </Text>
        )}
        {shouldIncludeFrequency && frequency > 0 && <Text className={frequencyColor}>{`, ${frequency}d`}</Text>}
      </Text>
      {showTooltip && <PlannerStatsTooltip split={split} />}
    </Pressable>
  );
}

function PlannerStatsTooltip(props: { split: ISetSplit }): JSX.Element | null {
  const exercises = CollectionUtils_sort(props.split.exercises, (a, b) => {
    if ((a.isSynergist && b.isSynergist) || (!a.isSynergist && !b.isSynergist)) {
      return a.exerciseName.localeCompare(b.exerciseName);
    } else if (a.isSynergist) {
      return 1;
    } else {
      return -1;
    }
  });
  if (exercises.length === 0) {
    return null;
  }

  return (
    <View
      className="absolute z-10 px-3 py-2 border bg-background-default border-gray-400 rounded-xl"
      style={{ minWidth: 224 }}
    >
      {exercises.map((exercise, i) => {
        const totalSets = exercise.strengthSets + exercise.hypertrophySets;
        return (
          <Text key={i} className={`font-bold ${exercise.isSynergist ? "text-text-secondary" : "text-text-primary"}`}>
            {exercise.exerciseName}: {n(totalSets)} ({n(exercise.strengthSets)}s, {n(exercise.hypertrophySets)}h)
          </Text>
        );
      })}
    </View>
  );
}
