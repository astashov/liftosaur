import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import {
  MusclesOverrideList,
  getInitialMusclesAndMultipliers,
  getDefaultMusclesAndMultipliersAsObject,
  getMultiplierValue,
} from "../../components/bottomSheetMusclesOverride";
import { Button } from "../../components/button";
import { LinkButton } from "../../components/linkButton";
import { ISettings } from "../../types";
import { updateSettings } from "../../models/state";
import { lb } from "lens-shmens";
import { Exercise_get, Exercise_toKey } from "../../models/exercise";
import { ObjectUtils_clone, ObjectUtils_isEqual } from "../../utils/object";
import { useModal } from "../ModalStateContext";
import { CollectionUtils_sort } from "../../utils/collection";
import type { IRootStackParamList } from "../types";

export function NavModalMusclesOverride(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "musclesOverrideModal";
    params: IRootStackParamList["musclesOverrideModal"];
  }>();
  const { exerciseType } = route.params;
  const settings = state.storage.settings;
  const exercise = Exercise_get(exerciseType, settings.exercises);

  const [musclesAndMultipliers, setMusclesAndMultipliers] = useState(
    getInitialMusclesAndMultipliers(exercise, settings)
  );

  const openMusclePicker = useModal("exerciseMusclesPickerModal", (selectedMuscles) => {
    setMusclesAndMultipliers((mms) => {
      const existing = new Map(mms.map((mm) => [mm.muscle, mm]));
      const next = selectedMuscles.map((muscle) => existing.get(muscle) ?? { muscle, multiplier: 1 });
      return CollectionUtils_sort(next, (a, b) => a.muscle.localeCompare(b.muscle));
    });
  });

  const onClose = (): void => {
    navigation.goBack();
  };

  const onSave = (): void => {
    const muscleMultipliers: Partial<Record<string, number>> = {};
    for (const mm of musclesAndMultipliers) {
      muscleMultipliers[mm.muscle] = getMultiplierValue(mm.multiplier);
    }
    const exerciseData = settings.exerciseData;
    const newExerciseData = ObjectUtils_clone(exerciseData);
    if (ObjectUtils_isEqual(muscleMultipliers, getDefaultMusclesAndMultipliersAsObject(exercise, settings))) {
      delete newExerciseData[Exercise_toKey(exercise)];
    } else {
      const ed = newExerciseData[Exercise_toKey(exercise)] || {};
      ed.muscleMultipliers = muscleMultipliers;
      newExerciseData[Exercise_toKey(exercise)] = ed;
    }
    updateSettings(
      dispatch,
      lb<ISettings>().p("exerciseData").record(newExerciseData),
      "Update exercise muscle override"
    );
    onClose();
  };

  const header = (
    <View className="flex-row items-center py-4">
      <View className="items-center flex-1">
        <Text className="text-base font-semibold leading-6">Override Muscles</Text>
        <LinkButton
          data-testid="toggle-muscle-overrides"
          testID="toggle-muscle-overrides"
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
      <View className="absolute right-4">
        <Button
          kind="purple"
          buttonSize="md"
          name="save-muscle-overrides"
          data-testid="save-muscle-overrides"
          testID="save-muscle-overrides"
          onPress={onSave}
        >
          Save
        </Button>
      </View>
    </View>
  );

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet header={header}>
        <MusclesOverrideList
          musclesAndMultipliers={musclesAndMultipliers}
          setMusclesAndMultipliers={setMusclesAndMultipliers}
          helps={state.storage.helps}
          settings={settings}
          dispatch={dispatch}
        />
      </FormSheet>
    </SheetScreenContainer>
  );
}
