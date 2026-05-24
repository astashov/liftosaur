import { JSX, Fragment, useCallback, useMemo } from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "../primitives/text";
import { IconMuscles2 } from "../icons/iconMuscles2";
import { IconStar } from "../icons/iconStar";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { ScrollableTabs } from "../scrollableTabs";
import { ExercisePickerFromProgram } from "./exercisePickerFromProgram";
import { IEvaluatedProgram } from "../../models/program";
import { IExercisePickerSelectedExercise, IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { ExercisePickerAdhocExercises } from "./exercisePickerAdhocExercises";
import { Button } from "../button";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Exercise_get, Exercise_fullName } from "../../models/exercise";
import { ExercisePickerUtils_getProgramExercisefullName } from "./exercisePickerUtils";
import { CollectionUtils_compact } from "../../utils/collection";
import { ExercisePickerCurrentExercise } from "./exercisePickerCurrentExercise";
import { Input, IValidationError } from "../input";
import { IEither } from "../../utils/types";
import { ExercisePickerTemplate } from "./exercisePickerTemplate";
import { IconFilter } from "../icons/iconFilter";
import { SheetDragHandle } from "../../navigation/TransparentModal";
import { getNavigationService } from "../../navigation/navUtils";

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

export function ExercisePickerMain(props: IProps): JSX.Element {
  const { evaluatedProgram, state, dispatch, settings, onStar, onChoose, usedExerciseTypes } = props;
  const { mode, search, filters, sort, showMuscles, exerciseType, selectedExercises, label, templateName } = state;
  const isStarred = !!filters.isStarred;
  const title =
    mode === "workout"
      ? exerciseType
        ? "Swap Exercise"
        : "Add Exercises"
      : exerciseType || templateName
        ? "Edit Exercise"
        : "Add Exercise";
  const tabs = useMemo(() => {
    const result: { label: string; children: () => JSX.Element }[] = [
      {
        label: mode === "workout" ? "Ad-hoc Exercise" : "Exercise",
        children: () => (
          <ExercisePickerAdhocExercises
            onStar={onStar}
            usedExerciseTypes={usedExerciseTypes}
            mode={mode}
            search={search}
            filters={filters}
            sort={sort}
            showMuscles={showMuscles}
            exerciseType={exerciseType}
            selectedExercises={selectedExercises}
            label={label}
            settings={settings}
            dispatch={dispatch}
          />
        ),
      },
    ];
    if (mode === "workout" && evaluatedProgram) {
      result.push({
        label: "From Program",
        children: () => (
          <ExercisePickerFromProgram
            usedExerciseTypes={usedExerciseTypes}
            mode={mode}
            exerciseType={exerciseType}
            selectedExercises={selectedExercises}
            label={label}
            dispatch={dispatch}
            settings={settings}
            evaluatedProgram={evaluatedProgram}
          />
        ),
      });
    }
    if (mode === "program") {
      result.push({
        label: "Template",
        children: () => <ExercisePickerTemplate dispatch={dispatch} templateName={templateName} />,
      });
    }
    return result;
  }, [
    mode,
    search,
    filters,
    sort,
    showMuscles,
    exerciseType,
    selectedExercises,
    label,
    templateName,
    evaluatedProgram,
    settings,
    dispatch,
    onStar,
    usedExerciseTypes,
  ]);

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

  const bottomShadowStyle = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4 },
        android: { elevation: 4 },
        default: { boxShadow: "0 -4px 4px 0 rgba(0, 0, 0, 0.05)" },
      }),
    []
  );

  return (
    <View className="flex-1">
      <SheetDragHandle>
        <View className="relative py-1">
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
          {state.mode === "program" && (
            <View className="px-4 pb-1">
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
          )}
          {state.exerciseType && (
            <View className="pt-2">
              <ExercisePickerCurrentExercise state={state} exerciseType={state.exerciseType} settings={settings} />
            </View>
          )}
        </View>
      </SheetDragHandle>
      <View className="flex-1">
        {tabs.length > 1 ? (
          <ScrollableTabs
            topPadding="0rem"
            shouldNotExpand={true}
            fillHeight={true}
            defaultIndex={state.selectedTab ?? 0}
            nonSticky={true}
            onChange={onTabChange}
            color="purple"
            tabs={tabs}
          />
        ) : (
          <View className="flex-1">{tabs[0].children()}</View>
        )}
      </View>
      <View className="w-full px-4 pt-2 pb-2" style={bottomShadowStyle}>
        <BottomButton state={state} evaluatedProgram={evaluatedProgram} onClick={onBottomClick} settings={settings} />
      </View>
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
