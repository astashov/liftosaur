import type { JSX } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Text } from "../primitives/text";
import { IEvaluatedProgram, IEvaluatedProgramWeek } from "../../models/program";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { ObjectUtils_keys } from "../../utils/object";
import { ExerciseImage } from "../exerciseImage";
import { IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { HistoryRecordSet } from "../historyRecordSets";
import {
  PlannerProgramExercise_currentEvaluatedSetVariation,
  PlannerProgramExercise_evaluatedSetsToDisplaySets,
} from "../../pages/planner/models/plannerProgramExercise";
import { ILensDispatch } from "../../utils/useLensReducer";
import { Exercise_eq } from "../../models/exercise";
import { ExercisePickerUtils_getIsMultiselect, ExercisePickerUtils_chooseProgramExercise } from "./exercisePickerUtils";
import { StringUtils_dashcase } from "../../utils/string";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  evaluatedProgram: IEvaluatedProgram;
  state: IExercisePickerState;
  usedExerciseTypes: IExerciseType[];
  dispatch: ILensDispatch<IExercisePickerState>;
  settings: ISettings;
  week: IEvaluatedProgramWeek;
}

export function ExercisePickerAllProgramExercises(props: IProps): JSX.Element {
  const isMultiselect = ExercisePickerUtils_getIsMultiselect(props.state);
  const exercisesToDays = props.week.days.reduce<Record<string, IPlannerProgramExercise[]>>((acc, day) => {
    day.exercises.forEach((exercise) => {
      if (!acc[exercise.key]) {
        acc[exercise.key] = [];
      }
      acc[exercise.key].push(exercise);
    });
    return acc;
  }, {});

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
      {ObjectUtils_keys(exercisesToDays).map((exerciseKey) => {
        const exercises = exercisesToDays[exerciseKey];
        const exerciseType = exercises[0].exerciseType;
        if (exerciseType == null) {
          return null;
        }
        const isAllDisabled = exercises.every((exercise) => {
          const anExerciseType = exercise.exerciseType;
          if (anExerciseType == null) {
            return true;
          }
          const isSelected = props.state.selectedExercises.some((ex) => {
            return (
              ex.type === "program" &&
              anExerciseType &&
              Exercise_eq(ex.exerciseType, anExerciseType) &&
              ex.week === exercise.dayData.week &&
              ex.dayInWeek === exercise.dayData.dayInWeek
            );
          });
          const isDisabled = props.state.selectedExercises.some(
            (ex) => "exerciseType" in ex && Exercise_eq(ex.exerciseType, anExerciseType)
          );
          const isUsedForDay = props.usedExerciseTypes.some((et) => Exercise_eq(et, anExerciseType));
          return isMultiselect ? isUsedForDay || (isDisabled && !isSelected) : isUsedForDay;
        });
        return (
          <View
            key={exerciseKey}
            className={`flex-row gap-2 px-2 pb-2 mb-4 border-b border-background-subtle ${
              isAllDisabled ? "opacity-40" : ""
            }`}
          >
            <View className="pl-1">
              <View className="p-1 rounded-lg bg-background-image">
                <ExerciseImage settings={props.settings} exerciseType={exerciseType} size="small" className="w-10" />
              </View>
            </View>
            <View className="flex-1 pt-1">
              <Text className="text-base font-semibold">{exercises[0].name}</Text>
            </View>
            <View>
              {exercises.map((exercise) => {
                const anExerciseType = exercise.exerciseType;
                if (anExerciseType == null) {
                  return null;
                }
                const isSelected = props.state.selectedExercises.some((ex) => {
                  return (
                    ex.type === "program" &&
                    anExerciseType &&
                    Exercise_eq(ex.exerciseType, anExerciseType) &&
                    ex.week === exercise.dayData.week &&
                    ex.dayInWeek === exercise.dayData.dayInWeek
                  );
                });
                const isDisabled = props.state.selectedExercises.some(
                  (ex) => "exerciseType" in ex && Exercise_eq(ex.exerciseType, anExerciseType)
                );
                const isUsedForDay = props.usedExerciseTypes.some((et) => Exercise_eq(et, anExerciseType));
                const currentSetVariation = PlannerProgramExercise_currentEvaluatedSetVariation(exercise);
                const displayGroups = PlannerProgramExercise_evaluatedSetsToDisplaySets(
                  currentSetVariation.sets,
                  props.settings
                );
                const isItemDisabled = isMultiselect ? isUsedForDay || (isDisabled && !isSelected) : isUsedForDay;
                const testId = `exercise-picker-program-${StringUtils_dashcase(exercise.name)}-${exercise.dayData.week}-${exercise.dayData.dayInWeek}`;
                return (
                  <Pressable
                    key={`${exercise.key}_${exercise.dayData.week}_${exercise.dayData.dayInWeek}`}
                    className={`flex-row pb-1 ${isItemDisabled && !isAllDisabled ? "opacity-40" : ""}`}
                    disabled={isItemDisabled}
                    data-cy={testId}
                    testID={testId}
                    onPress={() => {
                      ExercisePickerUtils_chooseProgramExercise(
                        props.dispatch,
                        anExerciseType,
                        exercise.dayData.week,
                        exercise.dayData.dayInWeek,
                        props.state
                      );
                    }}
                  >
                    <View>
                      <Text className="px-1 pb-1 text-xs text-text-secondary">Day {exercise.dayData.dayInWeek}</Text>
                      {displayGroups.map((g, gi) => (
                        <HistoryRecordSet key={gi} sets={g} isNext={true} settings={props.settings} />
                      ))}
                    </View>
                    <View className="items-center justify-center p-2">
                      {isMultiselect ? (
                        <CheckboxIndicator checked={isSelected} />
                      ) : (
                        <RadioIndicator checked={isSelected} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function RadioIndicator(props: { checked: boolean }): JSX.Element {
  const color = Tailwind_semantic().icon.purple;
  return (
    <View
      className="items-center justify-center rounded-full border-2"
      style={{ width: 20, height: 20, borderColor: props.checked ? color : Tailwind_semantic().border.prominent }}
    >
      {props.checked && <View className="rounded-full" style={{ width: 10, height: 10, backgroundColor: color }} />}
    </View>
  );
}

function CheckboxIndicator(props: { checked: boolean }): JSX.Element {
  const color = Tailwind_semantic().icon.purple;
  return (
    <View
      className="items-center justify-center rounded border-2"
      style={{
        width: 20,
        height: 20,
        borderColor: props.checked ? color : Tailwind_semantic().border.prominent,
        backgroundColor: props.checked ? color : "transparent",
      }}
    >
      {props.checked && <Text className="text-xs font-bold text-text-alwayswhite">✓</Text>}
    </View>
  );
}
