import { JSX, h } from "preact";
import { useState } from "preact/hooks";
import { Exercise } from "../../models/exercise";
import {
  ISettings,
  ICustomExercise,
  IMuscle,
  IExerciseKind,
  availableMuscles,
  exerciseKinds,
  IExercisePickerState,
  IExercisePickerScreen,
} from "../../types";
import { Button } from "../button";
import { LabelAndInput } from "../labelAndInput";
import { Multiselect } from "../multiselect";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { IconBack } from "../icons/iconBack";
import { SetUtils } from "../../utils/setUtils";
import { IconClose2 } from "../icons/iconClose2";

interface IExercisePickerCustomExerciseProps {
  settings: ISettings;
  screenStack: IExercisePickerScreen[];
  exercise?: ICustomExercise;
  customExerciseName?: string;
  dispatch: ILensDispatch<IExercisePickerState>;
  onClose: () => void;
  onChange: (action: "upsert" | "delete", exercise: ICustomExercise) => void;
}

export function ExercisePickerCustomExercise(props: IExercisePickerCustomExerciseProps): JSX.Element {
  const customExercises = props.settings.exercises;
  const [name, setName] = useState<string>(props.exercise?.name || props.customExerciseName || "");
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [targetMuscles, setTargetMuscles] = useState<IMuscle[]>(props.exercise?.meta.targetMuscles || []);
  const [synergistMuscles, setSynergistMuscles] = useState<IMuscle[]>(props.exercise?.meta.synergistMuscles || []);
  const [types, setTypes] = useState<IExerciseKind[]>(props.exercise?.types || []);
  const [smallImageUrl, setSmallImageUrl] = useState<string>(props.exercise?.smallImageUrl || "");
  const [largeImageUrl, setLargeImageUrl] = useState<string>(props.exercise?.largeImageUrl || "");
  const exercise = props.exercise;

  function goBack(desc: string): void {
    if (props.screenStack.length > 1) {
      props.dispatch(
        [
          lb<IExercisePickerState>()
            .p("screenStack")
            .recordModify((stack) => stack.slice(0, -1)),
          lb<IExercisePickerState>().p("editCustomExercise").record(undefined),
        ],
        desc
      );
    } else {
      props.onClose();
    }
  }

  const isChanged =
    exercise != null &&
    (name !== exercise.name ||
      !SetUtils.areEqual(new Set(targetMuscles), new Set(exercise.meta.targetMuscles)) ||
      !SetUtils.areEqual(new Set(synergistMuscles), new Set(exercise.meta.synergistMuscles)) ||
      !SetUtils.areEqual(new Set(types), new Set(exercise.types)) ||
      smallImageUrl !== exercise.smallImageUrl ||
      largeImageUrl !== exercise.largeImageUrl);

  return (
    <div className="flex flex-col h-full" style={{ marginTop: "-0.75rem" }}>
      <div className="relative py-4 mt-2">
        <div className="absolute flex top-2 left-2">
          <div>
            <button
              className="p-2 nm-back"
              data-cy="navbar-back"
              onClick={() => {
                if (isChanged) {
                  if (!confirm("You have unsaved changes. Are you sure you want to go back?")) {
                    return;
                  }
                }
                goBack("Pop screen in exercise picker screen stack");
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
              disabled={exercise != null && !isChanged}
              name="navbar-save-custom-exercise"
              className="p-2 nm-save-custom-exercise"
              data-cy="custom-exercise-create"
              onClick={(e) => {
                e.preventDefault();
                if (!name) {
                  setNameError("Name cannot be empty");
                } else if (props.exercise?.name !== name && Exercise.exists(name, customExercises)) {
                  setNameError("Name already taken");
                } else {
                  setNameError(undefined);
                  const cleanedSmallImageUrl = smallImageUrl.trim();
                  const cleanedLargeImageUrl = largeImageUrl.trim();
                  const newExercise = props.exercise
                    ? Exercise.editCustomExercise(
                        props.exercise,
                        name,
                        targetMuscles,
                        synergistMuscles,
                        types,
                        cleanedSmallImageUrl,
                        cleanedLargeImageUrl
                      )
                    : Exercise.createCustomExercise(
                        name,
                        targetMuscles,
                        synergistMuscles,
                        types,
                        cleanedSmallImageUrl,
                        cleanedLargeImageUrl
                      );
                  props.onChange("upsert", newExercise);
                  goBack("Save custom exercise");
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 pb-4 overflow-y-auto">
        <form className="mx-4" onSubmit={(e) => e.preventDefault()}>
          <LabelAndInput
            star={true}
            identifier="custom-exercise-name"
            label="Name"
            errorMessage={nameError}
            value={name}
            placeholder="Super Squat"
            onInput={(e) => {
              if (e.currentTarget.value != null) {
                setName(e.currentTarget.value?.trim() || "");
              }
            }}
          />
          <Multiselect
            id="target_muscles"
            label="Target Muscles"
            values={availableMuscles}
            initialSelectedValues={new Set(props.exercise?.meta.targetMuscles || [])}
            onChange={(muscles) => setTargetMuscles(Array.from(muscles) as IMuscle[])}
          />
          <Multiselect
            id="synergist_muscles"
            label="Synergist Muscles"
            values={availableMuscles}
            initialSelectedValues={new Set(props.exercise?.meta.synergistMuscles || [])}
            onChange={(muscles) => setSynergistMuscles(Array.from(muscles) as IMuscle[])}
          />
          <Multiselect
            id="types"
            label="Types"
            values={exerciseKinds}
            initialSelectedValues={new Set(props.exercise?.types || [])}
            onChange={(t) => setTypes(Array.from(t) as IExerciseKind[])}
          />
          <LabelAndInput
            identifier="custom-exercise-small-image"
            label="Small Image Url"
            value={smallImageUrl}
            hint="1:1 aspect ratio, >= 150px width"
            placeholder="https://www.img.com/small.jpg"
            onInput={(e) => {
              if (e.currentTarget.value != null) {
                setSmallImageUrl(e.currentTarget.value);
              }
            }}
          />
          <LabelAndInput
            identifier="custom-exercise-large-image"
            label="Large Image Url"
            value={largeImageUrl}
            hint="4:3 aspect ratio, >= 800px width"
            placeholder="https://www.img.com/large.jpg"
            onInput={(e) => {
              if (e.currentTarget.value != null) {
                setLargeImageUrl(e.currentTarget.value);
              }
            }}
          />
          {exercise != null && (
            <div>
              <Button
                name="delete-custom-exercise"
                kind="red"
                data-cy="custom-exercise-delete"
                buttonSize="md"
                className="w-full mt-4"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this exercise? This action cannot be undone.")) {
                    props.onChange("delete", exercise);
                  }
                  goBack("Delete custom exercise");
                }}
              >
                Delete Exercise
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
