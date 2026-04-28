import { JSX, useRef, useState } from "react";
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
import { HelpExerciseStats } from "./help/helpExerciseStats";
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
  const evaluatedProgram = props.currentProgram ? Program_evaluate(props.currentProgram, props.settings) : undefined;
  const programExerciseIds = evaluatedProgram
    ? Program_getProgramExercisesFromExerciseType(evaluatedProgram, exerciseType).map((pe) => pe.key)
    : [];
  const fullExercise = Exercise_get(props.exerciseType, props.settings.exercises);
  const historyCollector = Collector.build(props.history)
    .addFn(History_collectMinAndMaxTime())
    .addFn(History_collectAllUsedExerciseTypes())
    .addFn(History_collectAllHistoryRecordsOfExerciseType(exerciseType))
    .addFn(History_collectWeightPersonalRecord(exerciseType, props.settings.units))
    .addFn(History_collect1RMPersonalRecord(exerciseType, props.settings));

  const [
    { maxTime: maxX, minTime: minX },
    _exerciseTypes,
    unsortedHistory,
    { maxWeight, maxWeightHistoryRecord },
    { max1RM, max1RMHistoryRecord, max1RMSet },
  ] = historyCollector.run();
  let history = unsortedHistory;
  history = CollectionUtils_sort(history, (a, b) => {
    return props.settings.exerciseStatsSettings.ascendingSort ? a.startTime - b.startTime : b.startTime - a.startTime;
  });

  const containerRef = useRef<{ clientHeight?: number }>(null);
  const showPrs = maxWeight.value > 0 || max1RM.value > 0;

  useNavOptions({ navTitle: "Exercise Stats", navHelpContent: <HelpExerciseStats /> });

  return (
    <View className="px-4">
      <Text className="text-xl font-bold">{Exercise_fullName(fullExercise, props.settings)}</Text>
      <Text className="text-xs text-text-secondary">
        {Exercise_isCustom(fullExercise.id, props.settings.exercises) ? "Custom exercise" : "Built-in exercise"}
      </Text>
      <View className="py-2">
        <MuscleGroupsView
          exercise={fullExercise}
          settings={props.settings}
          onOverride={() => navigationRef.navigate("musclesOverrideModal", { exerciseType })}
        />
      </View>
      {Exercise_isCustom(fullExercise.id, props.settings.exercises) && (
        <View className="flex-row mb-2">
          <View className="flex-1">
            <LinkButton
              className="text-sm"
              name="edit-custom-exercise-stats"
              onClick={() => navigationRef.navigate("customExerciseModal", { exerciseId: exerciseType.id })}
            >
              Edit
            </LinkButton>
          </View>
          <View>
            <LinkButton
              name="edit-custom-exercise-stats"
              className="text-sm text-text-error"
              onClick={async () => {
                if (await Dialog_confirm("Are you sure you want to delete this exercise?")) {
                  updateSettings(
                    props.dispatch,
                    lb<ISettings>()
                      .p("exercises")
                      .recordModify((exercises) => {
                        const exercise = exercises[fullExercise.id];
                        return exercise != null
                          ? { ...exercises, [fullExercise.id]: { ...exercise, isDeleted: true } }
                          : exercises;
                      }),
                    "Delete custom exercise"
                  );
                  props.dispatch(Thunk_pullScreen());
                }
              }}
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
          value={Exercise_getNotes(exerciseType, props.settings)}
          placeholder={`Exercise notes in Markdown...`}
          onChange={(v) => {
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("exerciseData")
                .recordModify((data) => {
                  const key = Exercise_toKey(exerciseType);
                  return { ...data, [key]: { ...data[key], notes: v } };
                }),
              "Update exercise notes"
            );
          }}
        />
      </View>

      <ExerciseDataSettings
        fullExercise={fullExercise}
        programExerciseIds={programExerciseIds}
        settings={props.settings}
        dispatch={props.dispatch}
        show1RM={true}
      />

      <View data-testid="exercise-stats-image" testID="exercise-stats-image">
        <ExerciseImage
          settings={props.settings}
          key={Exercise_toKey(exerciseType)}
          exerciseType={exerciseType}
          size="large"
        />
      </View>
      {history.length > 1 && (
        <View data-testid="exercise-stats-graph" testID="exercise-stats-graph" className="relative">
          <Locker topic="Graphs" dispatch={props.dispatch} blur={8} subscription={props.subscription} />
          <GraphExercise
            isSameXAxis={false}
            minX={Math.round(minX / 1000)}
            maxX={Math.round(maxX / 1000)}
            isWithOneRm={true}
            key={Exercise_toKey(exerciseType)}
            settings={props.settings}
            isWithProgramLines={true}
            history={props.history}
            exercise={exerciseType}
            initialType={props.settings.graphsSettings.defaultType}
            dispatch={props.dispatch}
          />
        </View>
      )}
      {showPrs && (
        <View className="mt-8">
          <ExerciseAllTimePRs
            maxWeight={maxWeight ? { weight: maxWeight, historyRecord: maxWeightHistoryRecord } : undefined}
            max1RM={max1RM ? { weight: max1RM, historyRecord: max1RMHistoryRecord, set: max1RMSet } : undefined}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        </View>
      )}
      <ExerciseHistory
        surfaceRef={containerRef}
        exerciseType={exerciseType}
        settings={props.settings}
        dispatch={props.dispatch}
        history={history}
      />
    </View>
  );
}

export function MuscleGroupsView(props: {
  exercise: IExercise;
  settings: ISettings;
  onOverride: () => void;
}): JSX.Element {
  const { exercise, settings } = props;
  const targetMuscles = Exercise_targetMuscles(exercise, settings);
  const synergistMuscles = Exercise_synergistMuscleMultipliers(exercise, settings)
    .filter((m) => targetMuscles.indexOf(m.muscle) === -1)
    .map((m) => `${m.muscle}${m.multiplier !== settings.planner.synergistMultiplier ? `:${m.multiplier}` : ""}`);
  const targetMuscleGroups = Exercise_targetMusclesGroups(exercise, settings).map((m) =>
    Muscle_getMuscleGroupName(m, settings)
  );
  const synergistMuscleGroups = Exercise_synergistMusclesGroups(exercise, settings)
    .map((m) => Muscle_getMuscleGroupName(m, settings))
    .filter((m) => targetMuscleGroups.indexOf(m) === -1);
  const [showMuscles, setShowMuscles] = useState(false);

  const types = exercise.types.map((t) => StringUtils_capitalize(t));

  return (
    <View>
      <View>
        <LinkButton
          data-testid="override-exercise-muscles"
          testID="override-exercise-muscles"
          name="override-exercise-muscles"
          className="text-xs"
          onClick={() => props.onOverride()}
        >
          Override Muscles
        </LinkButton>
      </View>
      <Pressable onPress={() => setShowMuscles(!showMuscles)}>
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
}
