import { JSX, memo, useCallback, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IHistoryRecord, IProgram, ISettings, ISubscription } from "../types";
import { INavCommon, updateSettings } from "../models/state";
import {
  History_collectMinAndMaxTime,
  History_collectAllUsedExerciseTypes,
  History_collectAllHistoryRecordsOfExerciseType,
  History_collectWeightPersonalRecord,
  History_collect1RMPersonalRecord,
} from "../models/history";
import { useNavOptions } from "../navigation/useNavOptions";
import {
  IExercise,
  Exercise_get,
  Exercise_fullName,
  Exercise_isCustom,
  Exercise_getNotes,
  Exercise_toKey,
  Exercise_targetMuscles,
  Exercise_synergistMuscleMultipliers,
  Exercise_targetMusclesGroups,
  Exercise_synergistMusclesGroups,
} from "../models/exercise";
import { CollectionUtils_sort } from "../utils/collection";
import { lb } from "lens-shmens";
import { ExerciseImage } from "./exerciseImage";
import { GraphExercise } from "./graphExercise";
import { Collector } from "../utils/collector";
import { Locker } from "./locker";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { ExerciseDataSettings } from "./exerciseDataSettings";
import { LinkButton } from "./linkButton";
import { Thunk_pullScreen } from "../ducks/thunks";
import { Program_evaluate, Program_getProgramExercisesFromExerciseType } from "../models/program";
import { ExerciseAllTimePRs } from "./exerciseAllTimePRs";
import { ExerciseHistory } from "./exerciseHistory";
import { MarkdownEditorBorderless } from "./markdownEditorBorderless";
import { GroupHeader } from "./groupHeader";
import { StringUtils_capitalize } from "../utils/string";
import { Muscle_getMuscleGroupName } from "../models/muscle";
import { navigationRef } from "../navigation/navigationRef";
import { Dialog_confirm } from "../utils/dialog";

interface IProps {
  exerciseType: IExerciseType;
  history: IHistoryRecord[];
  dispatch: IDispatch;
  subscription: ISubscription;
  settings: ISettings;
  navCommon: INavCommon;
  currentProgram?: IProgram;
}

