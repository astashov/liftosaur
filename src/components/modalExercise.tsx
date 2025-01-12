import { useState } from "react";
import { LftModal } from "./modal";
import { StringUtils } from "../utils/string";
import {
  availableMuscles,
  ICustomExercise,
  IEquipment,
  IMuscle,
  ISettings,
  exerciseKinds,
  IExerciseKind,
  screenMuscles,
  IExerciseType,
  equipments,
} from "../types";
import { GroupHeader } from "./groupHeader";
import { Button } from "./button";
import { ObjectUtils } from "../utils/object";
import { LabelAndInput } from "./labelAndInput";
import { Multiselect } from "./multiselect";
import { equipmentName, Exercise, IExercise } from "../models/exercise";
import { LinkButton } from "./linkButton";
import { IconTrash } from "./icons/iconTrash";
import { ExerciseImage } from "./exerciseImage";
import { IconEditSquare } from "./icons/iconEditSquare";
import { Muscle } from "../models/muscle";
import { CollectionUtils } from "../utils/collection";
import { ScrollableTabs } from "./scrollableTabs";
import { IconExternalLink } from "./icons/iconExternalLink";
import { LftText } from "./lftText";
import { View, TextInput, TouchableOpacity, FlatList, Alert } from "react-native";
import { AlertUtils } from "../utils/alert";

interface IModalExerciseProps {
  isHidden: boolean;
  exerciseType?: IExerciseType;
  settings: ISettings;
  initialFilter?: string;
  initialFilterTypes?: string[];
  shouldAddExternalLinks?: boolean;
  onChange: (value: IExerciseType | undefined, shouldClose: boolean) => void;
  onCreateOrUpdate: (
    shouldClose: boolean,
    name: string,
    targetMuscles: IMuscle[],
    synergistMuscles: IMuscle[],
    types: IExerciseKind[],
    smallImageUrl?: string,
    largeImageUrl?: string,
    exercise?: ICustomExercise
  ) => void;
  customExerciseName?: string;
  onDelete: (id: string) => void;
}

export function ModalExercise(props: IModalExerciseProps): JSX.Element {
  const [filter, setFilter] = useState<string>(props.initialFilter || "");
  const [isCustomExerciseDisplayed, setIsCustomExerciseDisplayed] = useState<boolean>(!!props.customExerciseName);
  const [editingExercise, setEditingExercise] = useState<ICustomExercise | undefined>(undefined);

  return (
    <LftModal
      noPaddings={true}
      isHidden={props.isHidden}
      shouldShowClose={true}
      onClose={() => props.onChange(undefined, true)}
    >
      <View className="px-4" style={{ maxWidth: 600, minWidth: 260 }}>
        {isCustomExerciseDisplayed ? (
          <CustomExerciseForm
            backLabel="Back to list"
            exercise={editingExercise}
            customExerciseName={props.customExerciseName}
            setIsCustomExerciseDisplayed={setIsCustomExerciseDisplayed}
            settings={props.settings}
            onCreateOrUpdate={props.onCreateOrUpdate}
          />
        ) : (
          <ExercisePickerContainer
            filter={filter}
            initialFilterTypes={props.initialFilterTypes}
            shouldAddExternalLinks={props.shouldAddExternalLinks}
            setFilter={setFilter}
            setIsCustomExerciseDisplayed={setIsCustomExerciseDisplayed}
            setEditingExercise={setEditingExercise}
            exerciseType={props.exerciseType}
            onChange={props.onChange}
            onDelete={props.onDelete}
            settings={props.settings}
          />
        )}
      </View>
    </LftModal>
  );
}

interface IModalCustomExerciseProps {
  exercise?: ICustomExercise;
  onClose: () => void;
  settings: ISettings;
  onCreateOrUpdate: (
    shouldClose: boolean,
    name: string,
    targetMuscles: IMuscle[],
    synergistMuscles: IMuscle[],
    types: IExerciseKind[],
    smallImageUrl?: string,
    largeImageUrl?: string,
    exercise?: ICustomExercise
  ) => void;
}

export function ModalCustomExercise(props: IModalCustomExerciseProps): JSX.Element {
  return (
    <LftModal shouldShowClose={true} onClose={props.onClose}>
      <View style={{ maxWidth: 600, minWidth: 300 }}>
        <CustomExerciseForm
          backLabel="Cancel"
          exercise={props.exercise}
          setIsCustomExerciseDisplayed={() => props.onClose()}
          settings={props.settings}
          onCreateOrUpdate={props.onCreateOrUpdate}
        />
      </View>
    </LftModal>
  );
}

