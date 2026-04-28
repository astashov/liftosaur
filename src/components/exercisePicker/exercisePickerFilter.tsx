import { JSX, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Text } from "../primitives/text";
import {
  equipments,
  exerciseKinds,
  IBuiltinEquipment,
  IExerciseKind,
  IExercisePickerSort,
  IExercisePickerState,
  IScreenMuscle,
  ISettings,
} from "../../types";
import { IconBack } from "../icons/iconBack";
import { ObjectUtils_values, ObjectUtils_entries } from "../../utils/object";
import { IconArrowUp } from "../icons/iconArrowUp";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { lb } from "lens-shmens";
import { ILensDispatch } from "../../utils/useLensReducer";
import { equipmentName } from "../../models/exercise";
import { CollectionUtils_remove } from "../../utils/collection";
import { StringUtils_capitalize } from "../../utils/string";
import { ScrollableTabs } from "../scrollableTabs";
import { Muscle_getAvailableMuscleGroups, Muscle_getMusclesFromScreenMuscle } from "../../models/muscle";
import { ExercisePickerUtils_getSelectedMuscleGroupNames } from "./exercisePickerUtils";
import { ExercisePickerOptionsMuscles } from "./exercisePickerOptionsMuscles";
import { ExercisePickerOptions } from "./exercisePickerOptions";
import { MuscleGroupImage } from "../muscleGroupImage";
import { IExercisePickerSettings } from "./exercisePickerSettings";
import { MenuItemEditable } from "../menuItemEditable";
import { Equipment_getCurrentGym } from "../../models/equipment";

interface IProps {
  settings: ISettings;
  state: IExercisePickerState;
  dispatch: ILensDispatch<IExercisePickerState>;
  onChangeSettings: (settings: IExercisePickerSettings) => void;
}

export const exercisePickerSortNames = {
  name_asc: "Name, A to Z",
  similar_muscles: "Similar Muscles",
};

type IFilterValue = { label: string; isSelected: boolean; disabledReason?: string };

export function ExercisePickerFilter(props: IProps): JSX.Element {
  const sortValues: Record<IExercisePickerSort, IFilterValue> = {
    name_asc: { label: exercisePickerSortNames.name_asc, isSelected: props.state.sort === "name_asc" },
    similar_muscles: {
      label: exercisePickerSortNames.similar_muscles,
      isSelected: props.state.sort === "similar_muscles",
      disabledReason: props.state.exerciseType != null ? undefined : "Enabled only for swap/edit",
    },
  };
  const gymEquipment = Equipment_getCurrentGym(props.settings).equipment;

  const equipmentValues = equipments.reduce<Record<IBuiltinEquipment, IFilterValue>>(
    (memo, equipment) => {
      memo[equipment] = {
        label: equipmentName(equipment, {}),
        isSelected: props.state.filters.equipment?.includes(equipment) ?? false,
        disabledReason:
          !props.settings.workoutSettings.shouldShowInvisibleEquipment && gymEquipment[equipment]?.isDeleted
            ? "Hidden"
            : undefined,
      };
      return memo;
    },
    {} as Record<IBuiltinEquipment, IFilterValue>
  );

  const typeValues = exerciseKinds.reduce<Record<IExerciseKind, IFilterValue>>(
    (memo, type) => {
      memo[type] = {
        label: StringUtils_capitalize(type),
        isSelected: props.state.filters.type?.includes(type) ?? false,
      };
      return memo;
    },
    {} as Record<IExerciseKind, IFilterValue>
  );

  return (
    <View className="flex-1 pb-4" style={{ marginTop: -12 }}>
      <View className="flex-row items-center py-4 mt-2">
        <Pressable
          className="px-4 py-2"
          hitSlop={12}
          data-testid="navbar-back"
          testID="navbar-back"
          onPress={() => {
            props.dispatch(
              lb<IExercisePickerState>()
                .p("screenStack")
                .recordModify((stack) => stack.slice(0, -1)),
              "Pop screen in exercise picker screen stack"
            );
          }}
        >
          <IconBack />
        </Pressable>
        <Text className="flex-1 pr-12 font-bold text-center">Filter and sort</Text>
      </View>
      <ScrollView className="flex-1">
        <Filter
          name="sort"
          title="Sort by"
          values={sortValues}
          onChange={(value) => {
            props.onChangeSettings({
              pickerSort: value,
            });
            props.dispatch(
              lb<IExercisePickerState>().p("sort").record(value),
              `Set sort in exercise picker to ${value}`
            );
          }}
        />
        <View className="px-4">
          <MenuItemEditable
            type="boolean"
            name="Show only available equipment"
            value={props.settings.workoutSettings.shouldShowInvisibleEquipment ? "false" : "true"}
            onChange={(v) => {
              props.onChangeSettings({
                shouldShowInvisibleEquipment: v !== "true",
              });
              props.dispatch(
                lb<IExercisePickerState>()
                  .p("filters")
                  .p("equipment")
                  .recordModify((equipment) => {
                    if (v === "false") {
                      return equipment;
                    }
                    return equipment?.filter((e) => !gymEquipment[e]?.isDeleted) || [];
                  }),
                "Unselect hidden equipment in exercise picker"
              );
            }}
          />
        </View>
        <Filter
          name="equipment"
          title="Equipment"
          values={equipmentValues}
          onChange={(value) => {
            props.dispatch(
              lb<IExercisePickerState>()
                .p("filters")
                .p("equipment")
                .recordModify((equipment) => {
                  if (equipment?.includes(value)) {
                    return CollectionUtils_remove(equipment, value);
                  } else {
                    return [...(equipment ?? []), value];
                  }
                }),
              `Set equipment filter in exercise picker to ${value}`
            );
          }}
        />
        <Filter
          name="type"
          title="Type"
          values={typeValues}
          onChange={(value) => {
            props.dispatch(
              lb<IExercisePickerState>()
                .p("filters")
                .p("type")
                .recordModify((types) => {
                  if (types?.includes(value)) {
                    return CollectionUtils_remove(types, value);
                  } else {
                    return [...(types ?? []), value];
                  }
                }),
              `Set type filter in exercise picker to ${value}`
            );
          }}
        />
        <FilterMuscles dispatch={props.dispatch} state={props.state} settings={props.settings} />
      </ScrollView>
    </View>
  );
}

