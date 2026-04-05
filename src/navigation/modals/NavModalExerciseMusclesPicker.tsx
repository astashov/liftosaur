import { JSX, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
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
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <div className="flex flex-col h-full px-4" style={{ marginTop: "-0.75rem" }}>
        <h3 className="pt-6 pb-3 text-base font-semibold text-center">{data.title}</h3>
        <div className="flex-1 overflow-y-auto">
          <div className="pb-4">
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
          </div>
        </div>
        <div className="py-2 bg-background-default">
          <Button
            kind="purple"
            data-cy="done-selecting-muscles"
            name="done-selecting-muscles"
            className="w-full"
            buttonSize="md"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </SheetScreenContainer>
  );
}
