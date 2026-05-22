import { JSX } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { ExercisePickerOptionsMuscles } from "../../components/exercisePicker/exercisePickerOptionsMuscles";
import { Button } from "../../components/button";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { lf } from "lens-shmens";
import { Muscle_getMusclesFromScreenMuscle, Muscle_updateMuscleGroup } from "../../models/muscle";
import { CollectionUtils_remove } from "../../utils/collection";
import type { IRootStackParamList } from "../types";

const SHEET_DETENT = 0.9;

export function NavModalMuscleGroupMusclePicker(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const { height: windowHeight } = useWindowDimensions();
  const route = useRoute<{
    key: string;
    name: "muscleGroupMusclePickerModal";
    params: IRootStackParamList["muscleGroupMusclePickerModal"];
  }>();
  const { muscleGroup } = route.params;
  const settings = state.storage.settings;
  const muscles = Muscle_getMusclesFromScreenMuscle(muscleGroup, settings);

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        <View style={{ height: windowHeight * SHEET_DETENT }}>
          <View className="px-4 flex-row items-center pt-2 pb-3">
            <Text className="flex-1 text-base font-semibold text-center">Choose Muscles</Text>
            <View className="absolute right-4">
              <Button
                kind="purple"
                buttonSize="md"
                name="done-selecting-muscles"
                data-testid="done-selecting-muscles"
                testID="done-selecting-muscles"
                onClick={onClose}
              >
                Done
              </Button>
            </View>
          </View>
          <ScrollView className="flex-1">
            <View className="px-4 pb-8">
              <ExercisePickerOptionsMuscles
                dontGroup={true}
                settings={settings}
                selectedValues={muscles}
                onSelect={(muscle) => {
                  const existingMuscles = Muscle_getMusclesFromScreenMuscle(muscleGroup, state.storage.settings);
                  const newMuscles = existingMuscles.includes(muscle)
                    ? CollectionUtils_remove(existingMuscles, muscle)
                    : [...existingMuscles, muscle];
                  updateState(
                    dispatch,
                    [
                      lb<IState>()
                        .p("storage")
                        .p("settings")
                        .p("muscleGroups")
                        .record(
                          lf(state.storage.settings)
                            .p("muscleGroups")
                            .modify((mg) => Muscle_updateMuscleGroup(mg, muscleGroup, newMuscles)).muscleGroups
                        ),
                    ],
                    "Update muscle group muscles"
                  );
                }}
              />
            </View>
          </ScrollView>
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