interface IFilterProps<T extends string> {
  name: string;
  title: string;
  values: Record<T, IFilterValue>;
  onChange: (value: T) => void;
}

function Filter<T extends string>(props: IFilterProps<T>): JSX.Element {
  const selectedValues = ObjectUtils_values(props.values).filter((v) => v.isSelected);
  const [isExpanded, setIsExpanded] = useState(selectedValues.length > 0);
  return (
    <View className="px-4 py-2 border-b border-background-subtle">
      <Pressable className="flex-row items-center pb-1" onPress={() => setIsExpanded(!isExpanded)}>
        <View className="flex-1">
          <Text>
            <Text>{props.title}: </Text>
            <Text className="font-semibold">{selectedValues.map((v) => v.label).join(", ") || "All"}</Text>
          </Text>
        </View>
        <View className="px-2">{isExpanded ? <IconArrowUp /> : <IconArrowDown2 />}</View>
      </Pressable>
      {isExpanded && <ExercisePickerOptions values={props.values} onSelect={props.onChange} />}
    </View>
  );
}

interface IFilterMusclesProps {
  dispatch: ILensDispatch<IExercisePickerState>;
  settings: ISettings;
  state: IExercisePickerState;
}

function FilterMuscles(props: IFilterMusclesProps): JSX.Element {
  const selectedValues = props.state.filters?.muscles || [];
  const [isExpanded, setIsExpanded] = useState(selectedValues.length > 0);
  const selectedMuscleGroups = ExercisePickerUtils_getSelectedMuscleGroupNames(selectedValues, props.settings);

  return (
    <View className="px-4 py-2 border-b border-background-subtle">
      <Pressable className="flex-row items-center pb-1" onPress={() => setIsExpanded(!isExpanded)}>
        <View className="flex-1">
          <Text>
            <Text>Muscles: </Text>
            <Text className="font-semibold">{selectedMuscleGroups.join(", ") || "All"}</Text>
          </Text>
        </View>
        <View className="px-2">{isExpanded ? <IconArrowUp /> : <IconArrowDown2 />}</View>
      </Pressable>
      {isExpanded && (
        <ScrollableTabs
          topPadding="0.5rem"
          nonSticky={true}
          color="purple"
          tabs={[
            {
              label: "Muscle Groups",
              children: () => {
                const muscleGroups = Muscle_getAvailableMuscleGroups(props.settings).reduce<
                  Record<IScreenMuscle, IFilterValue>
                >(
                  (memo, muscleGroup) => {
                    const muscles = Muscle_getMusclesFromScreenMuscle(muscleGroup, props.settings);
                    const isSelected = muscles.every((muscle) => selectedValues.includes(muscle));
                    memo[muscleGroup] = { label: StringUtils_capitalize(muscleGroup), isSelected };
                    return memo;
                  },
                  {} as Record<IScreenMuscle, IFilterValue>
                );
                return (
                  <View className="flex-row flex-wrap mt-2" style={{ gap: 16 }}>
                    {ObjectUtils_entries(muscleGroups).map(([key, value]) => (
                      <Pressable
                        key={key}
                        className={`flex-row items-center gap-2 h-12 overflow-hidden rounded-lg bg-background-subtle ${
                          value.isSelected ? "border-button-secondarystroke" : "border-border-neutral"
                        }`}
                        style={{ width: "47%", borderWidth: value.isSelected ? 2 : 1 }}
                        onPress={() => {
                          props.dispatch(
                            lb<IExercisePickerState>()
                              .p("filters")
                              .p("muscles")
                              .recordModify((muscles) => {
                                const musclesOfMuscleGroup = Muscle_getMusclesFromScreenMuscle(key, props.settings);
                                const isIncluded = musclesOfMuscleGroup.some((m) => selectedValues.includes(m));
                                if (isIncluded) {
                                  return muscles?.filter((muscle) => !musclesOfMuscleGroup.includes(muscle)) || [];
                                } else {
                                  return [...(muscles || []), ...musclesOfMuscleGroup];
                                }
                              }),
                            `Set muscle group filter in exercise picker to ${key}`
                          );
                        }}
                      >
                        <MuscleGroupImage muscleGroup={key} size={61} />
                        <Text className={`flex-1 ${value.isSelected ? "text-text-purple" : ""}`}>{value.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                );
              },
            },
            {
              label: "Muscles",
              children: () => {
                return (
                  <ExercisePickerOptionsMuscles
                    selectedValues={selectedValues}
                    settings={props.settings}
                    onSelect={(key) => {
                      props.dispatch(
                        lb<IExercisePickerState>()
                          .p("filters")
                          .p("muscles")
                          .recordModify((mscls) => {
                            if (mscls?.includes(key)) {
                              return CollectionUtils_remove(mscls, key);
                            } else {
                              return [...(mscls || []), key];
                            }
                          }),
                        `Set muscle filter in exercise picker to ${key}`
                      );
                    }}
                  />
                );
              },
            },
          ]}
        />
      )}
    </View>
  );
}
