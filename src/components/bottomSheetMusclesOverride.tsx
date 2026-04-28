import { JSX, useState } from "react";
import { View, Pressable, ScrollView, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import {
  IExercise,
  Exercise_defaultTargetMuscles,
  Exercise_defaultSynergistMuscleMultipliers,
  Exercise_toKey,
  Exercise_get,
} from "../models/exercise";
import { IExerciseType, IMuscleMultiplier, ISettings } from "../types";
import { Button } from "./button";
import { Nux } from "./nux";
import { CollectionUtils_sort } from "../utils/collection";
import { MenuItemWrapper } from "./menuItem";
import { StringUtils_dashcase } from "../utils/string";
import { MuscleImage } from "./muscleImage";
import { IconTrash } from "./icons/iconTrash";
import { IconClose2 } from "./icons/iconClose2";
import { MathUtils_clamp, MathUtils_roundTo005 } from "../utils/math";
import { LinkButton } from "./linkButton";
import { useModal } from "../navigation/ModalStateContext";
import { Muscle_getScreenMusclesFromMuscle, Muscle_getMuscleGroupName } from "../models/muscle";
import { ObjectUtils_keys, ObjectUtils_clone, ObjectUtils_isEqual } from "../utils/object";
import { BottomSheetOrModal } from "./bottomSheetOrModal";
import { SheetDragHandle } from "../navigation/SheetScreenContainer";

interface IBottomSheetMusclesOverrideProps {
  exerciseType: IExerciseType;
  settings: ISettings;
  helps: string[];
  isHidden: boolean;
  onNewExerciseData: (exerciseData: Partial<ISettings["exerciseData"]>) => void;
  onClose: () => void;
  dispatch?: IDispatch;
}

function getMultiplierValue(multiplier: number | string | undefined): number {
  if (multiplier == null) {
    return 0;
  } else {
    let value = 0;
    if (typeof multiplier === "string") {
      const parsed = parseFloat(multiplier);
      value = isNaN(parsed) ? 0 : parsed;
    } else {
      value = multiplier;
    }
    return MathUtils_clamp(MathUtils_roundTo005(value), 0, 1);
  }
}

type IMuscleAndMultiplierOpt = Omit<IMuscleMultiplier, "multiplier"> & { multiplier: number | string | undefined };

function getDefaultMusclesAndMultipliers(exercise: IExercise, settings: ISettings): IMuscleAndMultiplierOpt[] {
  const targets = Exercise_defaultTargetMuscles(exercise, settings).map((m) => ({ muscle: m, multiplier: 1 }));
  const synergists = Exercise_defaultSynergistMuscleMultipliers(exercise, settings);
  return CollectionUtils_sort([...targets, ...synergists], (a, b) => a.muscle.localeCompare(b.muscle));
}

function getDefaultMusclesAndMultipliersAsObject(
  exercise: IExercise,
  settings: ISettings
): Partial<Record<string, number>> {
  const result: Partial<Record<string, number>> = {};
  for (const mm of getDefaultMusclesAndMultipliers(exercise, settings)) {
    result[mm.muscle] = getMultiplierValue(mm.multiplier);
  }
  return result;
}

function getInitialMusclesAndMultipliers(exercise: IExercise, settings: ISettings): IMuscleAndMultiplierOpt[] {
  const muscleMultipliers = settings.exerciseData[Exercise_toKey(exercise)]?.muscleMultipliers;
  if (muscleMultipliers != null) {
    return ObjectUtils_keys(muscleMultipliers).map((muscle) => ({
      muscle,
      multiplier: muscleMultipliers[muscle],
    }));
  } else {
    return getDefaultMusclesAndMultipliers(exercise, settings);
  }
}

export type IBottomSheetMusclesOverrideContentProps = Omit<IBottomSheetMusclesOverrideProps, "isHidden">;

export function BottomSheetMusclesOverrideContent(props: IBottomSheetMusclesOverrideContentProps): JSX.Element {
  const exercise = Exercise_get(props.exerciseType, props.settings.exercises);
  const [musclesAndMultipliers, setMusclesAndMultipliers] = useState(
    getInitialMusclesAndMultipliers(exercise, props.settings)
  );

  const openMusclePicker = useModal("exerciseMusclesPickerModal", (selectedMuscles) => {
    setMusclesAndMultipliers((mms) => {
      const existing = new Map(mms.map((mm) => [mm.muscle, mm]));
      const next = selectedMuscles.map((muscle) => existing.get(muscle) ?? { muscle, multiplier: 1 });
      return CollectionUtils_sort(next, (a, b) => a.muscle.localeCompare(b.muscle));
    });
  });

  const handleSave = (): void => {
    const muscleMultipliers: Partial<Record<string, number>> = {};
    for (const mm of musclesAndMultipliers) {
      muscleMultipliers[mm.muscle] = getMultiplierValue(mm.multiplier);
    }
    const exerciseData = props.settings.exerciseData;
    const newExerciseData = ObjectUtils_clone(exerciseData);
    if (ObjectUtils_isEqual(muscleMultipliers, getDefaultMusclesAndMultipliersAsObject(exercise, props.settings))) {
      delete newExerciseData[Exercise_toKey(exercise)];
    } else {
      const ed = newExerciseData[Exercise_toKey(exercise)] || {};
      ed.muscleMultipliers = muscleMultipliers;
      newExerciseData[Exercise_toKey(exercise)] = ed;
    }
    props.onNewExerciseData(newExerciseData);
    props.onClose();
  };

  return (
    <View className="flex-1" style={{ marginTop: -12 }}>
      <SheetDragHandle>
        <View className="flex-row items-center pt-0 pb-4 mt-2">
          <Pressable
            className="px-4 py-2"
            hitSlop={12}
            data-cy="muscle-overrides-close" data-testid="muscle-overrides-close"
            testID="muscle-overrides-close"
            onPress={props.onClose}
          >
            <IconClose2 size={22} />
          </Pressable>
          <View className="flex-1" />
          <View className="px-4">
            <Button
              kind="purple"
              buttonSize="md"
              name="save-muscle-overrides"
              data-cy="save-muscle-overrides" data-testid="save-muscle-overrides"
              onClick={handleSave}
            >
              Save
            </Button>
          </View>
          <View className="absolute top-0 left-0 right-0 items-center" pointerEvents="box-none">
            <View>
              <Text className="font-semibold">Override Muscles</Text>
              <View className="items-center">
                <LinkButton
                  data-cy="toggle-muscle-overrides" data-testid="toggle-muscle-overrides" testID="toggle-muscle-overrides"
                  name="toggle-muscle-overrides"
                  className="text-xs"
                  onClick={() =>
                    openMusclePicker({
                      title: "Toggle Muscles",
                      name: "muscle-override-picker",
                      selectedMuscles: musclesAndMultipliers.map((mm) => mm.muscle),
                    })
                  }
                >
                  + Add Muscles
                </LinkButton>
              </View>
            </View>
          </View>
        </View>
      </SheetDragHandle>
      <ScrollView
        className="flex-1 pb-4"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View className="px-4">
          <MusclesOverrideList
            musclesAndMultipliers={musclesAndMultipliers}
            setMusclesAndMultipliers={setMusclesAndMultipliers}
            helps={props.helps}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function MusclesOverrideList(props: {
  musclesAndMultipliers: IMuscleAndMultiplierOpt[];
  setMusclesAndMultipliers: React.Dispatch<React.SetStateAction<IMuscleAndMultiplierOpt[]>>;
  helps: string[];
  settings: ISettings;
  dispatch?: IDispatch;
}): JSX.Element {
  const { musclesAndMultipliers, setMusclesAndMultipliers } = props;
  return (
    <>
      <View style={{ maxWidth: 640 }}>
        <Nux id="muscle-override-help" helps={props.helps} dispatch={props.dispatch}>
          <View>
            <Text className="text-xs">
              Here you can override the muscles for this exercise. This affects how the volume / number of sets is
              calculated for this exercise.
            </Text>
            <Text className="text-xs">
              For each muscle, you can set a multiplier - from <Text className="text-xs font-bold">0</Text> to{" "}
              <Text className="text-xs font-bold">1</Text>. If it's 1 - it's a{" "}
              <Text className="text-xs font-bold">target muscle</Text>, and we count each set as a full one when we
              calculate the volume. If it's less 1 - it's a <Text className="text-xs font-bold">synergist</Text> muscle,
              and we apply the specified multiplier to the number of sets.
            </Text>
            <Text className="text-xs">
              These multipliers takes precedence over the default target/synergist multiplier.
            </Text>
          </View>
        </Nux>
      </View>
      {musclesAndMultipliers.map((mm) => {
        const muscleGroup = Muscle_getScreenMusclesFromMuscle(mm.muscle, props.settings)[0];
        if (muscleGroup == null) {
          return null;
        }
        return (
          <MenuItemWrapper key={mm.muscle} name={`muscle-override-${StringUtils_dashcase(mm.muscle)}`}>
            <View className="py-2">
              <View className="flex-row items-center gap-2">
                <View>
                  <MuscleImage muscle={mm.muscle} size={61} />
                </View>
                <View className="flex-1">
                  <Text className="leading-5">{mm.muscle}</Text>
                  <Text className="text-xs text-text-secondary">
                    {Muscle_getMuscleGroupName(muscleGroup, props.settings)}
                  </Text>
                </View>
                <View className="w-12">
                  <TextInput
                    testID={`muscle-multiplier-${StringUtils_dashcase(mm.muscle)}-input`}
                    data-cy={`muscle-multiplier-${StringUtils_dashcase(mm.muscle)}-input`} data-testid={`muscle-multiplier-${StringUtils_dashcase(mm.muscle)}-input`}
                    className="px-2 py-2 text-base leading-5 text-center border rounded-md bg-background-default border-border-prominent"
                    keyboardType="decimal-pad"
                    value={mm.multiplier != null ? String(mm.multiplier) : ""}
                    onChangeText={(text) => {
                      setMusclesAndMultipliers((mms) =>
                        mms.map((x) => (x.muscle === mm.muscle ? { ...x, multiplier: text } : x))
                      );
                    }}
                    onBlur={() => {
                      const finalValue = getMultiplierValue(mm.multiplier);
                      setMusclesAndMultipliers((mms) =>
                        mms.map((x) => (x.muscle === mm.muscle ? { ...x, multiplier: finalValue } : x))
                      );
                    }}
                  />
                </View>
                <View className="ml-4">
                  <Pressable
                    data-cy={`remove-muscle-override-${StringUtils_dashcase(mm.muscle)}`} data-testid={`remove-muscle-override-${StringUtils_dashcase(mm.muscle)}`}
                    testID={`remove-muscle-override-${StringUtils_dashcase(mm.muscle)}`}
                    onPress={() => {
                      setMusclesAndMultipliers((mms) => mms.filter((x) => x.muscle !== mm.muscle));
                    }}
                  >
                    <IconTrash />
                  </Pressable>
                </View>
              </View>
            </View>
          </MenuItemWrapper>
        );
      })}
    </>
  );
}

export function BottomSheetMusclesOverride(props: IBottomSheetMusclesOverrideProps): JSX.Element {
  return (
    <BottomSheetOrModal shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
      <BottomSheetMusclesOverrideContent
        exerciseType={props.exerciseType}
        settings={props.settings}
        helps={props.helps}
        onNewExerciseData={props.onNewExerciseData}
        onClose={props.onClose}
        dispatch={props.dispatch}
      />
    </BottomSheetOrModal>
  );
}
