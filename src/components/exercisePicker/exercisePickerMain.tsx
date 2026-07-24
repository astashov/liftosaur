import { JSX, Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, Platform, TextInput } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { AnimatedLegendList } from "@legendapp/list/reanimated";
import { Text } from "../primitives/text";
import { IconMuscles2 } from "../icons/iconMuscles2";
import { IconStar } from "../icons/iconStar";
import { IconFilter } from "../icons/iconFilter";
import { IconFilter2 } from "../icons/iconFilter2";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { Tailwind_colors, Tailwind_semantic } from "../../utils/tailwindConfig";
import { IEvaluatedProgram, IEvaluatedProgramWeek } from "../../models/program";
import {
  ICustomExercise,
  IExercisePickerSelectedExercise,
  IExercisePickerState,
  IExerciseType,
  ISettings,
} from "../../types";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { Button } from "../button";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import {
  Exercise_get,
  Exercise_fullName,
  Exercise_toKey,
  Exercise_createCustomExercise,
  Exercise_allExpanded,
  Exercise_filterAndRankByQuery,
  Exercise_filterAndRankCustomByQuery,
  Exercise_matchesQuery,
  IExercise,
} from "../../models/exercise";
import {
  ExercisePickerUtils_getProgramExercisefullName,
  ExercisePickerUtils_getAllFilterNames,
  ExercisePickerUtils_filterCustomExercises,
  ExercisePickerUtils_sortCustomExercises,
  ExercisePickerUtils_getIsMultiselect,
  ExercisePickerUtils_chooseAdhocExercise,
  ExercisePickerUtils_chooseProgramExercise,
  ExercisePickerUtils_filterExercises,
  ExercisePickerUtils_sortExercises,
} from "./exercisePickerUtils";
import { CollectionUtils_compact } from "../../utils/collection";
import { ObjectUtils_values, ObjectUtils_clone, ObjectUtils_keys } from "../../utils/object";
import { StringUtils_dashcase } from "../../utils/string";
import { ExercisePickerCurrentExercise } from "./exercisePickerCurrentExercise";
import { ExercisePickerTemplate } from "./exercisePickerTemplate";
import { ExercisePickerExerciseItem } from "./exercisePickerExerciseItem";
import { Input, IValidationError } from "../input";
import { IEither } from "../../utils/types";
import { SheetDragHandle } from "../../navigation/TransparentModal";
import { getNavigationService } from "../../navigation/navUtils";
import { GroupHeader } from "../groupHeader";
import { LinkButton } from "../linkButton";
import { ExerciseImage } from "../exerciseImage";
import { HistoryRecordSet } from "../historyRecordSets";
import {
  PlannerProgramExercise_currentEvaluatedSetVariation,
  PlannerProgramExercise_evaluatedSetsToDisplaySets,
} from "../../pages/planner/models/plannerProgramExercise";
import { IconCheckCircle } from "../icons/iconCheckCircle";
import { exercisePickerSortNames } from "./exercisePickerFilter";
import { Scroller } from "../scroller";

interface IProps {
  isHidden: boolean;
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
  onStar: (key: string) => void;
  onChoose: (selectedExercises: IExercisePickerSelectedExercise[]) => void;
  usedExerciseTypes: IExerciseType[];
  state: IExercisePickerState;
  evaluatedProgram?: IEvaluatedProgram;
  onClose: () => void;
}

interface IProgramGroup {
  exerciseKey: string;
  exerciseType: IExerciseType;
  name: string;
  exercises: IPlannerProgramExercise[];
}

type IListItem =
  | { kind: "title" }
  | { kind: "labelInput" }
  | { kind: "currentExercise"; exerciseType: IExerciseType }
  | { kind: "tabs" }
  | { kind: "weekTabs" }
  | { kind: "searchFilter" }
  | { kind: "stickyChrome"; showTabs: boolean; sub: "search" | "program" | null; showWeeks: boolean }
  | { kind: "customHeader" }
  | { kind: "customExercise"; raw: ICustomExercise; exercise: IExercise; key: string }
  | { kind: "builtinHeader" }
  | { kind: "builtinExercise"; exercise: IExercise; key: string }
  | { kind: "programGroup"; group: IProgramGroup }
  | { kind: "programEmpty"; message: string }
  | { kind: "templateForm" };

interface ITabDef {
  label: string;
  index: number;
}

