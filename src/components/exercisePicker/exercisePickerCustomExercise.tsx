import { JSX, h } from "preact";
import { ISettings, ICustomExercise, IExercisePickerScreen } from "../../types";
import { Button } from "../button";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconBack } from "../icons/iconBack";
import { IconClose2 } from "../icons/iconClose2";
import { ObjectUtils_isEqual } from "../../utils/object";
import { ExercisePickerCustomExerciseContent } from "./exercisePickerCustomExerciseContent";
import { useState } from "preact/hooks";
import { Exercise_getNotes } from "../../models/exercise";

interface IExercisePickerCustomExercise2Props {
  settings: ISettings;
  screenStack: IExercisePickerScreen[];
  originalExercise?: ICustomExercise;
  showMuscles: boolean;
  exercise: ICustomExercise;
  isLoggedIn: boolean;
  dispatch: ILensDispatch<ICustomExercise>;
  onGoBack: (string: string) => void;
  onClose: () => void;
  onChange: (action: "upsert" | "delete", exercise: ICustomExercise, notes?: string) => void;
}

export function ExercisePickerCustomExercise(props: IExercisePickerCustomExercise2Props): JSX.Element {
  const isEdited = !props.originalExercise || !ObjectUtils_isEqual(props.exercise, props.originalExercise);
  const isValid = props.exercise.name.trim().length ?? 0 > 0;
  const [notes, setNotes] = useState<string | undefined>(
    props.exercise ? Exercise_getNotes(props.exercise, props.settings) : undefined
  );

  return (
    <div className="flex flex-col h-full" style={{ marginTop: "-0.75rem" }}>
      <div className="relative py-4 mt-2">
        <div className="absolute flex top-2 left-2">
          <div>
            <button
              className="p-2 nm-back"
              data-cy="navbar-back"
              onClick={() => {
                props.onGoBack("Pop screen in exercise picker screen stack");
              }}
            >
              {props.screenStack.length > 1 ? <IconBack /> : <IconClose2 size={22} />}
            </button>
          </div>
        </div>
        <h3 className="px-4 font-semibold text-center">{props.exercise ? "Edit" : "Create"} Custom Exercise</h3>
        <div className="absolute flex top-3 right-4">
          <div>
            <Button
              kind="purple"
              buttonSize="md"
              disabled={!isEdited || !isValid}
              name="navbar-save-custom-exercise"
              className="p-2 nm-save-custom-exercise"
              data-cy="custom-exercise-create"
              onClick={(e) => {
                e.preventDefault();
                props.onChange("upsert", props.exercise, notes);
                props.onGoBack("Save custom exercise");
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 pb-4 overflow-y-auto">
        <div className="px-4">
          <ExercisePickerCustomExerciseContent
            onGoBack={props.onGoBack}
            settings={props.settings}
            hideNotes={false}
            hideDeleteButton={false}
            notes={notes}
            setNotes={setNotes}
            originalExercise={props.originalExercise}
            showMuscles={props.showMuscles}
            exercise={props.exercise}
            isLoggedIn={props.isLoggedIn}
            dispatch={props.dispatch}
            onClose={props.onClose}
            onDelete={() => {
              props.onChange("delete", props.exercise);
            }}
          />
        </div>
      </div>
    </div>
  );
}
