import { h, JSX } from "preact";
import { Ref, useRef, useState } from "preact/hooks";
import { Modal } from "./modal";
import { StringUtils } from "../utils/string";
import {
  availableMuscles,
  ICustomExercise,
  IEquipment,
  IExerciseId,
  IMuscle,
  ISettings,
  exerciseKinds,
  IExerciseKind,
} from "../types";
import { GroupHeader } from "./groupHeader";
import { forwardRef } from "preact/compat";
import { Button } from "./button";
import { ObjectUtils } from "../utils/object";
import { HtmlUtils } from "../utils/html";
import { LabelAndInput } from "./labelAndInput";
import { LabelAndSelect } from "./labelAndSelect";
import { Multiselect } from "./multiselect";
import { equipmentName, Exercise, IExercise } from "../models/exercise";
import { LinkButton } from "./linkButton";
import { IconTrash } from "./icons/iconTrash";
import { ExerciseImage } from "./exerciseImage";
import { IconEditSquare } from "./icons/iconEditSquare";
import { IconDefaultExercise } from "./icons/iconDefaultExercise";
import { Muscle, screenMuscles } from "../models/muscle";
import { CollectionUtils } from "../utils/collection";

interface IModalExerciseProps {
  isHidden: boolean;
  settings: ISettings;
  initialFilter?: string;
  initialFilterTypes?: string[];
  onChange: (value?: IExerciseId) => void;
  onCreateOrUpdate: (
    name: string,
    equipment: IEquipment,
    targetMuscles: IMuscle[],
    synergistMuscles: IMuscle[],
    types: IExerciseKind[],
    exercise?: ICustomExercise
  ) => void;
  onDelete: (id: string) => void;
}

export function ModalExercise(props: IModalExerciseProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>(props.initialFilter || "");
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
          onCreateOrUpdate={props.onCreateOrUpdate}
        />
      ) : (
        <ExercisesList
          filter={filter}
          initialFilterTypes={props.initialFilterTypes}
          setFilter={setFilter}
          setIsCustomExerciseDisplayed={setIsCustomExerciseDisplayed}
          setEditingExercise={setEditingExercise}
          textInput={textInput}
          onChange={props.onChange}
          onDelete={props.onDelete}
          settings={props.settings}
        />
      )}
    </Modal>
  );
}

interface IExercisesListProps {
  settings: ISettings;
  filter: string;
  initialFilterTypes?: string[];
  setFilter: (newFilter: string) => void;
  setEditingExercise: (exercise?: ICustomExercise) => void;
  setIsCustomExerciseDisplayed: (value: boolean) => void;
  onChange: (value?: IExerciseId) => void;
  onDelete: (id: string) => void;
  textInput: Ref<HTMLInputElement>;
}

