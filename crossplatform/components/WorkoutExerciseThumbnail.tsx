import React from "react";
import { View, Text, Pressable } from "react-native";
import { Exercise_get } from "@shared/models/exercise";
import { Reps_setsStatus } from "@shared/models/set";
import type { IHistoryEntry, IHistoryRecord, ISettings } from "@shared/types";
import {
  WorkoutExerciseUtils_setsStatusToBorderColor,
  WorkoutExerciseUtils_setsStatusToColor,
} from "@shared/utils/workoutExerciseUtils";
import { ExerciseImage } from "./ExerciseImage";
import { IconCheckCircle } from "./icons/IconCheckCircle";
import { Tailwind_colors, Tailwind_semantic } from "@shared/utils/tailwindConfig";
import { ObjectUtils_entries } from "@shared/utils/object";

interface IProps {
  onClick?: () => void;
  selectedIndex: number;
  colorToSupersetGroup: Partial<Record<string, IHistoryEntry[]>>;
  progress: IHistoryRecord;
  shouldShowProgress?: boolean;
  entry: IHistoryEntry;
  entryIndex: number;
  settings: ISettings;
}

export function WorkoutExerciseThumbnail(props: IProps): React.ReactElement {
  const { entry, entryIndex } = props;
  const hasSupersets = Object.keys(props.colorToSupersetGroup).length > 0;
  const colorAndSupersetGroup = ObjectUtils_entries(props.colorToSupersetGroup).find(([_, entries]) => {
    return entries && entries.some((e) => e.id === entry.id);
  });
  const supersetColor = colorAndSupersetGroup ? colorAndSupersetGroup[0] : undefined;
  const setsStatus = Reps_setsStatus(entry.sets);
  const isCurrent = (props.progress.ui?.currentEntryIndex ?? 0) === entryIndex;
  const currentEntry = props.progress.entries[props.progress.ui?.currentEntryIndex ?? 0];
  const currentSuperset = currentEntry?.superset;
  const isCurrentSuperset = currentSuperset != null && currentSuperset === entry.superset;
  const borderColor = isCurrent ? "border-purple-600" : WorkoutExerciseUtils_setsStatusToBorderColor(setsStatus);
  const exercise = Exercise_get(entry.exercise, props.settings.exercises);
  const totalSetsCount = entry.sets.length;
  const completedSetsCount = entry.sets.filter((set) => set.isCompleted).length;

  return (
    <View>
      <Pressable onPress={props.onClick} className="items-center bg-background-default" style={{ paddingHorizontal: 2 }}>
        <View
          className={`border ${borderColor} bg-background-image rounded-lg overflow-hidden`}
          style={{
            width: 48,
            height: 48,
            borderWidth: isCurrent ? 2 : 1,
          }}
        >
          <ExerciseImage
            useTextForCustomExercise={true}
            exerciseType={entry.exercise}
            size="small"
            settings={props.settings}
            width={44}
          />
          {setsStatus === "not-finished" ? (
            props.shouldShowProgress && (
              <View className="absolute bottom-0 right-0" style={{ padding: 1 }}>
                <View className="absolute inset-0 rounded-md opacity-75 bg-lightgray-50" />
                <Text className="text-xs">
                  <Text className="font-semibold">{completedSetsCount}</Text>/
                  <Text className="font-semibold">{totalSetsCount}</Text>
                </Text>
              </View>
            )
          ) : (
            <View className="absolute" style={{ bottom: 2, right: 2 }}>
              <IconCheckCircle
                isChecked={true}
                size={14}
                color={WorkoutExerciseUtils_setsStatusToColor(setsStatus)}
                checkColor={Tailwind_colors().white}
              />
            </View>
          )}
        </View>
      </Pressable>
      {supersetColor ? (
        <View className="mx-1">
          <View
            style={{
              width: "100%",
              backgroundColor: isCurrentSuperset ? supersetColor : Tailwind_semantic().background.neutral,
              height: 2,
              marginTop: isCurrent ? 3 : 5,
            }}
          />
        </View>
      ) : hasSupersets ? (
        <View
          style={{ width: "100%", backgroundColor: "transparent", height: 2, marginTop: isCurrent ? 3 : 5 }}
        />
      ) : null}
    </View>
  );
}
