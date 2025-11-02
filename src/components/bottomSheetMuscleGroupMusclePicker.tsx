import { JSX, h } from "preact";
import { ISettings, IMuscle, IScreenMuscle } from "../types";
import { Button } from "./button";
import { ExercisePickerOptionsMuscles } from "./exercisePicker/exercisePickerOptionsMuscles";
import { BottomSheetOrModal } from "./bottomSheetOrModal";
import { Muscle } from "../models/muscle";

interface IExercisePickerCustomExerciseContentProps {
  settings: ISettings;
  onSelect: (muscle: IMuscle) => void;
  muscleGroup: IScreenMuscle;
  onClose: () => void;
}

export function BottomSheetMuscleGroupMusclePicker(props: IExercisePickerCustomExerciseContentProps): JSX.Element {
  const muscles = Muscle.getMusclesFromScreenMuscle(props.muscleGroup, props.settings);
  return (
    <BottomSheetOrModal shouldShowClose={true} onClose={props.onClose} isHidden={false} zIndex={60}>
      <div className="flex flex-col h-full px-4 py-2" style={{ marginTop: "-0.5rem" }}>
        <h3 className="pt-2 pb-3 text-base font-semibold text-center">Choose Muscles</h3>
        <div className="flex-1 overflow-y-auto">
          <div className="pb-4">
            <ExercisePickerOptionsMuscles
              dontGroup={true}
              settings={props.settings}
              selectedValues={muscles}
              onSelect={props.onSelect}
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
            onClick={props.onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </BottomSheetOrModal>
  );
}
