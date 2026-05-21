import { JSX, memo, useCallback, useMemo, useRef } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Text } from "../primitives/text";
import { IEvaluatedProgramWeek } from "../../models/program";
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
import { Exercise_toKey } from "../../models/exercise";
import { ExercisePickerUtils_getIsMultiselect, ExercisePickerUtils_chooseProgramExercise } from "./exercisePickerUtils";
import { StringUtils_dashcase } from "../../utils/string";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { Switch } from "../primitives/switch";

interface IProps {
  mode: IExercisePickerState["mode"];
  exerciseType?: IExerciseType;
  selectedExercises: IExercisePickerState["selectedExercises"];
  label?: string;
  usedExerciseTypes: IExerciseType[];
  dispatch: ILensDispatch<IExercisePickerState>;
  settings: ISettings;
  week: IEvaluatedProgramWeek;
}

export const ExercisePickerAllProgramExercises = memo(function ExercisePickerAllProgramExercises(
  props: IProps
): JSX.Element {
  const { mode, exerciseType, selectedExercises, label, dispatch, settings, week, usedExerciseTypes } = props;
  const isMultiselect = useMemo(
    () => ExercisePickerUtils_getIsMultiselect({ mode, exerciseType }),
    [mode, exerciseType]
  );

  const exercisesToDays = useMemo(() => {
    return week.days.reduce<Record<string, IPlannerProgramExercise[]>>((acc, day) => {
      day.exercises.forEach((exercise) => {
        if (!acc[exercise.key]) {
          acc[exercise.key] = [];
        }
        acc[exercise.key].push(exercise);
      });
      return acc;
    }, {});
  }, [week]);

  const usedKeys = useMemo(() => new Set(usedExerciseTypes.map((et) => Exercise_toKey(et))), [usedExerciseTypes]);

  const selectedProgramKeys = useMemo(() => {
    const keys = new Set<string>();
    selectedExercises.forEach((ex) => {
      if (ex.type === "program") {
        keys.add(`${Exercise_toKey(ex.exerciseType)}_${ex.week}_${ex.dayInWeek}`);
      }
    });
    return keys;
  }, [selectedExercises]);

  const selectedAnyKeys = useMemo(() => {
    const keys = new Set<string>();
    selectedExercises.forEach((ex) => {
      if ("exerciseType" in ex) {
        keys.add(Exercise_toKey(ex.exerciseType));
      }
    });
    return keys;
  }, [selectedExercises]);

  const chooseCtxRef = useRef({ mode, exerciseType, selectedExercises, label });
  chooseCtxRef.current = { mode, exerciseType, selectedExercises, label };
  const onChooseProgram = useCallback(
    (exerciseTypeArg: IExerciseType, weekIndex: number, dayInWeek: number) => {
      ExercisePickerUtils_chooseProgramExercise(dispatch, exerciseTypeArg, weekIndex, dayInWeek, chooseCtxRef.current);
    },
    [dispatch]
  );

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
      {ObjectUtils_keys(exercisesToDays).map((exerciseKey) => {
        const exercises = exercisesToDays[exerciseKey];
        const groupExerciseType = exercises[0].exerciseType;
        if (groupExerciseType == null) {
          return null;
        }
        const isAllDisabled = exercises.every((exercise) => {
          const anExerciseType = exercise.exerciseType;
          if (anExerciseType == null) {
            return true;
          }
          const key = Exercise_toKey(anExerciseType);
          const selKey = `${key}_${exercise.dayData.week}_${exercise.dayData.dayInWeek}`;
          const isSelected = selectedProgramKeys.has(selKey);
          const isDisabled = selectedAnyKeys.has(key);
          const isUsedForDay = usedKeys.has(key);
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
                <ExerciseImage settings={settings} exerciseType={groupExerciseType} size="small" className="w-10" />
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
                const key = Exercise_toKey(anExerciseType);
                const selKey = `${key}_${exercise.dayData.week}_${exercise.dayData.dayInWeek}`;
                const isSelected = selectedProgramKeys.has(selKey);
                const isDisabled = selectedAnyKeys.has(key);
                const isUsedForDay = usedKeys.has(key);
                const isItemDisabled = isMultiselect ? isUsedForDay || (isDisabled && !isSelected) : isUsedForDay;
                const rowKey = `${exercise.key}_${exercise.dayData.week}_${exercise.dayData.dayInWeek}`;
                return (
                  <ProgramExerciseRow
                    key={rowKey}
                    exercise={exercise}
                    exerciseType={anExerciseType}
                    isMultiselect={isMultiselect}
                    isSelected={isSelected}
                    isItemDisabled={isItemDisabled}
                    isAllDisabled={isAllDisabled}
                    settings={settings}
                    onChoose={onChooseProgram}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
});

interface IProgramExerciseRowProps {
  exercise: IPlannerProgramExercise;
  exerciseType: IExerciseType;
  isMultiselect: boolean;
  isSelected: boolean;
  isItemDisabled: boolean;
  isAllDisabled: boolean;
  settings: ISettings;
  onChoose: (exerciseType: IExerciseType, week: number, dayInWeek: number) => void;
}

const ProgramExerciseRow = memo(function ProgramExerciseRow(props: IProgramExerciseRowProps): JSX.Element {
  const { exercise, exerciseType, isMultiselect, isSelected, isItemDisabled, isAllDisabled, settings, onChoose } =
    props;
  const choose = useCallback(() => {
    onChoose(exerciseType, exercise.dayData.week, exercise.dayData.dayInWeek);
  }, [onChoose, exerciseType, exercise.dayData.week, exercise.dayData.dayInWeek]);

  const displayGroups = useMemo(() => {
    const currentSetVariation = PlannerProgramExercise_currentEvaluatedSetVariation(exercise);
    return PlannerProgramExercise_evaluatedSetsToDisplaySets(currentSetVariation.sets, settings);
  }, [exercise, settings]);

  const testId = `exercise-picker-program-${StringUtils_dashcase(exercise.name)}-${exercise.dayData.week}-${exercise.dayData.dayInWeek}`;
  const rowClassName = `justify-end flex-row pb-1 ${isItemDisabled && !isAllDisabled ? "opacity-40" : ""}`;

  const dayContent = (
    <View>
      <Text className="px-1 pb-1 text-xs text-text-secondary">Day {exercise.dayData.dayInWeek}</Text>
      {displayGroups.map((g, gi) => (
        <HistoryRecordSet key={gi} sets={g} isNext={true} units={settings.units} />
      ))}
    </View>
  );

  if (isMultiselect) {
    return (
      <View className={rowClassName} data-testid={testId} testID={testId}>
        <Pressable className="flex-row flex-1" disabled={isItemDisabled} onPress={choose}>
          {dayContent}
        </Pressable>
        <View className="items-center justify-center p-2">
          <Switch value={isSelected} disabled={isItemDisabled} onValueChange={choose} />
        </View>
      </View>
    );
  }
  return (
    <Pressable className={rowClassName} disabled={isItemDisabled} data-testid={testId} testID={testId} onPress={choose}>
      {dayContent}
      <View className="items-center justify-center p-2">
        <RadioIndicator checked={isSelected} />
      </View>
    </Pressable>
  );
});

function RadioIndicator(props: { checked: boolean }): JSX.Element {
  const color = Tailwind_semantic().icon.purple;
  return (
    <View
      className="items-center justify-center border-2 rounded-full"
      style={{ width: 20, height: 20, borderColor: props.checked ? color : Tailwind_semantic().border.prominent }}
    >
      {props.checked && <View className="rounded-full" style={{ width: 10, height: 10, backgroundColor: color }} />}
    </View>
  );
}
