import { JSX, Fragment, useMemo, useCallback, useEffect, useRef, RefObject } from "react";
import { View, TextInput, Pressable, ScrollView } from "react-native";
import { useGradualList } from "../../utils/useGradualList";
import { Text } from "../primitives/text";
import { IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { Tailwind_colors, Tailwind_semantic } from "../../utils/tailwindConfig";
import { IconFilter2 } from "../icons/iconFilter2";
import {
  Exercise_filterCustomExercises,
  Exercise_toKey,
  Exercise_createCustomExercise,
  Exercise_get,
  Exercise_eq,
  Exercise_allExpanded,
  Exercise_filterExercises,
} from "../../models/exercise";
import { StringUtils_dashcase } from "../../utils/string";
import { ObjectUtils_values, ObjectUtils_clone } from "../../utils/object";
import { GroupHeader } from "../groupHeader";
import { CollectionUtils_compact } from "../../utils/collection";
import { LinkButton } from "../linkButton";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { exercisePickerSortNames } from "./exercisePickerFilter";
import {
  ExercisePickerUtils_getAllFilterNames,
  ExercisePickerUtils_filterCustomExercises,
  ExercisePickerUtils_sortCustomExercises,
  ExercisePickerUtils_getIsMultiselect,
  ExercisePickerUtils_chooseAdhocExercise,
  ExercisePickerUtils_filterExercises,
  ExercisePickerUtils_sortExercises,
} from "./exercisePickerUtils";
import { ExercisePickerExerciseItem } from "./exercisePickerExerciseItem";

interface IProps {
  settings: ISettings;
  onStar: (key: string) => void;
  state: IExercisePickerState;
  usedExerciseTypes: IExerciseType[];
  dispatch: ILensDispatch<IExercisePickerState>;
}

export function ExercisePickerAdhocExercises(props: IProps): JSX.Element {
  const builtinExercises = useMemo(() => {
    let result = Exercise_allExpanded({});
    if (props.state.search) {
      result = Exercise_filterExercises(result, props.state.search);
    }
    result = ExercisePickerUtils_filterExercises(result, props.state.filters, props.settings);
    if (props.state.filters.isStarred) {
      result = result.filter((e) => props.settings.starredExercises?.[Exercise_toKey(e)]);
    }
    result = ExercisePickerUtils_sortExercises(result, props.settings, props.state);
    return result;
  }, [props.state.search, props.state.filters, props.state.sort, props.settings]);

  const isMultiselect = ExercisePickerUtils_getIsMultiselect(props.state);
  const onChoose = useCallback(
    (key: string) => {
      ExercisePickerUtils_chooseAdhocExercise(props.dispatch, key, props.state);
    },
    [props.dispatch, props.state]
  );

  const containerRef = useRef<View>(null);
  const { visibleRecords, loadMoreVisibleRecords } = useGradualList(
    builtinExercises,
    0,
    20,
    containerRef as unknown as RefObject<{ clientHeight?: number } | null>,
    () => {}
  );
  useEffect(() => {
    if (builtinExercises.length > 20) {
      const t = setTimeout(() => loadMoreVisibleRecords(builtinExercises.length), 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [builtinExercises.length, loadMoreVisibleRecords]);

  return (
    <ScrollView keyboardShouldPersistTaps="handled" ref={containerRef as unknown as RefObject<ScrollView>}>
      <SearchAndFilter dispatch={props.dispatch} state={props.state} settings={props.settings} />
      <CustomExercises
        usedExerciseTypes={props.usedExerciseTypes}
        dispatch={props.dispatch}
        onStar={props.onStar}
        settings={props.settings}
        state={props.state}
        onChoose={onChoose}
        isMultiselect={isMultiselect}
      />
      <View className="py-2">
        <GroupHeader isExpanded={true} leftExpandIcon={true} name="Built-in Exercises" headerClassName="mx-4" />
      </View>
      {builtinExercises.slice(0, visibleRecords).map((e) => {
        const isUsedForDay = props.usedExerciseTypes.some((et) => Exercise_eq(et, e));
        const isSelectedAlready = props.state.selectedExercises.some(
          (ex) => "exerciseType" in ex && Exercise_eq(ex.exerciseType, e)
        );
        const isSelected = props.state.selectedExercises.some(
          (ex) => ex.type === "adhoc" && Exercise_eq(ex.exerciseType, e)
        );
        const testId = `menu-item-${StringUtils_dashcase(e.name)}${e.equipment ? `-${StringUtils_dashcase(e.equipment)}` : ""}`;
        return (
          <View
            key={Exercise_toKey(e)}
            data-cy={testId}
            testID={testId}
            className={`w-full py-1 pl-4 pr-2 border-b border-border-neutral ${
              isSelected ? "bg-background-purpledark" : ""
            }`}
          >
            <ExercisePickerExerciseItem
              onStar={props.onStar}
              isMultiselect={isMultiselect}
              isEnabled={!isUsedForDay && (!isMultiselect || !isSelectedAlready)}
              isSelected={isSelected}
              onChoose={onChoose}
              showMuscles={props.state.showMuscles}
              settings={props.settings}
              currentExerciseType={props.state.exerciseType}
              exercise={e}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

interface ISearchAndFilterProps {
  dispatch: ILensDispatch<IExercisePickerState>;
  settings: ISettings;
  state: IExercisePickerState;
}

function SearchAndFilter(props: ISearchAndFilterProps): JSX.Element {
  const filterNames = ExercisePickerUtils_getAllFilterNames(props.state.filters, props.settings);
  const isFiltered = filterNames.length > 0;
  return (
    <View className="my-1">
      <View className="flex-row items-center gap-2 mx-4">
        <View className="flex-row items-center flex-1 gap-2 p-2 rounded-lg bg-background-neutral">
          <IconMagnifyingGlass size={18} color={Tailwind_colors().lightgray[600]} />
          <TextInput
            placeholder="Search by name"
            placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
            className="flex-1 text-sm text-text-secondary"
            data-cy="exercise-filter-by-name"
            testID="exercise-filter-by-name"
            defaultValue={props.state.search ?? ""}
            onChangeText={(value) => {
              props.dispatch(lb<IExercisePickerState>().p("search").record(value), "Update search input");
            }}
          />
        </View>
        <Pressable
          className={`flex-row items-center gap-1 py-1 border rounded-lg ${
            isFiltered ? "border-button-secondarystroke px-2" : "px-4 border-border-neutral"
          }`}
          onPress={() =>
            props.dispatch(
              lb<IExercisePickerState>()
                .p("screenStack")
                .recordModify((stack) => [...stack, "filter"]),
              "Navigate to filter picker screen"
            )
          }
        >
          {isFiltered && (
            <View
              className="items-center justify-center rounded-full bg-button-primarybackground"
              style={{ width: 20, height: 20 }}
            >
              <Text className="text-xs font-semibold text-text-alwayswhite">{filterNames.length}</Text>
            </View>
          )}
          <IconFilter2 color={isFiltered ? Tailwind_semantic().icon.purple : Tailwind_semantic().icon.neutral} />
        </Pressable>
      </View>
      <View className="mx-4">
        <Text className="text-xs text-text-secondary">
          <Text className="text-xs text-text-secondary">Sorted by: </Text>
          <Text className="text-xs font-bold text-text-secondary">{exercisePickerSortNames[props.state.sort]}</Text>
          {filterNames.length > 0 && (
            <Text className="text-xs text-text-secondary">
              {", Filters: "}
              {filterNames.map((f, i) => (
                <Fragment key={i}>
                  {i > 0 ? ", " : ""}
                  <Text className="text-xs font-bold text-text-secondary">{f}</Text>
                </Fragment>
              ))}
            </Text>
          )}
        </Text>
        {filterNames.length > 0 && (
          <LinkButton
            name="clear-filters"
            className="text-xs"
            onPress={() => props.dispatch(lb<IExercisePickerState>().p("filters").record({}), "Clear filters")}
          >
            Clear
          </LinkButton>
        )}
      </View>
    </View>
  );
}

interface ICustomExercisesProps {
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
  state: IExercisePickerState;
  usedExerciseTypes: IExerciseType[];
  onStar: (key: string) => void;
  onChoose: (key: string) => void;
  isMultiselect: boolean;
}

function CustomExercises(props: ICustomExercisesProps): JSX.Element {
  const exercisesList = useMemo(() => {
    let exercises = props.settings.exercises;
    if (props.state.search) {
      exercises = Exercise_filterCustomExercises(exercises, props.state.search);
    }
    exercises = ExercisePickerUtils_filterCustomExercises(exercises, props.state.filters);
    let list = CollectionUtils_compact(ObjectUtils_values(exercises));
    if (props.state.filters.isStarred) {
      list = list.filter((e) => props.settings.starredExercises?.[Exercise_toKey(e)]);
    }
    list = list.filter((e) => !e.isDeleted);
    list = ExercisePickerUtils_sortCustomExercises(list, props.settings, props.state);
    return list;
  }, [props.settings, props.state.search, props.state.filters, props.state.sort]);

  return (
    <View className="py-2">
      <GroupHeader
        isExpanded={true}
        expandOnIconClick={true}
        leftExpandIcon={true}
        name="Custom Exercises"
        headerClassName="mx-4"
        rightAddOn={
          <LinkButton
            className="text-xs"
            data-cy="custom-exercise-create"
            name="create-custom-exercise"
            onPress={() => {
              props.dispatch(
                [
                  lb<IExercisePickerState>()
                    .p("editCustomExercise")
                    .record(Exercise_createCustomExercise("", [], [], [])),
                  lb<IExercisePickerState>()
                    .p("screenStack")
                    .recordModify((stack) => [...stack, "customExercise"]),
                ],
                "Navigate to create custom exercise screen"
              );
            }}
          >
            Create
          </LinkButton>
        }
      >
        {exercisesList.map((e) => {
          const ex = Exercise_get({ id: e.id }, props.settings.exercises);
          const isSelectedAlready = props.state.selectedExercises.some(
            (exrcs) => "exerciseType" in exrcs && Exercise_eq(exrcs.exerciseType, e)
          );
          const isUsedForDay = props.usedExerciseTypes.some((et) => Exercise_eq(et, e));
          const isSelected = props.state.selectedExercises.some(
            (exrcs) => exrcs.type === "adhoc" && Exercise_eq(exrcs.exerciseType, e)
          );
          return (
            <View
              key={Exercise_toKey(e)}
              data-cy={`menu-item-${e.id}`}
              testID={`menu-item-${e.id}`}
              className={`w-full py-1 pl-4 pr-2 border-b border-border-neutral ${
                isSelected ? "bg-background-purpledark" : ""
              }`}
            >
              <ExercisePickerExerciseItem
                onStar={props.onStar}
                isMultiselect={props.isMultiselect}
                isEnabled={!isUsedForDay && (!props.isMultiselect || !isSelectedAlready)}
                showMuscles={props.state.showMuscles}
                settings={props.settings}
                currentExerciseType={props.state.exerciseType}
                exercise={ex}
                isSelected={isSelected}
                onChoose={props.onChoose}
                onEdit={() => {
                  props.dispatch(
                    [
                      lb<IExercisePickerState>()
                        .p("screenStack")
                        .recordModify((stack) => [...stack, "customExercise"]),
                      lb<IExercisePickerState>().p("editCustomExercise").record(ObjectUtils_clone(e)),
                    ],
                    `Navigate to edit custom exercise screen for ${e.name}`
                  );
                }}
              />
            </View>
          );
        })}
      </GroupHeader>
    </View>
  );
}
