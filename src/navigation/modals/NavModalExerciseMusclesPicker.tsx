import { JSX, useState } from "react";
import { View, ScrollView } from "react-native";
import { Text } from "../../components/primitives/text";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { Button } from "../../components/button";
import { ExercisePickerOptionsMuscles } from "../../components/exercisePicker/exercisePickerOptionsMuscles";
import { IMuscle } from "../../types";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";

export function NavModalExerciseMusclesPicker(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("exerciseMusclesPickerModal");
  const [selectedMuscles, setSelectedMuscles] = useState<IMuscle[]>(data?.selectedMuscles ?? []);

  const onClose = (): void => {
    Modal_setResult(modalDispatch, "exerciseMusclesPickerModal", selectedMuscles);
    Modal_clear(modalDispatch, "exerciseMusclesPickerModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <>
      <View collapsable={false} className="flex-row items-center px-4 my-6">
        <Text className="flex-1 text-base font-semibold leading-6 text-center">{data.title}</Text>
        <View className="absolute right-4">
          <Button
            kind="purple"
            data-cy="done-selecting-muscles"
            name="done-selecting-muscles"
            buttonSize="md"
            onPress={onClose}
          >
            Done
          </Button>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <ExercisePickerOptionsMuscles
          selectedValues={selectedMuscles}
          onSelect={(muscle) => {
            setSelectedMuscles((prev) => {
              const current = new Set(prev);
              if (current.has(muscle)) {
                current.delete(muscle);
              } else {
                current.add(muscle);
              }
              return Array.from(current).sort();
            });
          }}
          settings={state.storage.settings}
        />
      </ScrollView>
    </>
  );
}