export function ScreenExerciseStats(props: IProps): JSX.Element {
  const exerciseType = props.exerciseType;
  const { settings, dispatch, history: rawHistory, currentProgram } = props;

  const evaluatedProgram = useMemo(
    () => (currentProgram ? Program_evaluate(currentProgram, settings) : undefined),
    [currentProgram, settings]
  );
  const programExerciseIds = useMemo(
    () =>
      evaluatedProgram
        ? Program_getProgramExercisesFromExerciseType(evaluatedProgram, exerciseType).map((pe) => pe.key)
        : [],
    [evaluatedProgram, exerciseType]
  );
  const fullExercise = useMemo(
    () => Exercise_get(exerciseType, settings.exercises),
    [exerciseType, settings.exercises]
  );

  const units = settings.units;
  const collectorResult = useMemo(() => {
    const historyCollector = Collector.build(rawHistory)
      .addFn(History_collectMinAndMaxTime())
      .addFn(History_collectAllUsedExerciseTypes())
      .addFn(History_collectAllHistoryRecordsOfExerciseType(exerciseType))
      .addFn(History_collectWeightPersonalRecord(exerciseType, units))
      .addFn(History_collect1RMPersonalRecord(exerciseType, units));
    return historyCollector.run();
  }, [rawHistory, exerciseType, units]);

  const [
    { maxTime: maxX, minTime: minX },
    _exerciseTypes,
    unsortedHistory,
    { maxWeight, maxWeightHistoryRecord },
    { max1RM, max1RMHistoryRecord, max1RMSet },
  ] = collectorResult;

  const ascendingSort = settings.exerciseStatsSettings.ascendingSort;
  const history = useMemo(
    () =>
      CollectionUtils_sort(unsortedHistory, (a, b) =>
        ascendingSort ? a.startTime - b.startTime : b.startTime - a.startTime
      ),
    [unsortedHistory, ascendingSort]
  );

  const showPrs = maxWeight.value > 0 || max1RM.value > 0;

  useNavOptions({ navTitle: "Exercise Stats", navHelpKey: "exerciseStats" });

  const onOverrideMuscles = useCallback(() => {
    navigationRef.navigate("musclesOverrideModal", { exerciseType });
  }, [exerciseType]);

  const onEditCustomExercise = useCallback(() => {
    navigationRef.navigate("customExerciseModal", { exerciseId: exerciseType.id });
  }, [exerciseType.id]);

  const onDeleteCustomExercise = useCallback(async () => {
    if (await Dialog_confirm("Are you sure you want to delete this exercise?")) {
      updateSettings(
        dispatch,
        lb<ISettings>()
          .p("exercises")
          .recordModify((exercises) => {
            const exercise = exercises[fullExercise.id];
            return exercise != null ? { ...exercises, [fullExercise.id]: { ...exercise, isDeleted: true } } : exercises;
          }),
        "Delete custom exercise"
      );
      dispatch(Thunk_pullScreen());
    }
  }, [dispatch, fullExercise.id]);

  const onNotesChange = useCallback(
    (v: string) => {
      updateSettings(
        dispatch,
        lb<ISettings>()
          .p("exerciseData")
          .recordModify((data) => {
            const key = Exercise_toKey(exerciseType);
            return { ...data, [key]: { ...data[key], notes: v } };
          }),
        "Update exercise notes"
      );
    },
    [dispatch, exerciseType]
  );

  const notesValue = useMemo(() => Exercise_getNotes(exerciseType, settings), [exerciseType, settings.exerciseData]);
  const isCustom = useMemo(
    () => Exercise_isCustom(fullExercise.id, settings.exercises),
    [fullExercise.id, settings.exercises]
  );
  const exerciseKey = useMemo(() => Exercise_toKey(exerciseType), [exerciseType]);
  const fullName = useMemo(() => Exercise_fullName(fullExercise, settings), [fullExercise, settings]);
  const isInteractive = useMemo(() => Subscriptions_hasSubscription(props.subscription), [props.subscription]);

  const maxWeightProp = useMemo(
    () => (maxWeight ? { weight: maxWeight, historyRecord: maxWeightHistoryRecord } : undefined),
    [maxWeight, maxWeightHistoryRecord]
  );
  const max1RMProp = useMemo(
    () => (max1RM ? { weight: max1RM, historyRecord: max1RMHistoryRecord, set: max1RMSet } : undefined),
    [max1RM, max1RMHistoryRecord, max1RMSet]
  );

  return (
    <View className="px-4">
      <Text className="text-xl font-bold">{fullName}</Text>
      <Text className="text-xs text-text-secondary">{isCustom ? "Custom exercise" : "Built-in exercise"}</Text>
      <View className="py-2">
        <MuscleGroupsView exercise={fullExercise} settings={settings} onOverride={onOverrideMuscles} />
      </View>
      {isCustom && (
        <View className="flex-row mb-2">
          <View className="flex-1">
            <LinkButton className="text-sm" name="edit-custom-exercise-stats" onClick={onEditCustomExercise}>
              Edit
            </LinkButton>
          </View>
          <View>
            <LinkButton
              name="edit-custom-exercise-stats"
              className="text-sm text-text-error"
              onClick={onDeleteCustomExercise}
            >
              Delete Exercise
            </LinkButton>
          </View>
        </View>
      )}

      <GroupHeader name="Notes" />
      <View style={{ marginHorizontal: -4 }}>
        <MarkdownEditorBorderless
          debounceMs={500}
          value={notesValue}
          placeholder={`Exercise notes in Markdown...`}
          onChange={onNotesChange}
        />
      </View>

      <ExerciseDataSettings
        fullExercise={fullExercise}
        programExerciseIds={programExerciseIds}
        settings={settings}
        dispatch={dispatch}
        show1RM={true}
      />

      <View data-testid="exercise-stats-image" testID="exercise-stats-image">
        <ExerciseImage settings={settings} key={exerciseKey} exerciseType={exerciseType} size="large" />
      </View>
      {history.length > 1 && (
        <View data-testid="exercise-stats-graph" testID="exercise-stats-graph" className="relative">
          <Locker topic="Graphs" dispatch={dispatch} blur={8} subscription={props.subscription} />
          <GraphExercise
            isSameXAxis={false}
            minX={Math.round(minX / 1000)}
            maxX={Math.round(maxX / 1000)}
            isWithOneRm={true}
            key={exerciseKey}
            settings={settings}
            isWithProgramLines={true}
            history={rawHistory}
            exercise={exerciseType}
            initialType={settings.graphsSettings.defaultType}
            dispatch={dispatch}
            isInteractive={isInteractive}
          />
        </View>
      )}
      {showPrs && (
        <View className="mt-8">
          <ExerciseAllTimePRs maxWeight={maxWeightProp} max1RM={max1RMProp} settings={settings} dispatch={dispatch} />
        </View>
      )}
      <ExerciseHistory exerciseType={exerciseType} settings={settings} dispatch={dispatch} history={history} />
    </View>
  );
}

