import { h, JSX } from "preact";
import { Ref, useRef, useState } from "preact/hooks";
import { Modal } from "./modal";
import { StringUtils } from "../utils/string";
import { availableMuscles, ICustomExercise, IEquipment, IExerciseId, IMuscle, ISettings } from "../types";
import { GroupHeader } from "./groupHeader";
import { SemiButton } from "./semiButton";
import { forwardRef } from "preact/compat";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { EditCustomExercise } from "../models/editCustomExercise";
import { ObjectUtils } from "../utils/object";
import { IconEdit } from "./icons/iconEdit";
import { IconDelete } from "./icons/iconDelete";
import { HtmlUtils } from "../utils/html";
import { LabelAndInput } from "./labelAndInput";
import { LabelAndSelect } from "./labelAndSelect";
import { Multiselect } from "./multiselect";
import { equipmentName, Exercise } from "../models/exercise";

interface IModalDateProps {
  isHidden: boolean;
  settings: ISettings;
  onChange: (value?: IExerciseId) => void;
  dispatch: IDispatch;
}

export function ModalExercise(props: IModalDateProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");
  const [isCustomExerciseDisplayed, setIsCustomExerciseDisplayed] = useState<boolean>(false);
  const [editingExercise, setEditingExercise] = useState<ICustomExercise | undefined>(undefined);

  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.onChange()}
      isFullWidth={true}
    >
      {isCustomExerciseDisplayed ? (
        <CustomExerciseForm
          exercise={editingExercise}
          setIsCustomExerciseDisplayed={setIsCustomExerciseDisplayed}
          settings={props.settings}
          dispatch={props.dispatch}
        />
      ) : (
        <ExercisesList
          dispatch={props.dispatch}
          filter={filter}
          setFilter={setFilter}
          setIsCustomExerciseDisplayed={setIsCustomExerciseDisplayed}
          setEditingExercise={setEditingExercise}
          textInput={textInput}
          onChange={props.onChange}
          settings={props.settings}
        />
      )}
    </Modal>
  );
}

interface IExercisesListProps {
  settings: ISettings;
  filter: string;
  setFilter: (newFilter: string) => void;
  setEditingExercise: (exercise?: ICustomExercise) => void;
  setIsCustomExerciseDisplayed: (value: boolean) => void;
  onChange: (value?: IExerciseId) => void;
  textInput: Ref<HTMLInputElement>;
  dispatch: IDispatch;
}

const ExercisesList = forwardRef(
  (props: IExercisesListProps): JSX.Element => {
    const { textInput, setFilter, filter } = props;

    let exercises = Exercise.all({});
    if (filter) {
      exercises = exercises.filter((e) => StringUtils.fuzzySearch(filter, e.name.toLowerCase()));
    }
    const customExercises = props.settings.exercises;

    return (
      <form data-cy="modal-exercise" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          className="focus:outline-none focus:shadow-outline block w-full px-4 py-2 mb-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none"
          type="text"
          placeholder="Filter"
          onInput={() => {
            setFilter(textInput.current.value.toLowerCase());
          }}
        />
        <GroupHeader name="Custom exercises" />
        {ObjectUtils.keys(customExercises)
          .filter((id) => !customExercises[id]?.isDeleted)
          .map((id) => {
            const e = customExercises[id]!;
            return (
              <section
                data-cy={`menu-item-${StringUtils.dashcase(e.name)}`}
                className="w-full px-2 py-1 text-left border-b border-gray-200"
                onClick={(event) => {
                  if (!HtmlUtils.classInParents(event.target as Element, "button")) {
                    props.onChange(e.id);
                  }
                }}
              >
                <section className="flex items-center">
                  <button
                    className="button px-3 py-4"
                    data-cy={`custom-exercise-edit-${StringUtils.dashcase(e.name)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      props.setEditingExercise(e);
                      props.setIsCustomExerciseDisplayed(true);
                    }}
                  >
                    <IconEdit size={21} lineColor="#0D2B3E" penColor="#A5B3BB" />
                  </button>
                  <div className="flex items-center flex-1 py-2 text-left">{e.name}</div>
                  <button
                    className="button px-1 py-4"
                    data-cy={`custom-exercise-delete-${StringUtils.dashcase(e.name)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      if (confirm(`Are you sure you want to delete ${e.name}?`)) {
                        EditCustomExercise.markDeleted(props.dispatch, e.id);
                      }
                    }}
                  >
                    <IconDelete />
                  </button>
                </section>
              </section>
            );
          })}
        <SemiButton
          data-cy="custom-exercise-create"
          onClick={(event) => {
            event.preventDefault();
            props.setEditingExercise(undefined);
            props.setIsCustomExerciseDisplayed(true);
          }}
        >
          Add Custom Exercise +
        </SemiButton>
        <GroupHeader name="Built-in exercises" />
        {exercises.map((e) => {
          const equipment = Exercise.defaultEquipment(e.id, customExercises);
          return (
            <section
              data-cy={`menu-item-${StringUtils.dashcase(e.name)}`}
              className="w-full px-2 py-1 text-left border-b border-gray-200"
              onClick={() => {
                props.onChange(e.id);
              }}
            >
              <section className="flex items-center">
                <div className="w-12 pr-2">
                  {equipment && (
                    <img
                      src={`https://www.liftosaur.com/externalimages/exercises/single/small/${e.id.toLowerCase()}_${equipment.toLowerCase()}_single_small.png`}
                      alt={`${e.name} image`}
                    />
                  )}
                </div>
                <div className="flex items-center flex-1 py-2 text-left">{e.name}</div>
              </section>
            </section>
          );
        })}
      </form>
    );
  }
);

