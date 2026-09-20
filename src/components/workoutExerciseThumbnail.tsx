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
  colorToSupersetGroup: Partial<Record<string, IHistoryEntry[]>>;
  isCurrent: boolean;
  currentSuperset?: string;
  shouldShowProgress?: boolean;
  entry: IHistoryEntry;
  entryIndex: number;
  settings: ISettings;
}

function WorkoutExerciseThumbnailInner(props: IWorkoutExerciseThumbnailProps): JSX.Element {
  const { entry, entryIndex, isCurrent, currentSuperset, onSelect } = props;
  const onPress = useCallback(() => onSelect?.(entryIndex), [onSelect, entryIndex]);
  const hasSupersets = Object.keys(props.colorToSupersetGroup).length > 0;
  const colorAndSupersetGroup = ObjectUtils_entries(props.colorToSupersetGroup).find(([_, entries]) => {
    return entries && entries.some((e) => e.id === entry.id);
  });
  const supersetColor = colorAndSupersetGroup ? colorAndSupersetGroup[0] : undefined;
  const setsStatus = Reps_setsStatus(entry.sets);
  const isCurrentSuperset = currentSuperset != null && currentSuperset === entry.superset;
  const borderColor = WorkoutExerciseUtils_setsStatusToBorderColor(setsStatus);
  const cornerInset = isCurrent ? 0 : 1;
  const exercise = Exercise_get(entry.exercise, props.settings.exercises);
  const totalSetsCount = entry.sets.length;
  const completedSetsCount = entry.sets.filter((set) => set.isCompleted).length;

  const tile = (
    <View
      data-name={`workout-exercise-tab-${entryIndex}`}
      testID={`workout-tab-${StringUtils_dashcase(exercise.name)}`}
      data-testid={`workout-tab-${StringUtils_dashcase(exercise.name)}`}
      dataSet={{ isSelected: isCurrent ? "true" : "false" }}
      className="bg-background-default"
      style={{
        borderWidth: 1,
        borderRadius: 9,
        borderColor: isCurrent ? Tailwind_semantic().border.currentoutline : "transparent",
      }}
    >
      <View
        className={`items-center flex-row justify-center w-scaled-16 h-scaled-16 border ${borderColor} bg-background-image rounded-lg overflow-hidden`}
        style={
          isCurrent
            ? { borderWidth: 2, borderColor: Tailwind_semantic().border.current }
            : { borderWidth: 1, padding: 1 }
        }
      >
        <ExerciseImage
          useTextForCustomExercise={true}
          exerciseType={entry.exercise}
          size="small"
          width={40}
          settings={props.settings}
        />
        {setsStatus === "not-finished" ? (
          props.shouldShowProgress && (
            <View style={{ position: "absolute", bottom: cornerInset, right: cornerInset, padding: 2 }}>
              <View className="absolute inset-0 rounded-md bg-lightgray-50" style={{ opacity: 0.75 }} />
              <View style={{ position: "relative", zIndex: 10 }}>
                <SetsProgressBadge completed={completedSetsCount} total={totalSetsCount} />
              </View>
            </View>
          )
        ) : (
          <View style={{ position: "absolute", bottom: 2 + cornerInset, right: 2 + cornerInset }}>
            <IconCheckCircle
              isChecked={true}
              size={14}
              color={WorkoutExerciseUtils_setsStatusToColor(setsStatus)}
              checkColor={Tailwind_colors().white}
            />
          </View>
        )}
      </View>
    </View>
  );
  return (
    <View>
      {onSelect ? <Pressable onPress={onPress}>{tile}</Pressable> : tile}
      {supersetColor ? (
        <View className="mx-1">
          <View
            className="w-full"
            style={{
              backgroundColor: isCurrentSuperset ? supersetColor : Tailwind_semantic().background.neutral,
              height: 2,
              marginTop: 5,
            }}
          />
        </View>
      ) : hasSupersets ? (
        <View className="w-full" style={{ backgroundColor: "transparent", height: 2, marginTop: 5 }} />
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