interface IMuscleGroupsViewProps {
  exercise: IExercise;
  settings: ISettings;
  onOverride: () => void;
}

export const MuscleGroupsView = memo(function MuscleGroupsView(props: IMuscleGroupsViewProps): JSX.Element {
  const { exercise, settings } = props;
  const targetMuscles = useMemo(() => Exercise_targetMuscles(exercise, settings), [exercise, settings]);
  const synergistMuscles = useMemo(
    () =>
      Exercise_synergistMuscleMultipliers(exercise, settings)
        .filter((m) => targetMuscles.indexOf(m.muscle) === -1)
        .map((m) => `${m.muscle}${m.multiplier !== settings.planner.synergistMultiplier ? `:${m.multiplier}` : ""}`),
    [exercise, settings, targetMuscles]
  );
  const targetMuscleGroups = useMemo(
    () => Exercise_targetMusclesGroups(exercise, settings).map((m) => Muscle_getMuscleGroupName(m, settings)),
    [exercise, settings]
  );
  const synergistMuscleGroups = useMemo(
    () =>
      Exercise_synergistMusclesGroups(exercise, settings)
        .map((m) => Muscle_getMuscleGroupName(m, settings))
        .filter((m) => targetMuscleGroups.indexOf(m) === -1),
    [exercise, settings, targetMuscleGroups]
  );
  const [showMuscles, setShowMuscles] = useState(false);

  const types = useMemo(() => exercise.types.map((t) => StringUtils_capitalize(t)), [exercise.types]);
  const onToggleMuscles = useCallback(() => setShowMuscles((s) => !s), []);

  return (
    <View>
      <View>
        <LinkButton
          data-testid="override-exercise-muscles"
          testID="override-exercise-muscles"
          name="override-exercise-muscles"
          className="text-xs"
          onClick={props.onOverride}
        >
          Override Muscles
        </LinkButton>
      </View>
      <Pressable onPress={onToggleMuscles}>
        {types.length > 0 && (
          <View>
            <Text className="text-xs">
              <Text className="text-xs text-text-secondary">Type: </Text>
              <Text className="text-xs font-bold">{types.join(", ")}</Text>
            </Text>
          </View>
        )}
        {targetMuscleGroups.length > 0 && (
          <View>
            <Text className="text-xs">
              <Text className="text-xs text-text-secondary">Target: </Text>
              <Text className="text-xs font-bold">
                {showMuscles ? targetMuscles.join(", ") : targetMuscleGroups.join(", ")}
              </Text>
            </Text>
          </View>
        )}
        {synergistMuscleGroups.length > 0 && (
          <View>
            <Text className="text-xs">
              <Text className="text-xs text-text-secondary">Synergist: </Text>
              <Text className="text-xs font-bold">
                {showMuscles ? synergistMuscles.join(", ") : synergistMuscleGroups.join(", ")}
              </Text>
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
});