type IExercisePickerContainerProps = Omit<IExercisesListProps, "isSubstitute">;

function ExercisePickerContainer(props: IExercisePickerContainerProps): JSX.Element {
  const tabs = ["Pick", "Substitute"];

  const exerciseType = props.exerciseType;
  if (exerciseType == null) {
    return <ExercisesList isSubstitute={false} {...props} />;
  }

  return (
    <ScrollableTabs
      defaultIndex={0}
      tabs={tabs.map((name) => {
        if (name === "Pick") {
          return {
            label: name,
            children: <ExercisesList isSubstitute={false} {...props} />,
          };
        } else {
          return {
            label: name,
            children: <ExercisesList isSubstitute={true} {...props} />,
          };
        }
      })}
    />
  );
}

interface IExercisesListProps {
  settings: ISettings;
  filter: string;
  shouldAddExternalLinks?: boolean;
  isSubstitute: boolean;
  initialFilterTypes?: string[];
  setFilter: (newFilter: string) => void;
  setEditingExercise: (exercise?: ICustomExercise) => void;
  setIsCustomExerciseDisplayed: (value: boolean) => void;
  exerciseType?: IExerciseType;
  onChange: (value: IExerciseType | undefined, shouldClose: boolean) => void;
  onDelete: (id: string) => void;
}

type IExerciseListItem =
  | {
      type: "text";
      id: string;
    }
  | {
      type: "header";
      id: string;
    }
  | {
      type: "exercise";
      id: string;
      exercise: IExercise;
    }
  | {
      type: "current-exercise";
      id: "current-exercise";
      exercise: IExercise;
    }
  | {
      type: "custom-exercise";
      id: string;
      exercise: ICustomExercise;
    }
  | {
      type: "new-custom-exercise";
      id: "new-custom-exercise";
    }
  | {
      type: "filter";
      id: "filter";
    };

