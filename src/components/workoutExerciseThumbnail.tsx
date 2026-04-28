import { JSX, memo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { Exercise_get } from "../models/exercise";
import { Reps_setsStatus } from "../models/set";
import { IHistoryEntry, ISettings } from "../types";
import {
  WorkoutExerciseUtils_setsStatusToBorderColor,
  WorkoutExerciseUtils_setsStatusToColor,
} from "../utils/workoutExerciseUtils";
import { ExerciseImage } from "./exerciseImage";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { StringUtils_dashcase } from "../utils/string";
import { Tailwind_colors, Tailwind_semantic } from "../utils/tailwindConfig";
import { ObjectUtils_entries } from "../utils/object";

interface IWorkoutExerciseThumbnailProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleTouchStart?: (...args: any[]) => void;
  onClick?: () => void;
  selectedIndex: number;
  colorToSupersetGroup: Partial<Record<string, IHistoryEntry[]>>;
  isCurrent: boolean;
  currentSuperset?: string;
  shouldShowProgress?: boolean;
  entry: IHistoryEntry;
  entryIndex: number;
  settings: ISettings;
}

function WorkoutExerciseThumbnailInner(props: IWorkoutExerciseThumbnailProps): JSX.Element {
  const { entry, entryIndex, isCurrent, currentSuperset } = props;
  const hasSupersets = Object.keys(props.colorToSupersetGroup).length > 0;
  const colorAndSupersetGroup = ObjectUtils_entries(props.colorToSupersetGroup).find(([_, entries]) => {
    return entries && entries.some((e) => e.id === entry.id);
  });
  const supersetColor = colorAndSupersetGroup ? colorAndSupersetGroup[0] : undefined;
  const setsStatus = Reps_setsStatus(entry.sets);
  const isCurrentSuperset = currentSuperset != null && currentSuperset === entry.superset;
  const borderColor = isCurrent ? "border-purple-600" : WorkoutExerciseUtils_setsStatusToBorderColor(setsStatus);
  const exercise = Exercise_get(entry.exercise, props.settings.exercises);
  const totalSetsCount = entry.sets.length;
  const completedSetsCount = entry.sets.filter((set) => set.isCompleted).length;

  return (
    <View>
      <Pressable
        onPress={props.onClick}
        data-name={`workout-exercise-tab-${entryIndex}`}
        testID={`workout-tab-${StringUtils_dashcase(exercise.name)}`}
        data-cy={`workout-tab-${StringUtils_dashcase(exercise.name)}`} data-testid={`workout-tab-${StringUtils_dashcase(exercise.name)}`}
        dataSet={{ isSelected: isCurrent ? "true" : "false" }}
        className="bg-background-default"
        style={{ paddingHorizontal: 2 }}
      >
        <View
          className={`items-center flex-row justify-center w-14 h-14 border ${borderColor} bg-background-image rounded-lg overflow-hidden`}
          style={{
            borderWidth: isCurrent ? 2 : 1,
            marginHorizontal: !isCurrent ? 1 : 0,
          }}
        >
          <ExerciseImage
            useTextForCustomExercise={true}
            className="h-10"
            customClassName="w-10"
            exerciseType={entry.exercise}
            size="small"
            settings={props.settings}
          />
          {setsStatus === "not-finished" ? (
            props.shouldShowProgress && (
              <View style={{ position: "absolute", bottom: 0, right: 0, padding: 2 }}>
                <View className="absolute inset-0 rounded-md bg-lightgray-50" style={{ opacity: 0.75 }} />
                <View style={{ position: "relative", zIndex: 10 }}>
                  <Text>
                    <Text className="text-xs font-semibold">{completedSetsCount}</Text>/
                    <Text className="text-xs font-semibold">{totalSetsCount}</Text>
                  </Text>
                </View>
              </View>
            )
          ) : (
            <View style={{ position: "absolute", bottom: 2, right: 2 }}>
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
            className="w-full"
            style={{
              backgroundColor: isCurrentSuperset ? supersetColor : Tailwind_semantic().background.neutral,
              height: 2,
              marginTop: isCurrent ? 3 : 5,
            }}
          />
        </View>
      ) : hasSupersets ? (
        <View className="w-full" style={{ backgroundColor: "transparent", height: 2, marginTop: isCurrent ? 3 : 5 }} />
      ) : null}
    </View>
  );
}

export const WorkoutExerciseThumbnail = memo(WorkoutExerciseThumbnailInner);
