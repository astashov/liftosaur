import type { JSX } from "react";
import { useContext } from "react";
import { View, Pressable } from "react-native";
import { WorkoutTabStopContext } from "./workoutTabStopContext";
import { Text } from "./primitives/text";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { IconPlayCircle } from "./icons/iconPlayCircle";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { InputNumber2 } from "./inputNumber2";
import { InputWeight2 } from "./inputWeight2";
import { WorkoutExerciseUtils_getBgColor50, WorkoutExerciseUtils_getIconColor } from "../utils/workoutExerciseUtils";
import type { IWorkoutExerciseSetBodyProps } from "./workoutExerciseSet";
import {
  RpeWeightHint,
  WorkoutExerciseSetRpeTime,
  WorkoutExerciseSetTargetField,
  WorkoutExerciseSet_dataCy,
} from "./workoutExerciseSetFields";

export function WorkoutExerciseSetCompact(props: IWorkoutExerciseSetBodyProps): JSX.Element {
  const { set, isUnilateral, labelW, columnWidths } = props;
  const onTargetPress = props.onToggleExpand ?? (props.isRoundedWeight ? props.onOpenRoundingInfo : undefined);
  const tabIndex = useContext(WorkoutTabStopContext);
  return (
    <View
      className={`${WorkoutExerciseUtils_getBgColor50([set], props.type === "warmup")}`}
      data-testid={WorkoutExerciseSet_dataCy(set)}
      testID={WorkoutExerciseSet_dataCy(set)}
    >
      <View className={`flex-row items-center border-b ${props.borderColor}`}>
        <Pressable
          className="flex-row items-center flex-1"
          data-testid="workout-set-row-head"
          testID="workout-set-row-head"
          disabled={onTargetPress == null}
          onPress={onTargetPress}
        >
          <View className="items-center justify-center py-1" style={{ width: columnWidths.set }}>
            <View
              className="w-scaled-6 h-scaled-6 items-center justify-center"
              style={{
                borderRadius: 9999,
                overflow: "hidden",
                backgroundColor: props.isNext ? Tailwind_semantic().button.primarybackground : "transparent",
              }}
            >
              {props.type === "warmup" ? (
                <Text className={`text-xs ${props.isNext ? "text-text-alwayswhite font-bold" : ""}`}>W</Text>
              ) : (
                <Text className={props.isNext ? "text-text-alwayswhite font-bold" : ""}>{props.setIndex + 1}</Text>
              )}
            </View>
          </View>
          <View className="flex-1" data-testid="workout-set-target" testID="workout-set-target">
            <WorkoutExerciseSetTargetField
              set={set}
              lastSet={props.lastSet}
              setType={props.setType}
              settings={props.settings}
              exerciseType={props.exerciseType}
              underlineRounded={props.isRoundedWeight}
            />
          </View>
        </Pressable>

        <View className="items-center justify-center py-2" style={{ width: columnWidths.reps }}>
          {isUnilateral && (
            <View className="flex-row items-center justify-center mb-1">
              <Text className="text-xs text-text-secondary" style={{ width: labelW }}>
                L:
              </Text>
              <InputNumber2
                width={props.repsInputWidth}
                tabIndex={tabIndex}
                tabStop={true}
                name="set-left-reps"
                onInput={props.onInputLeftReps}
                onBlur={props.onBlurLeftReps}
                placeholder={props.placeholderReps}
                initialValue={set.reps}
                value={set.completedRepsLeft != null ? set.completedRepsLeft : undefined}
                min={0}
                max={9999}
                step={1}
                inputCommitMode="blur"
              />
            </View>
          )}
          <View className="flex-row items-center justify-center">
            {isUnilateral && (
              <Text className="text-xs text-text-secondary" style={{ width: labelW }}>
                R:
              </Text>
            )}
            <InputNumber2
              width={props.repsInputWidth}
              tabIndex={tabIndex}
              tabStop={true}
              name="set-reps"
              onInput={props.onInputReps}
              onBlur={props.onBlurReps}
              placeholder={props.placeholderReps}
              initialValue={set.reps}
              value={set.completedReps != null ? set.completedReps : undefined}
              min={0}
              max={9999}
              step={1}
              inputCommitMode="blur"
            />
          </View>
        </View>
        <View className="items-center justify-center py-2" style={{ width: columnWidths.separator }}>
          <Text className="text-text-secondary">×</Text>
        </View>
        <View className="items-start justify-center py-2" style={{ width: columnWidths.weight }}>
          <InputWeight2
            width={props.weightInputWidth}
            tabIndex={tabIndex}
            tabStop={true}
            name="set-weight"
            exerciseType={props.exerciseType}
            inputCommitMode="blur"
            onBlur={props.onBlurWeight}
            onInput={props.onInputWeight}
            addOn={
              set.rpe != null && set.reps != null
                ? () => (
                    <RpeWeightHint
                      reps={set.completedReps ?? set.reps ?? 0}
                      rpe={set.completedRpe ?? set.rpe!}
                      settings={props.settings}
                      exerciseType={props.exerciseType}
                    />
                  )
                : undefined
            }
            subscription={props.subscription}
            placeholder={props.placeholderWeight}
            initialValue={set.weight}
            value={set.completedWeight || undefined}
            max={9999}
            min={-9999}
            settings={props.settings}
          />
        </View>

        {columnWidths.rpe > 0 ? (
          <WorkoutExerciseSetRpeTime
            set={set}
            isUnilateral={isUnilateral}
            completedRpeValue={props.completedRpeValue}
            width={columnWidths.rpe}
            onEditSetTimer={props.onEditSetTimer}
          />
        ) : null}

        <View className="items-end justify-center" style={{ width: columnWidths.check }}>
          {props.type === "workout" && set.setTimer != null && !set.isCompleted ? (
            <Pressable
              tabIndex={tabIndex}
              dataSet={{ tabStop: "1" }}
              className={columnWidths.rpe > 0 ? "pl-1 pr-4 py-3" : "px-4 py-3"}
              data-testid="start-set-timer"
              testID="start-set-timer"
              onPress={props.onCompleteSet}
            >
              <IconPlayCircle size={24} color={WorkoutExerciseUtils_getIconColor([set], false)} />
            </Pressable>
          ) : (
            <Pressable
              tabIndex={tabIndex}
              dataSet={{ tabStop: "1" }}
              className={columnWidths.rpe > 0 ? "pl-1 pr-4 py-3" : "px-4 py-3"}
              data-testid="complete-set"
              testID="complete-set"
              onPress={props.onCompleteSet}
            >
              <IconCheckCircle
                size={24}
                isChecked={true}
                color={WorkoutExerciseUtils_getIconColor([set], props.type === "warmup")}
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
