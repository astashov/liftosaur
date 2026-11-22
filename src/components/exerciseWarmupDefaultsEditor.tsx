import { JSX, useCallback } from "react";
import { Pressable, View } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { GroupHeader } from "./groupHeader";
import { LinkButton } from "./linkButton";
import { SwipeableRow } from "./swipeableRow";
import { InputNumber2 } from "./inputNumber2";
import { InputWeight2 } from "./inputWeight2";
import { IconPlus2 } from "./icons/iconPlus2";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IExerciseWarmupDefaultSet, ISettings } from "../types";
import { updateSettings } from "../models/state";
import { Exercise_toKey } from "../models/exercise";
import { untrack, useTrackedState } from "../navigation/TrackedStateContext";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { useRemScale } from "../utils/useRem";
import { WorkoutHints_isLearned } from "../utils/workoutHints";
import { WorkoutHints_recordUseInState } from "../utils/workoutHintsDispatch";
import {
  ExerciseWarmupDefaults_addSet,
  ExerciseWarmupDefaults_changeReps,
  ExerciseWarmupDefaults_changeThreshold,
  ExerciseWarmupDefaults_changeTimer,
  ExerciseWarmupDefaults_changeWeight,
  ExerciseWarmupDefaults_customize,
  ExerciseWarmupDefaults_get,
  ExerciseWarmupDefaults_removeSet,
  ExerciseWarmupDefaults_setText,
  ExerciseWarmupDefaults_thresholdLabel,
  ExerciseWarmupDefaults_weightInputValue,
  ExerciseWarmupDefaults_write,
} from "../models/exerciseWarmupDefaults";

interface IExerciseWarmupDefaultsEditorProps {
  exerciseType: IExerciseType;
  settings: ISettings;
  dispatch: IDispatch;
}

