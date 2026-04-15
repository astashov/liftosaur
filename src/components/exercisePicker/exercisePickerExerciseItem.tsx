import { memo } from "react";
import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import {
  IExercise,
  equipmentName,
  Exercise_toKey,
  Exercise_targetMuscles,
  Exercise_synergistMuscles,
  Exercise_targetMusclesGroups,
  Exercise_synergistMusclesGroups,
} from "../../models/exercise";
import { ISettings, IExerciseType } from "../../types";
import { StringUtils_dashcase, StringUtils_capitalize } from "../../utils/string";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { ExerciseImage } from "../exerciseImage";
import { IconEdit2 } from "../icons/iconEdit2";
import { IconStar } from "../icons/iconStar";
import { Muscle_getMusclesFromScreenMuscle, Muscle_getMuscleGroupName } from "../../models/muscle";

interface IExerciseItemProps {
  exercise: IExercise;
  settings: ISettings;
  onStar?: (key: string) => void;
  onEdit?: () => void;
  currentExerciseType?: { id: string; equipment?: string };
  showMuscles?: boolean;
  isEnabled: boolean;
  isSelected?: boolean;
  onChoose?: (key: string) => void;
  isMultiselect?: boolean;
}

export const ExercisePickerExerciseItem = memo(function ExercisePickerExerciseItem(
  props: IExerciseItemProps
): JSX.Element {
  const { exercise: e } = props;
  const exerciseType = { id: e.id, equipment: e.equipment || e.defaultEquipment };
  const key = Exercise_toKey(e);
  const isStarred = !!props.settings.starredExercises?.[key];
  const onEdit = props.onEdit;
  const onChoose = props.onChoose;
  const isDisabled = !props.isEnabled && !props.isSelected;

  return (
    <View className={`flex-row gap-2 ${isDisabled ? "opacity-40" : ""}`}>
      <View className="self-center w-12" style={{ minHeight: 40 }}>
        <View className="p-1 rounded-lg bg-background-image">
          <ExerciseImage
            useTextForCustomExercise={true}
            customClassName="border border-border-neutral rounded-lg overflow-hidden"
            settings={props.settings}
            className="w-full"
            exerciseType={exerciseType}
            size="small"
          />
        </View>
      </View>
      <View className="flex-1 py-2">
        <Pressable
          className="flex-row items-center gap-1"
          onPress={() => {
            if (props.onStar) {
              props.onStar(key);
            }
          }}
        >
          {props.onStar && (
            <View>
              <IconStar
                size={20}
                isSelected={isStarred}
                color={isStarred ? Tailwind_semantic().icon.purple : Tailwind_semantic().icon.neutral}
              />
            </View>
          )}
          <Text className="text-sm">
            <Text className="text-sm font-semibold">{e.name}</Text>
            {exerciseType.equipment ? (
              <Text className="text-sm text-text-secondary">{`, ${equipmentName(exerciseType.equipment)}`}</Text>
            ) : null}
          </Text>
        </Pressable>
        <Pressable
          data-cy={`custom-exercise-${StringUtils_dashcase(e.name)}`}
          testID={`custom-exercise-${StringUtils_dashcase(e.name)}`}
          disabled={isDisabled || !props.onChoose}
          onPress={() => {
            if (!isDisabled && props.onChoose) {
              props.onChoose(key);
            }
          }}
        >
          {props.showMuscles ? (
            <MuscleView currentExerciseType={props.currentExerciseType} exercise={e} settings={props.settings} />
          ) : (
            <MuscleGroupsView currentExerciseType={props.currentExerciseType} exercise={e} settings={props.settings} />
          )}
        </Pressable>
      </View>
      <View className="flex-row items-center">
        {onEdit && (
          <Pressable
            onPress={onEdit}
            className="px-2 pb-2"
            data-cy={`custom-exercise-edit-${StringUtils_dashcase(e.name)}`}
            testID={`custom-exercise-edit-${StringUtils_dashcase(e.name)}`}
          >
            <IconEdit2 />
          </Pressable>
        )}
        {onChoose && (
          <Pressable
            className="p-2"
            disabled={isDisabled}
            data-cy={`menu-item-${StringUtils_dashcase(e.name)}`}
            testID={`menu-item-${StringUtils_dashcase(e.name)}`}
            onPress={() => onChoose(Exercise_toKey(e))}
          >
            {props.isMultiselect ? (
              <CheckboxIndicator checked={!!props.isSelected} />
            ) : (
              <RadioIndicator checked={!!props.isSelected} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
});

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

function MuscleView(props: {
  currentExerciseType?: IExerciseType;
  exercise: IExercise;
  settings: ISettings;
}): JSX.Element {
  const { exercise, settings } = props;
  const tms = props.currentExerciseType ? Exercise_targetMuscles(props.currentExerciseType, settings) : [];
  const sms = props.currentExerciseType ? Exercise_synergistMuscles(props.currentExerciseType, settings) : [];
  const targetMuscles = Exercise_targetMuscles(exercise, settings);
  const synergistMuscles = Exercise_synergistMuscles(exercise, settings).filter((m) => targetMuscles.indexOf(m) === -1);

  const types = exercise.types.map((t) => StringUtils_capitalize(t));

  return (
    <View>
      {types.length > 0 && (
        <Text className="text-xs">
          <Text className="text-xs text-text-secondary">Type: </Text>
          <Text className="text-xs font-semibold">{types.join(", ")}</Text>
        </Text>
      )}
      {targetMuscles.length > 0 && (
        <Text className="text-xs">
          <Text className="text-xs text-text-secondary">Target: </Text>
          <Text className="text-xs font-semibold">
            {targetMuscles.map((m, i) => (
              <Text
                key={m}
                className={`text-xs font-semibold ${
                  tms.length === 0 ? "" : tms.indexOf(m) !== -1 ? "text-text-success" : "text-text-error"
                }`}
              >
                {m}
                {i !== targetMuscles.length - 1 ? ", " : ""}
              </Text>
            ))}
          </Text>
        </Text>
      )}
      {synergistMuscles.length > 0 && (
        <Text className="text-xs">
          <Text className="text-xs text-text-secondary">Synergist: </Text>
          <Text className="text-xs font-semibold">
            {synergistMuscles.map((m, i) => (
              <Text
                key={m}
                className={`text-xs font-semibold ${
                  sms.length === 0 ? "" : sms.indexOf(m) !== -1 ? "text-text-success" : "text-text-error"
                }`}
              >
                {m}
                {i !== synergistMuscles.length - 1 ? ", " : ""}
              </Text>
            ))}
          </Text>
        </Text>
      )}
    </View>
  );
}

export function MuscleGroupsView(props: {
  currentExerciseType?: IExerciseType;
  exercise: IExercise;
  settings: ISettings;
}): JSX.Element {
  const { exercise, settings } = props;
  const tms: string[] = props.currentExerciseType ? Exercise_targetMuscles(props.currentExerciseType, settings) : [];
  const sms: string[] = props.currentExerciseType ? Exercise_synergistMuscles(props.currentExerciseType, settings) : [];
  const targetMuscleGroups = Exercise_targetMusclesGroups(exercise, settings);
  const synergistMuscleGroups = Exercise_synergistMusclesGroups(exercise, settings).filter(
    (m) => targetMuscleGroups.indexOf(m) === -1
  );

  const types = exercise.types.map((t) => StringUtils_capitalize(t));

  return (
    <View>
      {types.length > 0 && (
        <Text className="text-xs">
          <Text className="text-xs text-text-secondary">Type: </Text>
          <Text className="text-xs font-semibold">{types.join(", ")}</Text>
        </Text>
      )}
      {targetMuscleGroups.length > 0 && (
        <Text className="text-xs">
          <Text className="text-xs text-text-secondary">Target: </Text>
          <Text className="text-xs font-semibold">
            {targetMuscleGroups.map((m, i) => {
              const muscles = Muscle_getMusclesFromScreenMuscle(m, props.settings);
              const doesContain = muscles.some((muscle) => tms.includes(muscle));
              return (
                <Text
                  key={m}
                  className={`text-xs font-semibold ${
                    !props.currentExerciseType ? "" : doesContain ? "text-text-success" : "text-text-error"
                  }`}
                >
                  {Muscle_getMuscleGroupName(m, props.settings)}
                  {i !== targetMuscleGroups.length - 1 ? ", " : ""}
                </Text>
              );
            })}
          </Text>
        </Text>
      )}
      {synergistMuscleGroups.length > 0 && (
        <Text className="text-xs">
          <Text className="text-xs text-text-secondary">Synergist: </Text>
          <Text className="text-xs font-semibold">
            {synergistMuscleGroups.map((m, i) => {
              const muscles = Muscle_getMusclesFromScreenMuscle(m, props.settings);
              const doesContain = props.currentExerciseType && muscles.some((muscle) => sms.includes(muscle));
              return (
                <Text
                  key={m}
                  className={`text-xs font-semibold ${
                    !props.currentExerciseType ? "" : doesContain ? "text-text-success" : "text-text-error"
                  }`}
                >
                  {Muscle_getMuscleGroupName(m, props.settings)}
                  {i !== synergistMuscleGroups.length - 1 ? ", " : ""}
                </Text>
              );
            })}
          </Text>
        </Text>
      )}
    </View>
  );
}