const ExercisesList = (props: IExercisesListProps): JSX.Element => {
  const { setFilter, filter } = props;

  let exercises = Exercise.allExpanded({});
  let customExercises = props.settings.exercises;
  const filterOptions = [
    ...equipments.map((e) => equipmentName(e)),
    ...exerciseKinds.map(StringUtils.capitalize),
    ...screenMuscles,
  ];
  const initialFilterOptions = (props.initialFilterTypes || []).filter((ft) => filterOptions.indexOf(ft) !== -1);
  const [filterTypes, setFilterTypes] = useState<string[]>(initialFilterOptions);
  if (filter) {
    exercises = Exercise.filterExercises(exercises, filter);
    customExercises = Exercise.filterCustomExercises(customExercises, filter);
  }
  if (filterTypes && filterTypes.length > 0) {
    exercises = Exercise.filterExercisesByType(exercises, filterTypes, props.settings);
    customExercises = Exercise.filterCustomExercisesByType(customExercises, filterTypes);
  }

  exercises = Exercise.sortExercises(exercises, props.isSubstitute, props.settings, filterTypes, props.exerciseType);
  const exercise = props.exerciseType ? Exercise.get(props.exerciseType, props.settings.exercises) : undefined;

  const items: IExerciseListItem[] = [
    ...(props.isSubstitute
      ? [{ type: "text", id: "Similar exercises are sorted by the same muscles as the current one." } as const]
      : []),
    ...(exercise
      ? [
          {
            type: "current-exercise",
            id: "current-exercise",
            exercise,
          } as const,
        ]
      : []),
    { type: "filter", id: "filter" },
    ...(!props.isSubstitute ? [{ type: "header", id: "Custom exercises" } as const] : []),
    ...(!props.isSubstitute
      ? ObjectUtils.keys(customExercises)
          .filter((id) => !customExercises[id]?.isDeleted)
          .map<{
            type: "custom-exercise";
            id: string;
            exercise: ICustomExercise;
          }>((id) => {
            return {
              type: "custom-exercise" as const,
              id,
              exercise: customExercises[id]!,
            } as const;
          })
      : []),
    { type: "new-custom-exercise", id: "new-custom-exercise" },
    { type: "header", id: "Built-in exercises" },
    ...exercises.map<{
      type: "exercise";
      id: string;
      exercise: IExercise;
    }>((e) => {
      return {
        type: "exercise" as const,
        id: Exercise.toKey(e),
        exercise: e,
      } as const;
    }),
  ];

  return (
    <FlatList
      style={{ minWidth: 300 }}
      className="pt-4"
      data-cy="modal-exercise"
      contentContainerStyle={{ flexGrow: 1 }}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        switch (item.type) {
          case "text":
            return <LftText className="text-xs italic">{item.id}</LftText>;
          case "header":
            return <GroupHeader name={item.id} />;
          case "current-exercise":
            return (
              <View className="px-4 py-2 mb-2 bg-purple-100 rounded-2xl">
                <GroupHeader name="Current" />
                <ExerciseItem
                  shouldAddExternalLinks={props.shouldAddExternalLinks}
                  showMuscles={props.isSubstitute}
                  settings={props.settings}
                  exercise={item.exercise}
                  equipment={item.exercise.equipment}
                />
              </View>
            );
          case "filter":
            return (
              <>
                <TextInput
                  className="block w-full px-4 py-2 mb-2 text-base leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
                  value={filter}
                  data-cy="exercise-filter-by-name"
                  placeholder="Filter by name"
                  onChangeText={(text) => {
                    setFilter(text.toLowerCase());
                  }}
                />
                <Multiselect
                  id="filtertypes"
                  label=""
                  data-cy="exercise-filter-by-type"
                  placeholder="Filter by type"
                  values={filterOptions}
                  initialSelectedValues={new Set(initialFilterOptions)}
                  onChange={(ft) => setFilterTypes(Array.from(ft))}
                />
              </>
            );
          case "custom-exercise": {
            const e = item.exercise;
            return (
              <TouchableOpacity
                key={e.id}
                data-cy={`menu-item-${StringUtils.dashcase(e.name)}`}
                className="w-full px-2 py-1 text-left border-b border-gray-200"
                onPress={(event) => {
                  props.onChange({ id: e.id }, true);
                }}
              >
                <View className="flex flex-row items-center">
                  <View className="w-12 pr-2" style={{ minHeight: 40 }}>
                    <ExerciseImage settings={props.settings} className="w-10 h-10" exerciseType={e} size="small" />
                  </View>
                  <View className="flex-1 py-2 text-left">
                    <LftText>{e.name}</LftText>
                    <CustomMuscleGroupsView exercise={e} />
                  </View>
                  <View>
                    <TouchableOpacity
                      className={`px-3 py-4 button nm-edit-custom-exercise-${StringUtils.dashcase(e.name)}`}
                      data-cy={`custom-exercise-edit-${StringUtils.dashcase(e.name)}`}
                      onPress={(event) => {
                        event.preventDefault();
                        props.setEditingExercise(e);
                        props.setIsCustomExerciseDisplayed(true);
                      }}
                    >
                      <IconEditSquare />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`px-1 py-4 button nm-delete-custom-exercise-${StringUtils.dashcase(e.name)}`}
                      data-cy={`custom-exercise-delete-${StringUtils.dashcase(e.name)}`}
                      onPress={(event) => {
                        event.preventDefault();
                        AlertUtils.confirm(`Are you sure you want to delete ${e.name}?`, {
                          onYes: () => props.onDelete(e.id),
                        });
                      }}
                    >
                      <IconTrash />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }
          case "new-custom-exercise":
            return (
              <View className="mb-4">
                <LinkButton
                  name="custom-exercise-create"
                  data-cy="custom-exercise-create"
                  onPress={(event) => {
                    event.preventDefault();
                    props.setEditingExercise(undefined);
                    props.setIsCustomExerciseDisplayed(true);
                  }}
                >
                  Add Custom Exercise
                </LinkButton>
              </View>
            );
          case "exercise": {
            const e = item.exercise;
            return (
              <TouchableOpacity
                key={Exercise.toKey(e)}
                data-cy={`menu-item-${StringUtils.dashcase(e.name)}${
                  e.equipment ? `-${StringUtils.dashcase(e.equipment)}` : ""
                }`}
                className="w-full px-2 py-1 text-left border-b border-gray-200"
                onPress={() => {
                  props.onChange(e, true);
                }}
              >
                <ExerciseItem
                  shouldAddExternalLinks={props.shouldAddExternalLinks}
                  showMuscles={props.isSubstitute}
                  settings={props.settings}
                  currentExerciseType={props.exerciseType}
                  exercise={e}
                  equipment={e.equipment}
                />
              </TouchableOpacity>
            );
          }
        }
      }}
    />
  );
};

interface IExerciseItemProps {
  settings: ISettings;
  shouldAddExternalLinks?: boolean;
  currentExerciseType?: IExerciseType;
  exercise: IExercise;
  showMuscles: boolean;
  equipment?: IEquipment;
}