export function ExerciseWarmupDefaultsEditor(props: IExerciseWarmupDefaultsEditorProps): JSX.Element {
  const { exerciseType, settings, dispatch } = props;
  // The stats screens pass `settings` untracked, so this read is what re-renders the editor after a save.
  const storage = useTrackedState().storage;
  const warmups = storage.settings.exerciseData[Exercise_toKey(exerciseType)]?.warmups;
  const helps = storage.helps;
  const defaults = ExerciseWarmupDefaults_get(exerciseType, settings, untrack(warmups));
  const save = useCallback(
    (next: IExerciseWarmupDefaultSet[] | undefined, desc: string) => {
      updateSettings(
        dispatch,
        lb<ISettings>()
          .p("exerciseData")
          .recordModify((data) => ExerciseWarmupDefaults_write(data, exerciseType, next)),
        desc
      );
    },
    [dispatch, exerciseType]
  );
  const sets = defaults.state === "custom" ? defaults.sets : [];
  const deleteWidth = Math.round(64 * useRemScale());
  const showSwipeHint = sets.length > 0 && !WorkoutHints_isLearned(helps, "default-warmup-swipe-delete");
  const onSwipeOpen = useCallback(() => {
    WorkoutHints_recordUseInState(dispatch, untrack(helps), "default-warmup-swipe-delete");
  }, [dispatch, helps]);

  return (
    <View>
      <GroupHeader name="Default Warmups" topPadding={true} />
      <View className="flex-row gap-4 pb-2">
        {defaults.state !== "custom" && (
          <LinkButton
            className="text-sm"
            name="customize-default-warmups"
            data-testid="customize-default-warmups"
            testID="customize-default-warmups"
            onClick={() => save(ExerciseWarmupDefaults_customize(exerciseType, settings), "Customize default warmups")}
          >
            Customize
          </LinkButton>
        )}
        {defaults.state !== "builtin" && (
          <LinkButton
            className="text-sm"
            name="builtin-default-warmups"
            data-testid="builtin-default-warmups"
            testID="builtin-default-warmups"
            onClick={() => save(undefined, "Use built-in warmups")}
          >
            Use built-in
          </LinkButton>
        )}
        {defaults.state !== "none" && (
          <LinkButton
            className="text-sm"
            name="no-default-warmups"
            data-testid="no-default-warmups"
            testID="no-default-warmups"
            onClick={() => save([], "No default warmups")}
          >
            No warmups
          </LinkButton>
        )}
      </View>
      {defaults.state === "none" && <Text className="pb-2 text-sm">No warmups</Text>}
      {defaults.state === "builtin" && (
        <View className="pb-2">
          {defaults.sets.length === 0 ? (
            <Text className="text-sm">The built-in scheme has no warmups for this exercise</Text>
          ) : (
            defaults.sets.map((set, i) => {
              const label = ExerciseWarmupDefaults_thresholdLabel(set);
              return (
                <View
                  key={i}
                  className="flex-row items-center"
                  testID="builtin-warmup-set"
                  data-testid="builtin-warmup-set"
                >
                  <Text className="text-sm font-semibold">{ExerciseWarmupDefaults_setText(set)}</Text>
                  {label != null && <Text className="pl-2 text-xs text-text-secondary">{label}</Text>}
                </View>
              );
            })
          )}
        </View>
      )}
      {defaults.state === "custom" && (
        <View className="mb-2 overflow-hidden border rounded-lg bg-background-subtlecardpurple border-border-cardpurple">
          <View className="flex-row px-1 border-b border-border-neutral">
            <View className="items-center flex-1 px-1 py-1">
              <Text className="text-xs text-text-secondary">Reps</Text>
            </View>
            <View className="items-center flex-1 px-1 py-1">
              <Text className="text-xs text-text-secondary">Weight</Text>
            </View>
            <View className="items-center flex-1 px-1 py-1">
              <Text className="text-xs text-text-secondary">Rest, s</Text>
            </View>
            <View className="items-center flex-1 px-1 py-1">
              <Text className="text-xs text-text-secondary">Skip if ≤</Text>
            </View>
          </View>
          {sets.map((set, setIndex) => (
            <SwipeableRow
              key={setIndex}
              width={deleteWidth}
              openThreshold={15}
              closeThreshold={deleteWidth - 9}
              onOpen={onSwipeOpen}
              scrollThreshold={7}
              initiateTreshold={8}
            >
              {({ style, close, moveRef }) => (
                <View
                  ref={moveRef as unknown as React.RefObject<View>}
                  data-testid="default-warmup-set"
                  testID="default-warmup-set"
                  style={style as object}
                >
                  <View className="flex-row items-center px-1 border-b border-border-neutral">
                    <View className="flex-row flex-1 px-1 py-2">
                      <InputNumber2
                        fill={true}
                        name="default-warmup-reps"
                        value={set.reps}
                        min={1}
                        max={100}
                        step={1}
                        onBlur={(value) => {
                          const next = ExerciseWarmupDefaults_changeReps(sets, setIndex, value);
                          if (next != null) {
                            save(next, "Change default warmup reps");
                          }
                        }}
                      />
                    </View>
                    <View className="flex-row flex-1 px-1 py-2">
                      <InputWeight2
                        fill={true}
                        name="default-warmup-weight"
                        exerciseType={exerciseType}
                        units={["lb", "kg", "%"] as const}
                        inputCommitMode="blur"
                        showUnitInside={true}
                        subscription={undefined}
                        value={ExerciseWarmupDefaults_weightInputValue(set)}
                        max={9999}
                        min={0}
                        settings={settings}
                        onBlur={(value) => {
                          const next = ExerciseWarmupDefaults_changeWeight(sets, setIndex, value);
                          if (next != null) {
                            save(next, "Change default warmup weight");
                          }
                        }}
                      />
                    </View>
                    <View className="flex-row flex-1 px-1 py-2">
                      <InputNumber2
                        fill={true}
                        name="default-warmup-rest"
                        value={set.timer}
                        min={0}
                        max={3600}
                        step={15}
                        onBlur={(value) => {
                          save(ExerciseWarmupDefaults_changeTimer(sets, setIndex, value), "Change default warmup rest");
                        }}
                      />
                    </View>
                    <View className="flex-row flex-1 px-1 py-2">
                      <InputWeight2
                        fill={true}
                        name="default-warmup-threshold"
                        exerciseType={exerciseType}
                        units={["lb", "kg"] as const}
                        inputCommitMode="blur"
                        showUnitInside={true}
                        subscription={undefined}
                        value={set.threshold}
                        max={9999}
                        min={0}
                        settings={settings}
                        onBlur={(value) => {
                          save(
                            ExerciseWarmupDefaults_changeThreshold(sets, setIndex, value),
                            "Change default warmup threshold"
                          );
                        }}
                      />
                    </View>
                  </View>
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: "100%",
                      flexDirection: "row",
                      width: deleteWidth,
                      marginLeft: 1,
                    }}
                  >
                    <Pressable
                      data-testid="delete-default-warmup-set"
                      testID="delete-default-warmup-set"
                      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                      className="bg-background-darkred"
                      onPress={() => {
                        close();
                        save(ExerciseWarmupDefaults_removeSet(sets, setIndex), "Delete default warmup set");
                      }}
                    >
                      <Text className="text-text-alwayswhite" numberOfLines={1}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </SwipeableRow>
          ))}
          <Pressable
            className="flex-row items-center justify-center py-2 m-2 rounded-md bg-background-purpledark"
            data-testid="add-default-warmup-set"
            testID="add-default-warmup-set"
            onPress={() => save(ExerciseWarmupDefaults_addSet(sets), "Add default warmup set")}
          >
            <IconPlus2 size={10} color={Tailwind_semantic().text.link} />
            <Text className="ml-2 text-xs font-semibold text-text-link">Add Warmup Set</Text>
          </Pressable>
        </View>
      )}
      {showSwipeHint && (
        <Text className="pb-2 text-xs text-text-secondary" testID="default-warmup-swipe-hint">
          Swipe a set left to delete it
        </Text>
      )}
    </View>
  );
}
