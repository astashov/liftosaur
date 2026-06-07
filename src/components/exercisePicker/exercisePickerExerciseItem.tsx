import { memo } from "react";
import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { FastText } from "../primitives/fastText";
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
import { IconCheckCircle } from "../icons/iconCheckCircle";
import { Muscle_getMusclesFromScreenMuscle, Muscle_getMuscleGroupName } from "../../models/muscle";
import { StyledText, StyledText_cls } from "../../utils/styledText";
import { useRem } from "../../utils/useRem";

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
          <ExerciseNameLine name={e.name} equipment={exerciseType.equipment} />
        </Pressable>
        <Pressable
          data-testid={`custom-exercise-${StringUtils_dashcase(e.name)}`}
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
            className="p-2"
            data-testid={`custom-exercise-edit-${StringUtils_dashcase(e.name)}`}
            testID={`custom-exercise-edit-${StringUtils_dashcase(e.name)}`}
          >
            <IconEdit2 />
          </Pressable>
        )}
        {onChoose &&
          (props.isMultiselect ? (
            <Pressable
              className="p-2"
              disabled={isDisabled}
              data-testid={`menu-item-${StringUtils_dashcase(e.name)}`}
              testID={`menu-item-${StringUtils_dashcase(e.name)}`}
              onPress={() => onChoose(Exercise_toKey(e))}
            >
              <IconCheckCircle isChecked={!!props.isSelected} />
            </Pressable>
          ) : (
            <Pressable
              className="p-2"
              disabled={isDisabled}
              data-testid={`menu-item-${StringUtils_dashcase(e.name)}`}
              testID={`menu-item-${StringUtils_dashcase(e.name)}`}
              onPress={() => onChoose(Exercise_toKey(e))}
            >
              <RadioIndicator checked={!!props.isSelected} />
            </Pressable>
          ))}
      </View>
    </View>
  );
});

function ExerciseNameLine(props: { name: string; equipment?: string }): JSX.Element {
  const cls = StyledText_cls(useRem());
  const builder = new StyledText();
  builder.add(props.name, cls("font-semibold"));
  if (props.equipment) {
    builder.add(`, ${equipmentName(props.equipment)}`, cls("text-text-secondary"));
  }
  const built = builder.build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-sm text-text-primary")} />;
}

// One picker row renders up to three of these; collapsing each into a single FastText node
// (instead of a nested <Text> per muscle) is the bulk of the picker's mount-time win.
function LabeledItemsLine(props: { label: string; items: { text: string; isMatch?: boolean }[] }): JSX.Element {
  const cls = StyledText_cls(useRem());
  const semantic = Tailwind_semantic();
  const semibold = cls("font-semibold");
  const builder = new StyledText();
  builder.add(`${props.label}: `, cls("text-text-secondary"));
  props.items.forEach((item, i) => {
    const color = item.isMatch == null ? undefined : item.isMatch ? semantic.text.success : semantic.text.error;
    builder.add(`${item.text}${i !== props.items.length - 1 ? ", " : ""}`, { ...semibold, color });
  });
  const built = builder.build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-xs text-text-primary")} />;
}

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
      {types.length > 0 && <LabeledItemsLine label="Type" items={[{ text: types.join(", ") }]} />}
      {targetMuscles.length > 0 && (
        <LabeledItemsLine
          label="Target"
          items={targetMuscles.map((m) => ({
            text: m,
            isMatch: tms.length === 0 ? undefined : tms.indexOf(m) !== -1,
          }))}
        />
      )}
      {synergistMuscles.length > 0 && (
        <LabeledItemsLine
          label="Synergist"
          items={synergistMuscles.map((m) => ({
            text: m,
            isMatch: sms.length === 0 ? undefined : sms.indexOf(m) !== -1,
          }))}
        />
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
      {types.length > 0 && <LabeledItemsLine label="Type" items={[{ text: types.join(", ") }]} />}
      {targetMuscleGroups.length > 0 && (
        <LabeledItemsLine
          label="Target"
          items={targetMuscleGroups.map((m) => {
            const muscles = Muscle_getMusclesFromScreenMuscle(m, props.settings);
            return {
              text: Muscle_getMuscleGroupName(m, props.settings),
              isMatch: !props.currentExerciseType ? undefined : muscles.some((muscle) => tms.includes(muscle)),
            };
          })}
        />
      )}
      {synergistMuscleGroups.length > 0 && (
        <LabeledItemsLine
          label="Synergist"
          items={synergistMuscleGroups.map((m) => {
            const muscles = Muscle_getMusclesFromScreenMuscle(m, props.settings);
            return {
              text: Muscle_getMuscleGroupName(m, props.settings),
              isMatch: !props.currentExerciseType ? undefined : muscles.some((muscle) => sms.includes(muscle)),
            };
          })}
        />
      )}
    </View>
  );
}
