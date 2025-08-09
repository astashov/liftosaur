import { JSX, h } from "preact";
import { ISettings, IExerciseType, IExercisePickerState } from "../../types";
import { GroupHeader } from "../groupHeader";
import { ExercisePickerExerciseItem } from "./exercisePickerExerciseItem";
import { Exercise } from "../../models/exercise";

interface IExercisePickerCurrentExerciseProps {
  exerciseType: IExerciseType;
  state: IExercisePickerState;
  settings: ISettings;
}

export function ExercisePickerCurrentExercise(props: IExercisePickerCurrentExerciseProps): JSX.Element {
  const exercise = Exercise.get(props.exerciseType, props.settings.exercises);
  return (
    <div className="mx-4 mb-3">
      <GroupHeader name="Current Exercise" />
      <div className="px-2 border bg-purplev3-50 border-purplev3-200 rounded-2xl">
        <ExercisePickerExerciseItem
          exercise={exercise}
          settings={props.settings}
          showMuscles={props.state.showMuscles}
          isEnabled={true}
        />
      </div>
    </div>
  );
}