export function ExerciseItem(props: IExerciseItemProps): JSX.Element {
  const { exercise: e } = props;
  const exerciseType = { id: e.id, equipment: props.equipment || e.defaultEquipment };

  return (
    <View className="flex flex-row items-center gap-2">
      <View className="w-14" style={{ minHeight: 40 }}>
        <ExerciseImage settings={props.settings} className="w-12 h-12" exerciseType={exerciseType} size="small" />
      </View>
      <View className="flex-1 py-2 text-left">
        <LftText>
          <LftText className="font-bold">{e.name}</LftText>,{" "}
          <LftText className="text-grayv2-main">{equipmentName(exerciseType.equipment)}</LftText>
        </LftText>
        {props.showMuscles ? (
          <MuscleView currentExerciseType={props.currentExerciseType} exercise={e} settings={props.settings} />
        ) : (
          <MuscleGroupsView exercise={e} settings={props.settings} />
        )}
      </View>
      {props.shouldAddExternalLinks && (
        <div className="pl-1">
          <div className="flex items-center">
            <a className="p-2" href={Exercise.toExternalUrl(e)} target="_blank">
              <IconExternalLink />
            </a>
          </div>
        </div>
      )}
    </View>
  );
}

interface IEditCustomExerciseProps {
  settings: ISettings;
  backLabel: string;
  exercise?: ICustomExercise;
  setIsCustomExerciseDisplayed: (value: boolean) => void;
  onCreateOrUpdate: (
    shouldClose: boolean,
    name: string,
    targetMuscles: IMuscle[],
    synergistMuscles: IMuscle[],
    types: IExerciseKind[],
    smallImageUrl?: string,
    largeImageUrl?: string,
    exercise?: ICustomExercise
  ) => void;
  customExerciseName?: string;
}

