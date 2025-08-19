import { h, JSX } from "preact";
import {
  availableMuscles,
  equipments,
  exerciseKinds,
  IBuiltinEquipment,
  IExerciseKind,
  IExercisePickerSort,
  IExercisePickerState,
  IMuscle,
  IScreenMuscle,
  ISettings,
  screenMuscles,
} from "../../types";
import { IconBack } from "../icons/iconBack";
import { useState } from "preact/hooks";
import { ObjectUtils } from "../../utils/object";
import { IconArrowUp } from "../icons/iconArrowUp";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { lb } from "lens-shmens";
import { ILensDispatch } from "../../utils/useLensReducer";
import { equipmentName } from "../../models/exercise";
import { CollectionUtils } from "../../utils/collection";
import { StringUtils } from "../../utils/string";
import { ScrollableTabs } from "../scrollableTabs";
import { Muscle } from "../../models/muscle";
import { ExercisePickerUtils } from "./exercisePickerUtils";

interface IProps {
  settings: ISettings;
  state: IExercisePickerState;
  dispatch: ILensDispatch<IExercisePickerState>;
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

  const equipmentValues = equipments.reduce<Record<IBuiltinEquipment, IFilterValue>>(
    (memo, equipment) => {
      memo[equipment] = {
        label: equipmentName(equipment, {}),
        isSelected: props.state.filters.equipment?.includes(equipment) ?? false,
      };
      return memo;
    },
    {} as Record<IBuiltinEquipment, IFilterValue>
  );

  const typeValues = exerciseKinds.reduce<Record<IExerciseKind, IFilterValue>>(
    (memo, type) => {
      memo[type] = {
        label: StringUtils.capitalize(type),
        isSelected: props.state.filters.type?.includes(type) ?? false,
      };
      return memo;
    },
    {} as Record<IExerciseKind, IFilterValue>
  );

  return (
    <div className="flex flex-col h-full pb-4" style={{ marginTop: "-0.75rem" }}>
      <div className="relative py-4 mt-2">
        <div className="absolute flex top-2 left-4">
          <div>
            <button
              className="p-2 nm-back"
              data-cy="navbar-back"
              onClick={() => {
                props.dispatch(
                  lb<IExercisePickerState>()
                    .p("screenStack")
                    .recordModify((stack) => stack.slice(0, -1)),
                  "Pop screen in exercise picker screen stack"
                );
              }}
            >
              <IconBack />
            </button>
          </div>
        </div>
        <h3 className="px-4 font-bold text-center">Filter and sort</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Filter
          name="sort"
          title="Sort by"
          values={sortValues}
          onChange={(value) => {
            props.dispatch(
              lb<IExercisePickerState>().p("sort").record(value),
              `Set sort in exercise picker to ${value}`
            );
          }}
        />
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
                    return CollectionUtils.remove(equipment, value);
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
                    return CollectionUtils.remove(types, value);
                  } else {
                    return [...(types ?? []), value];
                  }
                }),
              `Set type filter in exercise picker to ${value}`
            );
          }}
        />
        <FilterMuscles dispatch={props.dispatch} state={props.state} />
      </div>
    </div>
  );
}

interface IFilterProps<T extends string> {
  name: string;
  title: string;
  values: Record<T, IFilterValue>;
  onChange: (value: T) => void;
}

