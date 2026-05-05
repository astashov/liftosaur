import { JSX, Fragment, useMemo, useCallback, useEffect, useRef, memo, useState } from "react";
import { View, TextInput, Pressable, ScrollView } from "react-native";
import { useScrollProgressiveList } from "../../utils/useScrollProgressiveList";
import { Text } from "../primitives/text";
import { ICustomExercise, IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { Tailwind_colors, Tailwind_semantic } from "../../utils/tailwindConfig";
import { IconFilter2 } from "../icons/iconFilter2";
import {
  Exercise_filterCustomExercises,
  Exercise_toKey,
  Exercise_createCustomExercise,
  Exercise_get,
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
  console.log("[render] ExercisePickerAdhocExercises");
  const { state, settings, dispatch, usedExerciseTypes, onStar } = props;
  const { search, filters, sort, showMuscles, exerciseType, selectedExercises } = state;

  const builtinExercises = useMemo(() => {
    let result = Exercise_allExpanded({});
    if (search) {
      result = Exercise_filterExercises(result, search);
    }
    result = ExercisePickerUtils_filterExercises(result, filters, settings);
    if (filters.isStarred) {
      result = result.filter((e) => settings.starredExercises?.[Exercise_toKey(e)]);
    }
    result = ExercisePickerUtils_sortExercises(result, settings, state);
    return result;
  }, [search, filters, sort, settings, exerciseType]);

  const isMultiselect = useMemo(() => ExercisePickerUtils_getIsMultiselect(state), [state.mode, state.exerciseType]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const onChoose = useCallback(
    (key: string) => {
      ExercisePickerUtils_chooseAdhocExercise(dispatch, key, stateRef.current);
    },
    [dispatch]
  );

  const usedKeys = useMemo(() => new Set(usedExerciseTypes.map((et) => Exercise_toKey(et))), [usedExerciseTypes]);
  const selectedAdhocKeys = useMemo(
    () => new Set(selectedExercises.filter((ex) => ex.type === "adhoc").map((ex) => Exercise_toKey(ex.exerciseType))),
    [selectedExercises]
  );
  const selectedAnyKeys = useMemo(
    () =>
      new Set(
        selectedExercises
          .filter((ex) => "exerciseType" in ex)
          .map((ex) => Exercise_toKey((ex as { exerciseType: IExerciseType }).exerciseType))
      ),
    [selectedExercises]
  );

  const isProgressiveEnabled = !(search && search.length > 2);
  const { visibleItems: visibleBuiltinExercises, onScroll } = useScrollProgressiveList(builtinExercises, {
    enabled: isProgressiveEnabled,
  });

  return (
    <ScrollView keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={100}>
      <SearchAndFilter dispatch={dispatch} search={search} sort={sort} filters={filters} settings={settings} />
      <CustomExercises
        usedKeys={usedKeys}
        selectedAdhocKeys={selectedAdhocKeys}
        selectedAnyKeys={selectedAnyKeys}
        dispatch={dispatch}
        onStar={onStar}
        settings={settings}
        state={state}
        onChoose={onChoose}
        isMultiselect={isMultiselect}
      />
      <View className="py-2">
        <GroupHeader isExpanded={true} leftExpandIcon={true} name="Built-in Exercises" headerClassName="mx-4" />
      </View>
      {visibleBuiltinExercises.map((e) => {
        const key = Exercise_toKey(e);
        const isUsedForDay = usedKeys.has(key);
        const isSelectedAlready = selectedAnyKeys.has(key);
        const isSelected = selectedAdhocKeys.has(key);
        const testId = `menu-item-${StringUtils_dashcase(e.name)}${e.equipment ? `-${StringUtils_dashcase(e.equipment)}` : ""}`;
        return (
          <View
            key={key}
            data-testid={testId}
            testID={testId}
            className={`w-full py-1 pl-4 pr-2 border-b border-border-neutral ${
              isSelected ? "bg-background-purpledark" : ""
            }`}
          >
            <ExercisePickerExerciseItem
              onStar={onStar}
              isMultiselect={isMultiselect}
              isEnabled={!isUsedForDay && (!isMultiselect || !isSelectedAlready)}
              isSelected={isSelected}
              onChoose={onChoose}
              showMuscles={showMuscles}
              settings={settings}
              currentExerciseType={exerciseType}
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
  search?: string;
  sort: IExercisePickerState["sort"];
  filters: IExercisePickerState["filters"];
}

const SearchAndFilter = memo(function SearchAndFilter(props: ISearchAndFilterProps): JSX.Element {
  console.log("[render] SearchAndFilter");
  const { dispatch, search, sort, filters, settings } = props;
  const filterNames = useMemo(() => ExercisePickerUtils_getAllFilterNames(filters, settings), [filters, settings]);
  const isFiltered = filterNames.length > 0;

  const [localSearch, setLocalSearch] = useState<string>(search ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  useEffect(() => {
    if (timeoutRef.current == null && (search ?? "") !== localSearch) {
      setLocalSearch(search ?? "");
    }
  }, [search, localSearch]);

  const onChangeText = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        dispatch(lb<IExercisePickerState>().p("search").record(value), "Update search input");
        timeoutRef.current = null;
      }, 200);
    },
    [dispatch]
  );

  const onFilterPress = useCallback(() => {
    dispatch(
      lb<IExercisePickerState>()
        .p("screenStack")
        .recordModify((stack) => [...stack, "filter"]),
      "Navigate to filter picker screen"
    );
  }, [dispatch]);

  const onClearFilters = useCallback(
    () => dispatch(lb<IExercisePickerState>().p("filters").record({}), "Clear filters"),
    [dispatch]
  );

  return (
    <View className="my-1">
      <View className="flex-row items-center gap-2 mx-4">
        <View className="flex-row items-center flex-1 gap-2 p-2 rounded-lg bg-background-neutral">
          <IconMagnifyingGlass size={18} color={Tailwind_colors().lightgray[600]} />
          <TextInput
            placeholder="Search by name"
            placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
            className="flex-1 text-sm text-text-secondary"
            data-testid="exercise-filter-by-name"
            testID="exercise-filter-by-name"
            value={localSearch}
            onChangeText={onChangeText}
          />
        </View>
        <Pressable
          className={`flex-row items-center gap-1 py-1 border rounded-lg ${
            isFiltered ? "border-button-secondarystroke px-2" : "px-4 border-border-neutral"
          }`}
          onPress={onFilterPress}
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
          <Text className="text-xs font-bold text-text-secondary">{exercisePickerSortNames[sort]}</Text>
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
          <LinkButton name="clear-filters" className="text-xs" onPress={onClearFilters}>
            Clear
          </LinkButton>
        )}
      </View>
    </View>
  );
});

interface ICustomExercisesProps {
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
  state: IExercisePickerState;
  usedKeys: Set<string>;
  selectedAdhocKeys: Set<string>;
  selectedAnyKeys: Set<string>;
  onStar: (key: string) => void;
  onChoose: (key: string) => void;
  isMultiselect: boolean;
}

function CustomExercises(props: ICustomExercisesProps): JSX.Element {
  console.log("[render] CustomExercises");
  const { settings, dispatch, state, usedKeys, selectedAdhocKeys, selectedAnyKeys, onStar, onChoose, isMultiselect } =
    props;
  const { search, filters, sort, showMuscles, exerciseType } = state;

  const exercisesList = useMemo(() => {
    let exercises = settings.exercises;
    if (search) {
      exercises = Exercise_filterCustomExercises(exercises, search);
    }
    exercises = ExercisePickerUtils_filterCustomExercises(exercises, filters);
    let list = CollectionUtils_compact(ObjectUtils_values(exercises));
    if (filters.isStarred) {
      list = list.filter((e) => settings.starredExercises?.[Exercise_toKey(e)]);
    }
    list = list.filter((e) => !e.isDeleted);
    list = ExercisePickerUtils_sortCustomExercises(list, settings, state);
    return list;
  }, [settings, search, filters, sort, exerciseType]);

  const onCreatePress = useCallback(() => {
    dispatch(
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
  }, [dispatch]);

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
            data-testid="custom-exercise-create"
            testID="custom-exercise-create"
            name="create-custom-exercise"
            onPress={onCreatePress}
          >
            Create
          </LinkButton>
        }
      >
        {exercisesList.map((e) => {
          const key = Exercise_toKey(e);
          const ex = Exercise_get({ id: e.id }, settings.exercises);
          const isSelectedAlready = selectedAnyKeys.has(key);
          const isUsedForDay = usedKeys.has(key);
          const isSelected = selectedAdhocKeys.has(key);
          return (
            <CustomExerciseRow
              key={key}
              exercise={ex}
              rawExercise={e}
              isSelected={isSelected}
              isEnabled={!isUsedForDay && (!isMultiselect || !isSelectedAlready)}
              isMultiselect={isMultiselect}
              showMuscles={showMuscles}
              currentExerciseType={exerciseType}
              settings={settings}
              dispatch={dispatch}
              onChoose={onChoose}
              onStar={onStar}
            />
          );
        })}
      </GroupHeader>
    </View>
  );
}

interface ICustomExerciseRowProps {
  exercise: ReturnType<typeof Exercise_get>;
  rawExercise: ICustomExercise;
  isSelected: boolean;
  isEnabled: boolean;
  isMultiselect: boolean;
  showMuscles?: boolean;
  currentExerciseType?: IExerciseType;
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
  onChoose: (key: string) => void;
  onStar: (key: string) => void;
}

const CustomExerciseRow = memo(function CustomExerciseRow(props: ICustomExerciseRowProps): JSX.Element {
  console.log(`[render] CustomExerciseRow ${props.rawExercise.id}`);
  const { rawExercise, dispatch } = props;
  const onEdit = useCallback(() => {
    dispatch(
      [
        lb<IExercisePickerState>()
          .p("screenStack")
          .recordModify((stack) => [...stack, "customExercise"]),
        lb<IExercisePickerState>().p("editCustomExercise").record(ObjectUtils_clone(rawExercise)),
      ],
      `Navigate to edit custom exercise screen for ${rawExercise.name}`
    );
  }, [dispatch, rawExercise]);

  return (
    <View
      data-testid={`menu-item-${rawExercise.id}`}
      testID={`menu-item-${rawExercise.id}`}
      className={`w-full py-1 pl-4 pr-2 border-b border-border-neutral ${
        props.isSelected ? "bg-background-purpledark" : ""
      }`}
    >
      <ExercisePickerExerciseItem
        onStar={props.onStar}
        isMultiselect={props.isMultiselect}
        isEnabled={props.isEnabled}
        showMuscles={props.showMuscles}
        settings={props.settings}
        currentExerciseType={props.currentExerciseType}
        exercise={props.exercise}
        isSelected={props.isSelected}
        onChoose={props.onChoose}
        onEdit={onEdit}
      />
    </View>
  );
});