interface IEditCustomExerciseProps {
  settings: ISettings;
  exercise?: ICustomExercise;
  setIsCustomExerciseDisplayed: (value: boolean) => void;
  dispatch: IDispatch;
}

function CustomExerciseForm(props: IEditCustomExerciseProps): JSX.Element {
  const customExercises = props.settings.exercises;
  const equipmentOptions: [IEquipment, string][] = Exercise.sortedEquipments("squat").map((e) => [e, equipmentName(e)]);
  const [name, setName] = useState<string>(props.exercise?.name || "");
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [equipment, setEquipment] = useState<IEquipment>(props.exercise?.defaultEquipment || "barbell");
  const [targetMuscles, setTargetMuscles] = useState<IMuscle[]>([]);
  const [synergistMuscles, setSynergistMuscles] = useState<IMuscle[]>([]);

  return (
    <form>
      <LabelAndInput
        identifier="custom-exercise-name"
        label="Name"
        errorMessage={nameError}
        value={name}
        placeholder="Super Squat"
        onInput={(e) => {
          if (e.currentTarget.value != null) {
            setName(e.currentTarget.value);
          }
        }}
      />
      <LabelAndSelect
        identifier="custom-exercise-equipment"
        label="Default Equipment"
        value={equipment}
        onChange={(event) => {
          const value = event.currentTarget.value;
          if (value != null) {
            setEquipment(value as IEquipment);
          }
        }}
      >
        {equipmentOptions.map(([key, value]) => (
          <option value={key} selected={key === equipment}>
            {value}
          </option>
        ))}
      </LabelAndSelect>
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
      <div class="py-4 flex">
        <div class="flex-1">
          <Button
            kind="gray"
            data-cy="custom-exercise-cancel"
            onClick={(e) => {
              e.preventDefault();
              props.setIsCustomExerciseDisplayed(false);
            }}
          >
            Back to list
          </Button>
        </div>
        <div class="flex-1 text-right">
          <Button
            kind="green"
            data-cy="custom-exercise-create"
            onClick={(e) => {
              e.preventDefault();
              if (!name) {
                setNameError("Name cannot be empty");
              } else if (props.exercise?.name !== name && Exercise.exists(name, customExercises)) {
                setNameError("Name already taken");
              } else {
                setNameError(undefined);
                EditCustomExercise.createOrUpdate(
                  props.dispatch,
                  name,
                  equipment,
                  targetMuscles,
                  synergistMuscles,
                  props.exercise
                );
                props.setIsCustomExerciseDisplayed(false);
              }
            }}
          >
            {props.exercise != null ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}