function Filter<T extends string>(props: IFilterProps<T>): JSX.Element {
  const selectedValues = ObjectUtils.values(props.values).filter((v) => v.isSelected);
  const [isExpanded, setIsExpanded] = useState(selectedValues.length > 0);
  return (
    <div className="px-4 py-2 border-b border-background-subtle">
      <div className="flex items-center pb-1" onClick={() => setIsExpanded(!isExpanded)}>
        <h4 className="flex-1">
          {props.title}: <span className="font-semibold">{selectedValues.map((v) => v.label).join(", ") || "All"}</span>
        </h4>
        <div className="flex items-center">
          <button className="px-2">{isExpanded ? <IconArrowUp /> : <IconArrowDown2 />}</button>
        </div>
      </div>
      {isExpanded && (
        <div className="grid grid-cols-2 gap-4 mt-2">
          {ObjectUtils.entries(props.values).map(([key, value]) => {
            return (
              <div>
                <div>
                  <button
                    className={`bg-background-subtle h-12 leading-none px-2 w-full ${value.disabledReason ? "text-border-neutral" : "text-text-primary"} rounded-lg border text-center ${value.isSelected ? "border-button-secondarystroke text-text-purple" : "border-border-neutral"}`}
                    disabled={!!value.disabledReason}
                    style={{ borderWidth: value.isSelected ? "2px" : "1px" }}
                    onClick={() => {
                      props.onChange(key);
                    }}
                  >
                    {value.label}
                  </button>
                </div>
                {value.disabledReason && <div className="text-xs text-text-secondary">{value.disabledReason}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface IFilterMusclesProps<T extends string> {
  dispatch: ILensDispatch<IExercisePickerState>;
  state: IExercisePickerState;
}

function FilterMuscles<T extends string>(props: IFilterMusclesProps<T>): JSX.Element {
  const selectedValues = props.state.filters?.muscles || [];
  const [isExpanded, setIsExpanded] = useState(selectedValues.length > 0);
  const selectedMuscleGroups = ExercisePickerUtils.getSelectedMuscleGroupNames(selectedValues);
  return (
    <div className="px-4 py-2 border-b border-background-subtle">
      <div className="flex items-center pb-1" onClick={() => setIsExpanded(!isExpanded)}>
        <h4 className="flex-1">
          Muscles: <span className="font-semibold">{selectedMuscleGroups.join(", ") || "All"}</span>
        </h4>
        <div className="flex items-center">
          <button className="px-2">{isExpanded ? <IconArrowUp /> : <IconArrowDown2 />}</button>
        </div>
      </div>
      {isExpanded && (
        <ScrollableTabs
          topPadding="0.5rem"
          nonSticky={true}
          color="purple"
          tabs={[
            {
              label: "Muscle Groups",
              children: () => {
                const muscleGroups = screenMuscles.reduce<Record<IScreenMuscle, IFilterValue>>(
                  (memo, muscleGroup) => {
                    const muscles = Muscle.getMusclesFromScreenMuscle(muscleGroup);
                    const isSelected = muscles.every((muscle) => selectedValues.includes(muscle));
                    memo[muscleGroup] = { label: StringUtils.capitalize(muscleGroup), isSelected };
                    return memo;
                  },
                  {} as Record<IScreenMuscle, IFilterValue>
                );
                return (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {ObjectUtils.entries(muscleGroups).map(([key, value]) => {
                      return (
                        <button
                          className={`bg-background-subtle h-12 leading-none overflow-hidden bg-no-repeat flex items-center rounded-lg border text-left ${value.isSelected ? "border-button-secondarystroke text-text-purple" : "border-border-neutral"}`}
                          style={{
                            paddingLeft: "70px",
                            borderWidth: value.isSelected ? "2px" : "1px",
                            backgroundImage: `url(/images/svgs/musclegroups/${key}.svg)`,
                            backgroundSize: "contain",
                            backgroundPosition: "0 50%",
                          }}
                          onClick={() => {
                            props.dispatch(
                              lb<IExercisePickerState>()
                                .p("filters")
                                .p("muscles")
                                .recordModify((muscles) => {
                                  const musclesOfMuscleGroup = Muscle.getMusclesFromScreenMuscle(key);
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
                          <span>{value.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              },
            },
            {
              label: "Muscles",
              children: () => {
                const groupedMuscles = availableMuscles.reduce(
                  (memo, muscle) => {
                    const group = Muscle.getScreenMusclesFromMuscle(muscle)?.[0];
                    if (group != null) {
                      memo[group] = memo[group] || {};
                      const isSelected = selectedValues.includes(muscle);
                      memo[group][muscle] = { label: muscle, isSelected };
                    }
                    return memo;
                  },
                  {} as Record<IScreenMuscle, Record<IMuscle, IFilterValue>>
                );
                const sortedGroupedMuscles = ObjectUtils.keys(groupedMuscles).sort(([a], [b]) => a.localeCompare(b));

                return (
                  <div>
                    {sortedGroupedMuscles.map((group) => {
                      const muscles = groupedMuscles[group];
                      const sortedMuscles = ObjectUtils.keys(muscles).sort(([a], [b]) => a.localeCompare(b));
                      return (
                        <div className="mb-4">
                          <h3 className="mb-2 font-semibold">{StringUtils.capitalize(group)}</h3>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            {sortedMuscles.map((key) => {
                              const value = muscles[key];
                              const words = value.label.split(" ");
                              const wordCount = words.length;
                              const longestWord = Math.max(...words.map((w) => w.length));
                              const fontSize =
                                wordCount > 3 || longestWord > 11
                                  ? "text-xs"
                                  : wordCount > 2 || longestWord > 9
                                    ? "text-sm"
                                    : "text-base";
                              return (
                                <button
                                  className={`bg-background-subtle ${fontSize} h-12 leading-none overflow-hidden bg-no-repeat flex items-center rounded-lg border text-left ${value.isSelected ? "border-button-secondarystroke text-text-purple" : "border-border-neutral"}`}
                                  style={{
                                    paddingLeft: "70px",
                                    borderWidth: value.isSelected ? "2px" : "1px",
                                    backgroundImage: `url(/images/svgs/muscles/${key.toLowerCase().replace(/ /g, "")}.svg)`,
                                    backgroundSize: "contain",
                                    backgroundPosition: "0 50%",
                                  }}
                                  onClick={() => {
                                    props.dispatch(
                                      lb<IExercisePickerState>()
                                        .p("filters")
                                        .p("muscles")
                                        .recordModify((muscles) => {
                                          if (muscles?.includes(key)) {
                                            return CollectionUtils.remove(muscles, key);
                                          } else {
                                            return [...(muscles || []), key];
                                          }
                                        }),
                                      `Set muscle filter in exercise picker to ${key}`
                                    );
                                  }}
                                >
                                  {value.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
}
