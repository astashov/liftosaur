import { JSX, memo, useCallback } from "react";
import { View } from "react-native";
import { Pressable } from "./primitives/pressable";
import { FastText } from "./primitives/fastText";
import { StyledText, StyledText_cls } from "../utils/styledText";
import { useRem } from "../utils/useRem";
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
  onSelect?: (entryIndex: number) => void;
  disabled?: boolean;
  colorToSupersetGroup: Partial<Record<string, IHistoryEntry[]>>;
  isCurrent: boolean;
  currentSuperset?: string;
  shouldShowProgress?: boolean;
  entry: IHistoryEntry;
  entryIndex: number;
  settings: ISettings;
}

function WorkoutExerciseThumbnailInner(props: IWorkoutExerciseThumbnailProps): JSX.Element {
  const { entry, entryIndex, isCurrent, currentSuperset, onSelect, disabled } = props;
  const onPress = useCallback(() => {
    if (!disabled) {
      onSelect?.(entryIndex);
    }
  }, [disabled, onSelect, entryIndex]);
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
        onPress={onPress}
        data-name={`workout-exercise-tab-${entryIndex}`}
        testID={`workout-tab-${StringUtils_dashcase(exercise.name)}`}
        data-testid={`workout-tab-${StringUtils_dashcase(exercise.name)}`}
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
                  <SetsProgressBadge completed={completedSetsCount} total={totalSetsCount} />
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

function SetsProgressBadge(props: { completed: number; total: number }): JSX.Element {
  const cls = StyledText_cls(useRem());
  const counter = cls("text-xs font-semibold");
  const built = new StyledText().add(`${props.completed}`, counter).add("/").add(`${props.total}`, counter).build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-base text-black")} />;
}

export const WorkoutExerciseThumbnail = memo(WorkoutExerciseThumbnailInner);