export function ExercisePickerMain(props: IProps): JSX.Element {
  const { evaluatedProgram, state, dispatch, settings, onStar, onChoose, usedExerciseTypes } = props;
  const {
    mode,
    search,
    filters,
    sort,
    showMuscles,
    exerciseType,
    selectedExercises,
    label,
    templateName,
    hideLabel,
    hideTemplate,
  } = state;
  const isStarred = !!filters.isStarred;

  const title =
    mode === "workout"
      ? exerciseType
        ? "Swap Exercise"
        : "Add Exercises"
      : exerciseType || templateName
        ? "Edit Exercise"
        : "Add Exercise";

  const tabs = useMemo<ITabDef[]>(() => {
    if (mode === "workout") {
      const result: ITabDef[] = [{ label: "Ad-hoc Exercise", index: 0 }];
      if (evaluatedProgram) {
        result.push({ label: "From Program", index: 1 });
      }
      return result;
    }
    const result: ITabDef[] = [{ label: "Exercise", index: 0 }];
    if (!hideTemplate) {
      result.push({ label: "Template", index: 1 });
    }
    return result;
  }, [mode, evaluatedProgram, hideTemplate]);

  const selectedTab = Math.min(state.selectedTab ?? 0, tabs.length - 1);

  const weeks = evaluatedProgram?.weeks ?? [];
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  useEffect(() => {
    if (currentWeekIndex >= weeks.length) {
      setCurrentWeekIndex(0);
    }
  }, [weeks.length, currentWeekIndex]);

  const [isCustomCollapsed, setIsCustomCollapsed] = useState(false);
  const [isBuiltinCollapsed, setIsBuiltinCollapsed] = useState(false);

  const isMultiselect = useMemo(
    () => ExercisePickerUtils_getIsMultiselect({ mode, exerciseType }),
    [mode, exerciseType]
  );

  const useRankOrdering = !!search && !(sort === "similar_muscles" && exerciseType);

  const builtinExercises = useMemo(() => {
    let result = Exercise_allExpanded({});
    result = ExercisePickerUtils_filterExercises(result, filters, settings);
    if (filters.isStarred) {
      result = result.filter((e) => settings.starredExercises?.[Exercise_toKey(e)]);
    }
    if (search) {
      result = useRankOrdering
        ? Exercise_filterAndRankByQuery(result, search)
        : result.filter((e) => Exercise_matchesQuery(e, search));
    }
    if (!useRankOrdering) {
      result = ExercisePickerUtils_sortExercises(result, settings, { filters, sort, exerciseType });
    }
    return result;
  }, [search, useRankOrdering, filters, sort, settings, exerciseType]);

  const customExercises = useMemo(() => {
    const exercises = ExercisePickerUtils_filterCustomExercises(settings.exercises, filters);
    let list: ICustomExercise[];
    if (search) {
      list = useRankOrdering
        ? Exercise_filterAndRankCustomByQuery(exercises, search)
        : CollectionUtils_compact(ObjectUtils_values(exercises))
            .filter((e) => !e.isDeleted)
            .filter((e) => Exercise_matchesQuery(e, search));
    } else {
      list = CollectionUtils_compact(ObjectUtils_values(exercises)).filter((e) => !e.isDeleted);
    }
    if (!useRankOrdering) {
      list = ExercisePickerUtils_sortCustomExercises(list, settings, { filters, sort, exerciseType });
    }
    if (filters.isStarred) {
      list = list.filter((e) => settings.starredExercises?.[Exercise_toKey(e)]);
    }
    return list.map((raw) => ({
      raw,
      key: Exercise_toKey(raw),
      exercise: Exercise_get({ id: raw.id }, settings.exercises),
    }));
  }, [settings, search, useRankOrdering, filters, sort, exerciseType]);

  const currentWeek: IEvaluatedProgramWeek | undefined = weeks[currentWeekIndex] ?? weeks[0];
  const programGroups = useMemo<IProgramGroup[]>(() => {
    if (!currentWeek) {
      return [];
    }
    const grouped: Record<string, IPlannerProgramExercise[]> = {};
    for (const day of currentWeek.days) {
      for (const ex of day.exercises) {
        if (!grouped[ex.key]) {
          grouped[ex.key] = [];
        }
        grouped[ex.key].push(ex);
      }
    }
    return ObjectUtils_keys(grouped)
      .map((key) => {
        const exs = grouped[key];
        const first = exs[0];
        if (first.exerciseType == null) {
          return undefined;
        }
        return {
          exerciseKey: key,
          exerciseType: first.exerciseType,
          name: first.name,
          exercises: exs,
        };
      })
      .filter((g): g is IProgramGroup => g != null)
      .filter((g) => !search || Exercise_matchesQuery({ name: g.name, equipment: g.exerciseType.equipment }, search));
  }, [currentWeek, search]);

  const usedKeys = useMemo(() => new Set(usedExerciseTypes.map((et) => Exercise_toKey(et))), [usedExerciseTypes]);

  const selectedAdhocKeys = useMemo(
    () => new Set(selectedExercises.filter((ex) => ex.type === "adhoc").map((ex) => Exercise_toKey(ex.exerciseType))),
    [selectedExercises]
  );

  const selectedProgramKeys = useMemo(() => {
    const keys = new Set<string>();
    selectedExercises.forEach((ex) => {
      if (ex.type === "program") {
        keys.add(`${Exercise_toKey(ex.exerciseType)}_${ex.week}_${ex.dayInWeek}`);
      }
    });
    return keys;
  }, [selectedExercises]);

  const selectedAnyKeys = useMemo(
    () =>
      new Set(
        selectedExercises
          .filter((ex) => "exerciseType" in ex)
          .map((ex) => Exercise_toKey((ex as { exerciseType: IExerciseType }).exerciseType))
      ),
    [selectedExercises]
  );

  const chooseCtxRef = useRef({ mode, exerciseType, selectedExercises, label });
  chooseCtxRef.current = { mode, exerciseType, selectedExercises, label };

  const onChooseAdhoc = useCallback(
    (key: string) => {
      ExercisePickerUtils_chooseAdhocExercise(dispatch, key, chooseCtxRef.current);
    },
    [dispatch]
  );

  const onChooseProgram = useCallback(
    (et: IExerciseType, week: number, dayInWeek: number) => {
      ExercisePickerUtils_chooseProgramExercise(dispatch, et, week, dayInWeek, chooseCtxRef.current);
    },
    [dispatch]
  );

  const onSettingsPress = useCallback(async () => {
    if (Platform.OS === "web") {
      dispatch(
        lb<IExercisePickerState>()
          .p("screenStack")
          .recordModify((stack) => [...stack, "settings"]),
        "Navigate to settings picker screen"
      );
    } else {
      const { navigateToModal } = await getNavigationService();
      navigateToModal("exercisePickerSettingsModal");
    }
  }, [dispatch]);

  const onToggleMuscles = useCallback(() => {
    dispatch(
      lb<IExercisePickerState>().p("showMuscles").record(!showMuscles),
      `Toggle show muscles to ${!showMuscles}`
    );
  }, [dispatch, showMuscles]);

  const onToggleStarred = useCallback(() => {
    dispatch(
      lb<IExercisePickerState>().p("filters").p("isStarred").record(!isStarred),
      `Toggle starred exercises to ${!isStarred}`
    );
  }, [dispatch, isStarred]);

  const onLabelChange = useCallback(
    (e: IEither<string, Set<IValidationError>>) => {
      if (e.success) {
        dispatch(
          [
            lb<IExercisePickerState>().p("label").record(e.data),
            lb<IExercisePickerState>()
              .p("selectedExercises")
              .recordModify((exercises) => {
                return exercises.map((ex) => {
                  if (ex.type === "adhoc" || ex.type === "template") {
                    return { ...ex, label: e.data };
                  } else {
                    return ex;
                  }
                });
              }),
          ],
          `Set label to ${e.data}`
        );
      }
    },
    [dispatch]
  );

  const onTabChange = useCallback(
    (tab: number) => {
      dispatch(
        lb<IExercisePickerState>().p("selectedTab").record(tab),
        `Set selected tab in exercise picker to ${tab}`
      );
    },
    [dispatch]
  );

  const onCreateCustom = useCallback(() => {
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

  const onBottomClick = useCallback(() => {
    const isTemplateSave = state.mode === "program" && state.selectedTab === 1;
    if (isTemplateSave && state.templateName) {
      onChoose([
        {
          type: "template",
          name: state.templateName,
          label: state.label,
        },
      ]);
    } else {
      onChoose(state.selectedExercises);
    }
  }, [state.mode, state.selectedTab, state.templateName, state.label, state.selectedExercises, onChoose]);

  const items = useMemo<IListItem[]>(() => {
    const result: IListItem[] = [{ kind: "title" }];
    if (mode === "program" && !hideLabel) {
      result.push({ kind: "labelInput" });
    }
    if (exerciseType) {
      result.push({ kind: "currentExercise", exerciseType });
    }

    const isAdhocTab = selectedTab === 0;
    const isFromProgramTab = mode === "workout" && selectedTab === 1 && evaluatedProgram != null;
    const isTemplateTab = mode === "program" && selectedTab === 1;
    const showTabs = tabs.length > 1;

    if (mode === "workout") {
      const sub: "search" | "program" | null = isAdhocTab ? "search" : isFromProgramTab ? "program" : null;
      if (showTabs || sub != null) {
        result.push({ kind: "stickyChrome", showTabs, sub, showWeeks: isFromProgramTab && weeks.length > 1 });
      }
    } else {
      if (showTabs) {
        result.push({ kind: "tabs" });
      }
      if (isAdhocTab) {
        result.push({ kind: "searchFilter" });
      }
    }

    if (isFromProgramTab) {
      if (weeks.length === 0) {
        result.push({ kind: "programEmpty", message: "No weeks available in the program." });
      } else if (programGroups.length === 0) {
        result.push({ kind: "programEmpty", message: "No exercises match your search." });
      } else {
        for (const g of programGroups) {
          result.push({ kind: "programGroup", group: g });
        }
      }
    } else if (isTemplateTab) {
      result.push({ kind: "templateForm" });
    } else if (isAdhocTab) {
      result.push({ kind: "customHeader" });
      if (!isCustomCollapsed) {
        for (const c of customExercises) {
          result.push({ kind: "customExercise", raw: c.raw, exercise: c.exercise, key: c.key });
        }
      }
      result.push({ kind: "builtinHeader" });
      if (!isBuiltinCollapsed) {
        for (const e of builtinExercises) {
          result.push({ kind: "builtinExercise", exercise: e, key: Exercise_toKey(e) });
        }
      }
    }
    return result;
  }, [
    mode,
    hideLabel,
    exerciseType,
    tabs.length,
    selectedTab,
    evaluatedProgram,
    weeks.length,
    programGroups,
    customExercises,
    builtinExercises,
    isCustomCollapsed,
    isBuiltinCollapsed,
  ]);

  const stickyIndices = useMemo<number[] | undefined>(() => {
    if (Platform.OS === "web") {
      return undefined;
    }
    if (mode === "workout") {
      const idx = items.findIndex((it) => it.kind === "stickyChrome");
      return idx !== -1 ? [idx] : undefined;
    }
    if (mode === "program" && selectedTab === 0) {
      const idx = items.findIndex((it) => it.kind === "searchFilter");
      return idx !== -1 ? [idx] : undefined;
    }
    return undefined;
  }, [items, mode, selectedTab]);

  const keyExtractor = useCallback((item: IListItem) => {
    switch (item.kind) {
      case "title":
        return "title";
      case "labelInput":
        return "labelInput";
      case "currentExercise":
        return "currentExercise";
      case "tabs":
        return "tabs";
      case "weekTabs":
        return "weekTabs";
      case "searchFilter":
        return "searchFilter";
      case "stickyChrome":
        return "stickyChrome";
      case "customHeader":
        return "customHeader";
      case "customExercise":
        return `custom-${item.raw.id}`;
      case "builtinHeader":
        return "builtinHeader";
      case "builtinExercise":
        return `builtin-${item.key}`;
      case "programGroup":
        return `programGroup-${item.group.exerciseKey}`;
      case "programEmpty":
        return "programEmpty";
      case "templateForm":
        return "templateForm";
    }
  }, []);

  const getItemType = useCallback((item: IListItem) => item.kind, []);

  const getEstimatedItemSize = useCallback((_index: number, item: IListItem) => {
    switch (item.kind) {
      case "title":
        return 44;
      case "labelInput":
        return 64;
      case "currentExercise":
        return 100;
      case "tabs":
        return 44;
      case "weekTabs":
        return 48;
      case "searchFilter":
        return 92;
      case "stickyChrome": {
        const tabsHeight = item.showTabs ? 44 : 0;
        const subHeight = item.sub === "search" ? 92 : item.sub === "program" ? 48 + (item.showWeeks ? 48 : 0) : 0;
        return tabsHeight + subHeight || 44;
      }
      case "customHeader":
      case "builtinHeader":
        return 44;
      case "customExercise":
      case "builtinExercise":
        return 72;
      case "programGroup":
        return 140;
      case "programEmpty":
        return 60;
      case "templateForm":
        return 220;
    }
  }, []);

  const scrollY = useSharedValue(0);
  const titleHeight = useSharedValue(0);
  const labelHeight = useSharedValue(0);
  const currentExHeight = useSharedValue(0);
  const tabsHeight = useSharedValue(0);
  const onAnimatedScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const captureHeight = useCallback(
    (sv: typeof scrollY) => (e: { nativeEvent: { layout: { height: number } } }) => {
      sv.value = e.nativeEvent.layout.height;
    },
    []
  );
  const onTitleLayout = useMemo(() => captureHeight(titleHeight), [captureHeight, titleHeight]);
  const onLabelLayout = useMemo(() => captureHeight(labelHeight), [captureHeight, labelHeight]);
  const onCurrentExLayout = useMemo(() => captureHeight(currentExHeight), [captureHeight, currentExHeight]);
  const onTabsLayout = useMemo(() => captureHeight(tabsHeight), [captureHeight, tabsHeight]);
  const stickyShadowStyle = useAnimatedStyle(() => {
    const top = titleHeight.value + labelHeight.value + currentExHeight.value + tabsHeight.value;
    const t = top > 0 ? interpolate(scrollY.value, [top - 4, top + 4], [0, 1], Extrapolation.CLAMP) : 0;
    if (Platform.OS === "ios") {
      return { shadowOpacity: t * 0.12 };
    }
    if (Platform.OS === "android") {
      return { elevation: t * 4 };
    }
    return { opacity: 1 };
  });
  const stickyLabelStyle = useAnimatedStyle(() => {
    if (currentExHeight.value === 0) {
      return { opacity: 0, transform: [{ translateY: 0 }] };
    }
    const cardTop = titleHeight.value + labelHeight.value;
    const cardBottom = cardTop + currentExHeight.value;
    const t = interpolate(scrollY.value, [cardTop, cardBottom], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ translateY: (1 - t) * 6 }] };
  });

  const currentExerciseName = useMemo(() => {
    if (!exerciseType) {
      return "";
    }
    const ex = Exercise_get(exerciseType, settings.exercises);
    return Exercise_fullName(ex, settings);
  }, [exerciseType, settings]);

  const renderItem = useCallback(
    ({ item }: { item: IListItem }) => {
      switch (item.kind) {
        case "title":
          return (
            <SheetDragHandle>
              <View className="relative py-1" onLayout={onTitleLayout}>
                <Text className="px-4 py-2 font-bold text-center">{title}</Text>
                <View className="absolute flex-row top-3 left-4">
                  <Pressable className="px-2" onPress={onSettingsPress}>
                    <IconFilter />
                  </Pressable>
                </View>
                <View className="absolute flex-row items-center top-3 right-4">
                  <Pressable className="px-2" onPress={onToggleMuscles}>
                    <IconMuscles2 color={Tailwind_semantic().icon.purple} isSelected={showMuscles} />
                  </Pressable>
                  <Pressable className="px-2" onPress={onToggleStarred}>
                    <IconStar isSelected={isStarred} color={Tailwind_semantic().icon.purple} />
                  </Pressable>
                </View>
              </View>
            </SheetDragHandle>
          );
        case "labelInput":
          return (
            <View className="px-4 pb-1" onLayout={onLabelLayout}>
              <Input
                label="Label"
                defaultValue={state.label}
                isLabelOutside={true}
                changeType={"oninput"}
                inputSize="sm"
                pattern="^[^\/\{\}\(\)\t\n\r#\[\]]+$"
                patternMessage="Label cannot contain special characters: '/{}()#[]'"
                labelSize="xs"
                changeHandler={onLabelChange}
              />
            </View>
          );
        case "currentExercise":
          return (
            <SheetDragHandle>
              <View className="pt-2" onLayout={onCurrentExLayout}>
                <ExercisePickerCurrentExercise state={state} exerciseType={item.exerciseType} settings={settings} />
              </View>
            </SheetDragHandle>
          );
        case "tabs":
          return (
            <View onLayout={onTabsLayout}>
              <TabsRow tabs={tabs} selectedTab={selectedTab} onTabChange={onTabChange} />
            </View>
          );
        case "weekTabs":
          return <WeekTabsRow weeks={weeks} currentWeekIndex={currentWeekIndex} onChange={setCurrentWeekIndex} />;
        case "searchFilter":
          return (
            <Animated.View
              className="bg-background-default"
              style={[
                Platform.select({
                  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
                  android: {},
                  default: {},
                }),
                stickyShadowStyle,
              ]}
            >
              {exerciseType != null && (
                <Animated.View
                  pointerEvents="none"
                  style={[{ height: 18, justifyContent: "flex-end" }, stickyLabelStyle]}
                >
                  <Text numberOfLines={1} className="px-4 text-xs text-center text-text-secondary">
                    <Text className="text-xs text-text-secondary">Current Exercise: </Text>
                    <Text className="text-xs font-bold">{currentExerciseName}</Text>
                  </Text>
                </Animated.View>
              )}
              <SearchAndFilter dispatch={dispatch} search={search} sort={sort} filters={filters} settings={settings} />
            </Animated.View>
          );
        case "stickyChrome":
          return (
            <Animated.View
              className="bg-background-default"
              style={[
                Platform.select({
                  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
                  android: {},
                  default: {},
                }),
                stickyShadowStyle,
              ]}
            >
              {exerciseType != null && (
                <Animated.View
                  pointerEvents="none"
                  style={[{ height: 18, justifyContent: "flex-end" }, stickyLabelStyle]}
                >
                  <Text numberOfLines={1} className="px-4 text-xs text-center text-text-secondary">
                    <Text className="text-xs text-text-secondary">Current Exercise: </Text>
                    <Text className="text-xs font-bold">{currentExerciseName}</Text>
                  </Text>
                </Animated.View>
              )}
              {item.showTabs && <TabsRow tabs={tabs} selectedTab={selectedTab} onTabChange={onTabChange} />}
              {item.sub === "search" && (
                <SearchAndFilter
                  dispatch={dispatch}
                  search={search}
                  sort={sort}
                  filters={filters}
                  settings={settings}
                />
              )}
              {item.sub === "program" && (
                <>
                  <View className="flex-row items-center mx-4 my-1">
                    <SearchInput dispatch={dispatch} search={search} />
                  </View>
                  {item.showWeeks && (
                    <WeekTabsRow weeks={weeks} currentWeekIndex={currentWeekIndex} onChange={setCurrentWeekIndex} />
                  )}
                </>
              )}
            </Animated.View>
          );
        case "customHeader":
          return (
            <View className="py-2">
              <GroupHeader
                isExpanded={!isCustomCollapsed}
                onToggle={() => setIsCustomCollapsed((v) => !v)}
                leftExpandIcon={true}
                name="Custom Exercises"
                headerClassName="mx-4"
                rightAddOn={
                  <LinkButton
                    className="text-xs"
                    data-testid="custom-exercise-create"
                    testID="custom-exercise-create"
                    name="create-custom-exercise"
                    onPress={onCreateCustom}
                  >
                    Create
                  </LinkButton>
                }
              />
            </View>
          );
        case "customExercise": {
          const isSelectedAlready = selectedAnyKeys.has(item.key);
          const isUsedForDay = usedKeys.has(item.key);
          const isSelected = selectedAdhocKeys.has(item.key);
          return (
            <CustomExerciseRow
              rawExercise={item.raw}
              exercise={item.exercise}
              isSelected={isSelected}
              isEnabled={!isUsedForDay && (!isMultiselect || !isSelectedAlready)}
              isMultiselect={isMultiselect}
              showMuscles={showMuscles}
              currentExerciseType={exerciseType}
              settings={settings}
              dispatch={dispatch}
              onChoose={onChooseAdhoc}
              onStar={onStar}
            />
          );
        }
        case "builtinHeader":
          return (
            <View className="py-2">
              <GroupHeader
                isExpanded={!isBuiltinCollapsed}
                onToggle={() => setIsBuiltinCollapsed((v) => !v)}
                leftExpandIcon={true}
                name="Built-in Exercises"
                headerClassName="mx-4"
              />
            </View>
          );
        case "builtinExercise": {
          const e = item.exercise;
          const key = item.key;
          const isUsedForDay = usedKeys.has(key);
          const isSelectedAlready = selectedAnyKeys.has(key);
          const isSelected = selectedAdhocKeys.has(key);
          const testId = `menu-item-${StringUtils_dashcase(e.name)}${
            e.equipment ? `-${StringUtils_dashcase(e.equipment)}` : ""
          }`;
          return (
            <View
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
                onChoose={onChooseAdhoc}
                showMuscles={showMuscles}
                settings={settings}
                currentExerciseType={exerciseType}
                exercise={e}
              />
            </View>
          );
        }
        case "programGroup":
          return (
            <ProgramExerciseGroupCard
              group={item.group}
              isMultiselect={isMultiselect}
              selectedProgramKeys={selectedProgramKeys}
              selectedAnyKeys={selectedAnyKeys}
              usedKeys={usedKeys}
              settings={settings}
              onChoose={onChooseProgram}
            />
          );
        case "programEmpty":
          return (
            <View className="px-4 py-6">
              <Text className="text-sm text-center text-text-secondary">{item.message}</Text>
            </View>
          );
        case "templateForm":
          return <ExercisePickerTemplate dispatch={dispatch} templateName={templateName} />;
      }
    },
    [
      title,
      onSettingsPress,
      onToggleMuscles,
      onToggleStarred,
      showMuscles,
      isStarred,
      state,
      onLabelChange,
      settings,
      tabs,
      selectedTab,
      onTabChange,
      weeks,
      currentWeekIndex,
      dispatch,
      search,
      sort,
      filters,
      onCreateCustom,
      selectedAnyKeys,
      usedKeys,
      selectedAdhocKeys,
      isMultiselect,
      exerciseType,
      onChooseAdhoc,
      onStar,
      selectedProgramKeys,
      onChooseProgram,
      templateName,
      stickyShadowStyle,
      stickyLabelStyle,
      currentExerciseName,
      onTitleLayout,
      onLabelLayout,
      onCurrentExLayout,
      onTabsLayout,
      isCustomCollapsed,
      isBuiltinCollapsed,
    ]
  );

  const bottomShadowStyle = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4 },
        android: { elevation: 4 },
        default: { boxShadow: "0 -4px 4px 0 rgba(0, 0, 0, 0.05)" },
      }),
    []
  );

  const listExtraData = useMemo(
    () => ({
      selectedAdhocKeys,
      selectedProgramKeys,
      selectedAnyKeys,
      usedKeys,
      isMultiselect,
      showMuscles,
      currentExerciseName,
    }),
    [selectedAdhocKeys, selectedProgramKeys, selectedAnyKeys, usedKeys, isMultiselect, showMuscles, currentExerciseName]
  );

  return (
    <View className="flex-1">
      <View className="flex-1">
        <AnimatedLegendList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          getEstimatedItemSize={getEstimatedItemSize}
          stickyIndices={stickyIndices}
          extraData={listExtraData}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 16 }}
          onScroll={onAnimatedScroll}
          bounces={false}
          overScrollMode="never"
        />
      </View>
      <View className="w-full px-4 pt-2 pb-2" style={bottomShadowStyle}>
        <BottomButton state={state} evaluatedProgram={evaluatedProgram} onClick={onBottomClick} settings={settings} />
      </View>
    </View>
  );
}