export function CustomExerciseForm(props: IEditCustomExerciseProps): JSX.Element {
  const customExercises = props.settings.exercises;
  const [name, setName] = useState<string>(props.exercise?.name || props.customExerciseName || "");
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [targetMuscles, setTargetMuscles] = useState<IMuscle[]>(props.exercise?.meta.targetMuscles || []);
  const [synergistMuscles, setSynergistMuscles] = useState<IMuscle[]>(props.exercise?.meta.synergistMuscles || []);
  const [types, setTypes] = useState<IExerciseKind[]>(props.exercise?.types || []);
  const [smallImageUrl, setSmallImageUrl] = useState<string>(props.exercise?.smallImageUrl || "");
  const [largeImageUrl, setLargeImageUrl] = useState<string>(props.exercise?.largeImageUrl || "");

  return (
    <View>
      <LabelAndInput
        star={true}
        identifier="custom-exercise-name"
        label="Name"
        errorMessage={nameError}
        value={name}
        placeholder="Super Squat"
        onChangeText={(text) => {
          setName(text.trim() || "");
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
        onChangeText={(text) => {
          setSmallImageUrl(text);
        }}
      />
      <LabelAndInput
        identifier="custom-exercise-large-image"
        label="Large Image Url"
        value={largeImageUrl}
        hint="4:3 aspect ratio, >= 800px width"
        placeholder="https://www.img.com/large.jpg"
        onChangeText={(text) => {
          setLargeImageUrl(text);
        }}
      />
      <View className="flex flex-row py-4">
        <View className="flex-1">
          <Button
            name="custom-exercise-cancel"
            kind="grayv2"
            data-cy="custom-exercise-cancel"
            onClick={() => {
              props.setIsCustomExerciseDisplayed(false);
            }}
          >
            {props.backLabel}
          </Button>
        </View>
        <View className="flex-1 text-right">
          <Button
            name="custom-exercise-create"
            kind="orange"
            data-cy="custom-exercise-create"
            onClick={() => {
              if (!name) {
                setNameError("Name cannot be empty");
              } else if (props.exercise?.name !== name && Exercise.exists(name, customExercises)) {
                setNameError("Name already taken");
              } else {
                setNameError(undefined);
                const cleanedSmallImageUrl = smallImageUrl.trim();
                const cleanedLargeImageUrl = largeImageUrl.trim();
                props.onCreateOrUpdate(
                  !!props.customExerciseName,
                  name,
                  targetMuscles,
                  synergistMuscles,
                  types,
                  cleanedSmallImageUrl || undefined,
                  cleanedLargeImageUrl || undefined,
                  props.exercise
                );
                props.setIsCustomExerciseDisplayed(false);
              }
            }}
          >
            {props.exercise != null ? "Update" : "Create"}
          </Button>
        </View>
      </View>
    </View>
  );
}

export function MuscleGroupsView(props: { exercise: IExercise; settings: ISettings }): JSX.Element {
  const { exercise, settings } = props;
  const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, settings.exercises).map((m) =>
    StringUtils.capitalize(m)
  );
  const synergistMuscleGroups = Exercise.synergistMusclesGroups(exercise, settings.exercises)
    .map((m) => StringUtils.capitalize(m))
    .filter((m) => targetMuscleGroups.indexOf(m) === -1);

  const types = exercise.types.map((t) => StringUtils.capitalize(t));

  return (
    <View className="text-xs">
      {types.length > 0 && (
        <LftText>
          <LftText className="text-grayv2-main">Type: </LftText>
          <LftText className="font-bold">{types.join(", ")}</LftText>
        </LftText>
      )}
      {targetMuscleGroups.length > 0 && (
        <LftText>
          <LftText className="text-grayv2-main">Target: </LftText>
          <LftText className="font-bold">{targetMuscleGroups.join(", ")}</LftText>
        </LftText>
      )}
      {synergistMuscleGroups.length > 0 && (
        <LftText>
          <LftText className="text-grayv2-main">Synergist: </LftText>
          <LftText className="font-bold">{synergistMuscleGroups.join(", ")}</LftText>
        </LftText>
      )}
    </View>
  );
}

function MuscleView(props: {
  currentExerciseType?: IExerciseType;
  exercise: IExercise;
  settings: ISettings;
}): JSX.Element {
  const { exercise, settings } = props;
  const tms = props.currentExerciseType ? Exercise.targetMuscles(props.currentExerciseType, settings.exercises) : [];
  const sms = props.currentExerciseType ? Exercise.synergistMuscles(props.currentExerciseType, settings.exercises) : [];
  const targetMuscles = Exercise.targetMuscles(exercise, settings.exercises);
  const synergistMuscles = Exercise.synergistMuscles(exercise, settings.exercises).filter(
    (m) => targetMuscles.indexOf(m) === -1
  );

  const types = exercise.types.map((t) => StringUtils.capitalize(t));

  return (
    <View className="text-xs">
      {types.length > 0 && (
        <LftText>
          <LftText className="text-grayv2-main">Type: </LftText>
          <LftText className="font-bold">{types.join(", ")}</LftText>
        </LftText>
      )}
      {targetMuscles.length > 0 && (
        <LftText>
          <LftText className="text-grayv2-main">Target: </LftText>
          <LftText className="font-bold">
            {targetMuscles.map((m, i) => {
              return (
                <View>
                  <LftText
                    className={tms.length === 0 ? "" : tms.indexOf(m) !== -1 ? "text-greenv2-main" : "text-redv2-main"}
                  >
                    {m}
                  </LftText>
                  {i !== targetMuscles.length - 1 ? ", " : ""}
                </View>
              );
            })}
          </LftText>
        </LftText>
      )}
      {synergistMuscles.length > 0 && (
        <LftText>
          <LftText className="text-grayv2-main">Synergist: </LftText>
          <LftText className="font-bold">
            {synergistMuscles.map((m, i) => {
              return (
                <View>
                  <LftText
                    className={sms.length === 0 ? "" : sms.indexOf(m) !== -1 ? "text-greenv2-main" : "text-redv2-main"}
                  >
                    {m}
                  </LftText>
                  {i !== synergistMuscles.length - 1 ? ", " : ""}
                </View>
              );
            })}
          </LftText>
        </LftText>
      )}
    </View>
  );
}

export function CustomMuscleGroupsView(props: { exercise: ICustomExercise }): JSX.Element {
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
    <View className="text-xs">
      {types.length > 0 && (
        <LftText>
          <LftText className="text-grayv2-main">Type: </LftText>
          <LftText className="font-bold">{types.join(", ")}</LftText>
        </LftText>
      )}
      {targetMuscleGroups.length > 0 && (
        <LftText>
          <LftText className="text-grayv2-main">Target: </LftText>
          <LftText className="font-bold">{targetMuscleGroups.join(", ")}</LftText>{" "}
        </LftText>
      )}
      {synergistMuscleGroups.length > 0 && (
        <LftText>
          <LftText className="text-grayv2-main">Synergist: </LftText>
          <LftText className="font-bold">{synergistMuscleGroups.join(", ")}</LftText>
        </LftText>
      )}
    </View>
  );
}