const ExercisesList = forwardRef(
  (props: IExercisesListProps): JSX.Element => {
    const { textInput, setFilter, filter } = props;

    let exercises = Exercise.all({});
    let customExercises = props.settings.exercises;
    const filterOptions = [...exerciseKinds.map(StringUtils.capitalize), ...screenMuscles.map(StringUtils.capitalize)];
    const initialFilterOptions = (props.initialFilterTypes || []).filter((ft) => filterOptions.indexOf(ft) !== -1);
    const [filterTypes, setFilterTypes] = useState<string[]>(initialFilterOptions);
    if (filter) {
      exercises = exercises.filter((e) => StringUtils.fuzzySearch(filter.toLowerCase(), e.name.toLowerCase()));
      customExercises = ObjectUtils.filter(customExercises, (e, v) =>
        v ? StringUtils.fuzzySearch(filter, v.name.toLowerCase()) : true
      );
    }
    if (filterTypes && filterTypes.length > 0) {
      exercises = exercises.filter((e) => {
        const targetMuscleGroups = Exercise.targetMusclesGroups(e, {}).map(StringUtils.capitalize);
        const synergistMuscleGroups = Exercise.synergistMusclesGroups(e, {}).map(StringUtils.capitalize);
        return filterTypes.every((ft) => {
          return (
            targetMuscleGroups.indexOf(ft) !== -1 ||
            synergistMuscleGroups.indexOf(ft) !== -1 ||
            e.types.map(StringUtils.capitalize).indexOf(ft) !== -1
          );
        });
      });
      customExercises = ObjectUtils.filter(customExercises, (_id, exercise) => {
        if (!exercise) {
          return false;
        }
        const targetMuscleGroups = Array.from(
          new Set(CollectionUtils.flat(exercise.meta.targetMuscles.map((m) => Muscle.getScreenMusclesFromMuscle(m))))
        ).map((m) => StringUtils.capitalize(m));
        const synergistMuscleGroups = Array.from(
          new Set(CollectionUtils.flat(exercise.meta.synergistMuscles.map((m) => Muscle.getScreenMusclesFromMuscle(m))))
        ).map((m) => StringUtils.capitalize(m));
        return filterTypes.every((ft) => {
          return (
            targetMuscleGroups.indexOf(ft) !== -1 ||
            synergistMuscleGroups.indexOf(ft) !== -1 ||
            (exercise.types || []).map(StringUtils.capitalize).indexOf(ft) !== -1
          );
        });
      });
    }

    return (
      <form data-cy="modal-exercise" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 mb-2 text-base leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="text"
          value={filter}
          placeholder="Filter by name"
          onInput={() => {
            setFilter(textInput.current.value.toLowerCase());
          }}
        />
        <Multiselect
          id="filtertypes"
          label=""
          placeholder="Filter by type"
          values={filterOptions}
          initialSelectedValues={new Set(initialFilterOptions)}
          onChange={(ft) => setFilterTypes(Array.from(ft))}
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
                  <div className="w-12 pr-2" style={{ minHeight: "2.5rem" }}>
                    <div
                      className="relative inline-block w-full h-full overflow-hidden align-middle"
                      style={{ paddingBottom: "100%" }}
                    >
                      <IconDefaultExercise className={`absolute top-0 left-0 w-full h-full`} />
                    </div>
                  </div>
                  <div className="flex-1 py-2 text-left">
                    <div>{e.name}</div>
                    <CustomMuscleGroupsView exercise={e} />
                  </div>
                  <div>
                    <button
                      className="px-3 py-4 button"
                      data-cy={`custom-exercise-edit-${StringUtils.dashcase(e.name)}`}
                      onClick={(event) => {
                        event.preventDefault();
                        props.setEditingExercise(e);
                        props.setIsCustomExerciseDisplayed(true);
                      }}
                    >
                      <IconEditSquare />
                    </button>
                    <button
                      className="px-1 py-4 button"
                      data-cy={`custom-exercise-delete-${StringUtils.dashcase(e.name)}`}
                      onClick={(event) => {
                        event.preventDefault();
                        if (confirm(`Are you sure you want to delete ${e.name}?`)) {
                          props.onDelete(e.id);
                        }
                      }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </section>
              </section>
            );
          })}
        <div className="mb-4">
          <LinkButton
            data-cy="custom-exercise-create"
            onClick={(event) => {
              event.preventDefault();
              props.setEditingExercise(undefined);
              props.setIsCustomExerciseDisplayed(true);
            }}
          >
            Add Custom Exercise
          </LinkButton>
        </div>
        <GroupHeader name="Built-in exercises" />
        {exercises.map((e) => {
          return (
            <section
              data-cy={`menu-item-${StringUtils.dashcase(e.name)}`}
              className="w-full px-2 py-1 text-left border-b border-gray-200"
              onClick={() => {
                props.onChange(e.id);
              }}
            >
              <section className="flex items-center">
                <div className="w-12 pr-2" style={{ minHeight: "2.5rem" }}>
                  <ExerciseImage settings={props.settings} className="w-full" exerciseType={e} size="small" />
                </div>
                <div className="flex-1 py-2 text-left">
                  <div>{e.name}</div>
                  <MuscleGroupsView exercise={e} settings={props.settings} />
                </div>
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
  onCreateOrUpdate: (
    name: string,
    equipment: IEquipment,
    targetMuscles: IMuscle[],
    synergistMuscles: IMuscle[],
    types: IExerciseKind[],
    exercise?: ICustomExercise
  ) => void;
}

function CustomExerciseForm(props: IEditCustomExerciseProps): JSX.Element {
  const customExercises = props.settings.exercises;
  const equipmentOptions: [IEquipment, string][] = Exercise.sortedEquipments("squat", props.settings).map((e) => [
    e,
    equipmentName(e, props.settings),
  ]);
  const [name, setName] = useState<string>(props.exercise?.name || "");
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [equipment, setEquipment] = useState<IEquipment>(props.exercise?.defaultEquipment || "barbell");
  const [targetMuscles, setTargetMuscles] = useState<IMuscle[]>([]);
  const [synergistMuscles, setSynergistMuscles] = useState<IMuscle[]>([]);
  const [types, setTypes] = useState<IExerciseKind[]>([]);

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
      <Multiselect
        id="types"
        label="Types"
        values={exerciseKinds}
        initialSelectedValues={new Set(props.exercise?.types || [])}
        onChange={(t) => setTypes(Array.from(t) as IExerciseKind[])}
      />
      <div class="py-4 flex">
        <div class="flex-1">
          <Button
            kind="grayv2"
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
            kind="orange"
            data-cy="custom-exercise-create"
            onClick={(e) => {
              e.preventDefault();
              if (!name) {
                setNameError("Name cannot be empty");
              } else if (props.exercise?.name !== name && Exercise.exists(name, customExercises)) {
                setNameError("Name already taken");
              } else {
                setNameError(undefined);
                props.onCreateOrUpdate(name, equipment, targetMuscles, synergistMuscles, types, props.exercise);
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

function MuscleGroupsView(props: { exercise: IExercise; settings: ISettings }): JSX.Element {
  const { exercise, settings } = props;
  const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, settings.exercises).map((m) =>
    StringUtils.capitalize(m)
  );
  const synergistMuscleGroups = Exercise.synergistMusclesGroups(exercise, settings.exercises)
    .map((m) => StringUtils.capitalize(m))
    .filter((m) => targetMuscleGroups.indexOf(m) === -1);

  const types = exercise.types.map((t) => StringUtils.capitalize(t));

  return (
    <div className="text-xs">
      {types.length > 0 && (
        <div>
          <span className="text-grayv2-main">Type: </span>
          <span className="font-bold">{types.join(", ")}</span>
        </div>
      )}
      {targetMuscleGroups.length > 0 && (
        <div>
          <span className="text-grayv2-main">Target: </span>
          <span className="font-bold">{targetMuscleGroups.join(", ")}</span>
        </div>
      )}
      {synergistMuscleGroups.length > 0 && (
        <div>
          <span className="text-grayv2-main">Synergist: </span>
          <span className="font-bold">{synergistMuscleGroups.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

function CustomMuscleGroupsView(props: { exercise: ICustomExercise }): JSX.Element {
  const { exercise } = props;
  const targetMuscleGroups = Array.from(
    new Set(CollectionUtils.flat(exercise.meta.targetMuscles.map((m) => Muscle.getScreenMusclesFromMuscle(m))))
  ).map((m) => StringUtils.capitalize(m));
  const synergistMuscleGroups = Array.from(
    new Set(CollectionUtils.flat(exercise.meta.synergistMuscles.map((m) => Muscle.getScreenMusclesFromMuscle(m))))
  )
    .map((m) => StringUtils.capitalize(m))
    .filter((m) => targetMuscleGroups.indexOf(m) === -1);
  const types = (exercise.types || []).map((t) => StringUtils.capitalize(t));

  return (
    <div className="text-xs">
      {types.length > 0 && (
        <div>
          <span className="text-grayv2-main">Type: </span>
          <span className="font-bold">{types.join(", ")}</span>
        </div>
      )}
      {targetMuscleGroups.length > 0 && (
        <div>
          <span className="text-grayv2-main">Target: </span>
          <span className="font-bold">{targetMuscleGroups.join(", ")}</span>{" "}
        </div>
      )}
      {synergistMuscleGroups.length > 0 && (
        <div>
          <span className="text-grayv2-main">Synergist: </span>
          <span className="font-bold">{synergistMuscleGroups.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