interface ITabsRowProps {
  tabs: ITabDef[];
  selectedTab: number;
  onTabChange: (tab: number) => void;
}

const TabsRow = memo(function TabsRow(props: ITabsRowProps): JSX.Element {
  const { tabs, selectedTab, onTabChange } = props;
  const activeColor = Tailwind_semantic().button.secondarystroke;
  return (
    <View className="flex-row bg-background-default">
      {tabs.map((tab) => {
        const isSelected = selectedTab === tab.index;
        const nameClass = `tab-${StringUtils_dashcase(tab.label.toLowerCase())}`;
        return (
          <View
            key={tab.label}
            className="items-center border-b border-border-neutral"
            style={{ flexGrow: 1, flexShrink: 0, flexBasis: "auto" }}
          >
            <Pressable
              className="px-4 pt-2 pb-1"
              style={isSelected ? { borderBottomWidth: 2, borderBottomColor: activeColor } : undefined}
              data-testid={nameClass}
              testID={nameClass}
              onPress={() => onTabChange(tab.index)}
            >
              <Text numberOfLines={1} className={`text-base ${isSelected ? "text-text-purple" : ""}`}>
                {tab.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
});

interface IWeekTabsRowProps {
  weeks: IEvaluatedProgramWeek[];
  currentWeekIndex: number;
  onChange: (index: number) => void;
}

const WeekTabsRow = memo(function WeekTabsRow(props: IWeekTabsRowProps): JSX.Element {
  const { weeks, currentWeekIndex, onChange } = props;
  return (
    <View className="bg-background-default">
      <Scroller>
        <View className="flex-row gap-2 px-4 py-2">
          {weeks.map((week, i) => {
            const isSelected = currentWeekIndex === i;
            const nameClass = `tab-${StringUtils_dashcase(week.name.toLowerCase())}`;
            return (
              <Pressable
                key={`${i}-${week.name}`}
                className={`px-3 py-2 rounded ${
                  isSelected
                    ? "bg-background-default border border-button-primarybackground"
                    : "bg-background-subtle border border-background-default"
                }`}
                data-testid={nameClass}
                testID={nameClass}
                onPress={() => onChange(i)}
              >
                <Text className={`text-sm ${isSelected ? "text-text-purple" : "text-text-secondary"}`}>
                  {week.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Scroller>
    </View>
  );
});

interface ISearchAndFilterProps {
  dispatch: ILensDispatch<IExercisePickerState>;
  settings: ISettings;
  search?: string;
  sort: IExercisePickerState["sort"];
  filters: IExercisePickerState["filters"];
}

const SearchInput = memo(function SearchInput(props: {
  dispatch: ILensDispatch<IExercisePickerState>;
  search?: string;
}): JSX.Element {
  const { dispatch, search } = props;
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

  return (
    <View className="flex-row items-center flex-1 gap-2 p-2 rounded-lg bg-background-neutral">
      <IconMagnifyingGlass size={18} color={Tailwind_colors().lightgray[600]} />
      <TextInput
        placeholder="Search by name"
        placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
        className="flex-1 text-sm text-text-secondary"
        style={{ paddingVertical: 0, includeFontPadding: false }}
        data-testid="exercise-filter-by-name"
        testID="exercise-filter-by-name"
        value={localSearch}
        onChangeText={onChangeText}
        returnKeyType="search"
      />
    </View>
  );
});

const SearchAndFilter = memo(function SearchAndFilter(props: ISearchAndFilterProps): JSX.Element {
  const { dispatch, search, sort, filters, settings } = props;
  const filterNames = useMemo(() => ExercisePickerUtils_getAllFilterNames(filters, settings), [filters, settings]);
  const isFiltered = filterNames.length > 0;

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
        <SearchInput dispatch={dispatch} search={search} />
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

interface ICustomExerciseRowProps {
  rawExercise: ICustomExercise;
  exercise: IExercise;
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

interface IProgramGroupCardProps {
  group: IProgramGroup;
  isMultiselect: boolean;
  selectedProgramKeys: Set<string>;
  selectedAnyKeys: Set<string>;
  usedKeys: Set<string>;
  settings: ISettings;
  onChoose: (et: IExerciseType, week: number, dayInWeek: number) => void;
}

const ProgramExerciseGroupCard = memo(function ProgramExerciseGroupCard(props: IProgramGroupCardProps): JSX.Element {
  const { group, isMultiselect, selectedProgramKeys, selectedAnyKeys, usedKeys, settings, onChoose } = props;
  const isAllDisabled = group.exercises.every((exercise) => {
    const et = exercise.exerciseType;
    if (et == null) {
      return true;
    }
    const key = Exercise_toKey(et);
    const selKey = `${key}_${exercise.dayData.week}_${exercise.dayData.dayInWeek}`;
    const isSelected = selectedProgramKeys.has(selKey);
    const isDisabled = selectedAnyKeys.has(key);
    const isUsedForDay = usedKeys.has(key);
    return isMultiselect ? isUsedForDay || (isDisabled && !isSelected) : isUsedForDay;
  });

  return (
    <View
      className={`flex-row gap-2 px-2 pb-2 mb-4 border-b border-background-subtle ${isAllDisabled ? "opacity-40" : ""}`}
    >
      <View className="pl-1">
        <View className="p-1 rounded-lg bg-background-image">
          <ExerciseImage settings={settings} exerciseType={group.exerciseType} size="small" className="w-10" />
        </View>
      </View>
      <View className="flex-1 pt-1">
        <Text className="text-base font-semibold">{group.name}</Text>
      </View>
      <View>
        {group.exercises.map((exercise) => {
          const et = exercise.exerciseType;
          if (et == null) {
            return null;
          }
          const key = Exercise_toKey(et);
          const selKey = `${key}_${exercise.dayData.week}_${exercise.dayData.dayInWeek}`;
          const isSelected = selectedProgramKeys.has(selKey);
          const isDisabled = selectedAnyKeys.has(key);
          const isUsedForDay = usedKeys.has(key);
          const isItemDisabled = isMultiselect ? isUsedForDay || (isDisabled && !isSelected) : isUsedForDay;
          const rowKey = `${exercise.key}_${exercise.dayData.week}_${exercise.dayData.dayInWeek}`;
          return (
            <ProgramExerciseRow
              key={rowKey}
              exercise={exercise}
              exerciseType={et}
              isMultiselect={isMultiselect}
              isSelected={isSelected}
              isItemDisabled={isItemDisabled}
              isAllDisabled={isAllDisabled}
              settings={settings}
              onChoose={onChoose}
            />
          );
        })}
      </View>
    </View>
  );
});

interface IProgramExerciseRowProps {
  exercise: IPlannerProgramExercise;
  exerciseType: IExerciseType;
  isMultiselect: boolean;
  isSelected: boolean;
  isItemDisabled: boolean;
  isAllDisabled: boolean;
  settings: ISettings;
  onChoose: (et: IExerciseType, week: number, dayInWeek: number) => void;
}

const ProgramExerciseRow = memo(function ProgramExerciseRow(props: IProgramExerciseRowProps): JSX.Element {
  const { exercise, exerciseType, isMultiselect, isSelected, isItemDisabled, isAllDisabled, settings, onChoose } =
    props;
  const choose = useCallback(() => {
    onChoose(exerciseType, exercise.dayData.week, exercise.dayData.dayInWeek);
  }, [onChoose, exerciseType, exercise.dayData.week, exercise.dayData.dayInWeek]);

  const displayGroups = useMemo(() => {
    const currentSetVariation = PlannerProgramExercise_currentEvaluatedSetVariation(exercise);
    return PlannerProgramExercise_evaluatedSetsToDisplaySets(currentSetVariation.sets, settings);
  }, [exercise, settings]);

  const testId = `exercise-picker-program-${StringUtils_dashcase(exercise.name)}-${exercise.dayData.week}-${exercise.dayData.dayInWeek}`;
  const rowClassName = `justify-end flex-row pb-1 ${isItemDisabled && !isAllDisabled ? "opacity-40" : ""}`;

  const dayContent = (
    <View>
      <Text className="px-1 pb-1 text-xs text-text-secondary">Day {exercise.dayData.dayInWeek}</Text>
      {displayGroups.map((g, gi) => (
        <HistoryRecordSet key={gi} sets={g} isNext={true} units={settings.units} />
      ))}
    </View>
  );

  if (isMultiselect) {
    return (
      <View className={rowClassName} data-testid={testId} testID={testId}>
        <Pressable className="flex-row" disabled={isItemDisabled} onPress={choose}>
          {dayContent}
        </Pressable>
        <Pressable className="items-center justify-center p-2" disabled={isItemDisabled} onPress={choose}>
          <IconCheckCircle isChecked={isSelected} />
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable className={rowClassName} disabled={isItemDisabled} data-testid={testId} testID={testId} onPress={choose}>
      {dayContent}
      <View className="items-center justify-center p-2">
        <RadioIndicator checked={isSelected} />
      </View>
    </Pressable>
  );
});

function RadioIndicator(props: { checked: boolean }): JSX.Element {
  const color = Tailwind_semantic().icon.purple;
  return (
    <View
      className="items-center justify-center border-2 rounded-full"
      style={{ width: 20, height: 20, borderColor: props.checked ? color : Tailwind_semantic().border.prominent }}
    >
      {props.checked && <View className="rounded-full" style={{ width: 10, height: 10, backgroundColor: color }} />}
    </View>
  );
}

interface IBottomButtonProps {
  evaluatedProgram?: IEvaluatedProgram;
  state: IExercisePickerState;
  onClick: () => void;
  settings: ISettings;
}

function BottomButton(props: IBottomButtonProps): JSX.Element {
  const { state, settings, evaluatedProgram } = props;
  const selectedExercises = useMemo(
    () =>
      CollectionUtils_compact(
        state.selectedExercises.map((e) => {
          if (e.type === "adhoc") {
            const ex = Exercise_get(e.exerciseType, settings.exercises);
            return Exercise_fullName(ex, settings);
          } else if (e.type === "program") {
            return evaluatedProgram
              ? ExercisePickerUtils_getProgramExercisefullName(e, evaluatedProgram, settings)
              : undefined;
          } else {
            return undefined;
          }
        })
      ),
    [state.selectedExercises, settings, evaluatedProgram]
  );
  return (
    <View>
      <Button
        className="w-full"
        name="pick-exercises"
        kind="purple"
        buttonSize="lg"
        onPress={props.onClick}
        data-testid="exercise-picker-confirm"
        testID="exercise-picker-confirm"
      >
        {state.mode === "workout"
          ? state.exerciseType
            ? "Swap Exercise"
            : selectedExercises.length > 0
              ? `Add to this workout${selectedExercises.length > 0 ? ` (${selectedExercises.length})` : ""}`
              : "Close"
          : state.exerciseType || state.templateName
            ? `Save ${state.selectedTab === 1 ? "Template" : "Exercise"}`
            : selectedExercises.length > 0
              ? `Add ${state.selectedTab === 1 ? "Template" : "Exercise"}`
              : "Close"}
      </Button>
      {!(state.mode === "program" && state.selectedTab === 1) && selectedExercises.length > 0 && (
        <Text className="text-xs text-text-secondary">
          {selectedExercises.map((e, i) => (
            <Fragment key={i}>
              {i > 0 ? "; " : ""}
              <Text className="text-xs font-bold text-text-secondary">{e}</Text>
            </Fragment>
          ))}
        </Text>
      )}
    </View>
  );
}
