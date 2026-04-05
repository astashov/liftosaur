import { JSX } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { ExercisePickerOptionsMuscles } from "../../components/exercisePicker/exercisePickerOptionsMuscles";
import { Button } from "../../components/button";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { lf } from "lens-shmens";
import { Muscle_getMusclesFromScreenMuscle, Muscle_updateMuscleGroup } from "../../models/muscle";
import { CollectionUtils_remove } from "../../utils/collection";
import type { IRootStackParamList } from "../types";

export function NavModalMuscleGroupMusclePicker(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
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
      <div className="flex flex-col h-full px-4 py-2" style={{ marginTop: "-0.5rem" }}>
        <h3 className="pt-2 pb-3 text-base font-semibold text-center">Choose Muscles</h3>
        <div className="flex-1 overflow-y-auto">
          <div className="pb-4">
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
