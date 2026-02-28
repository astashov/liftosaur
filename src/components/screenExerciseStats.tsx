import { h, JSX, Fragment } from "preact";
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
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import {
  IExercise,
  Exercise_get,
  Exercise_handleCustomExerciseChange,
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
import { useRef, useState } from "preact/hooks";
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
import { BottomSheetCustomExercise } from "./bottomSheetCustomExercise";
import { StringUtils_capitalize } from "../utils/string";
import { BottomSheetMusclesOverride } from "./bottomSheetMusclesOverride";
import { Muscle_getMuscleGroupName } from "../models/muscle";

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
  const customExercise = props.settings.exercises[exerciseType.id];
  const historyCollector = Collector.build(props.history)
    .addFn(History_collectMinAndMaxTime())
    .addFn(History_collectAllUsedExerciseTypes())
    .addFn(History_collectAllHistoryRecordsOfExerciseType(exerciseType))
    .addFn(History_collectWeightPersonalRecord(exerciseType, props.settings.units))
    .addFn(History_collect1RMPersonalRecord(exerciseType, props.settings));

  const [showCustomExerciseModal, setShowCustomExerciseModal] = useState(false);
  const [showOverrideMuscles, setShowOverrideMuscles] = useState<IExercise | undefined>(undefined);

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

  const containerRef = useRef<HTMLElement>(null);
  const showPrs = maxWeight.value > 0 || max1RM.value > 0;

  return (
    <Surface
      ref={containerRef}
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          helpContent={<HelpExerciseStats />}
          title="Exercise Stats"
        />
      }
      addons={
        <>
          {showCustomExerciseModal && customExercise && (
            <BottomSheetCustomExercise
              settings={props.settings}
              onClose={() => setShowCustomExerciseModal(false)}
              onChange={(action, exercise, notes) => {
                Exercise_handleCustomExerciseChange(
                  props.dispatch,
                  action,
                  exercise,
                  notes,
                  props.settings,
                  props.currentProgram
                );
              }}
              dispatch={props.dispatch}
              isHidden={!showCustomExerciseModal}
              isLoggedIn={props.navCommon.userId != null}
              exercise={customExercise}
            />
          )}
          {showOverrideMuscles != null && (
            <BottomSheetMusclesOverride
              helps={props.navCommon.helps}
              isHidden={showOverrideMuscles == null}
              exerciseType={showOverrideMuscles}
              settings={props.settings}
              onClose={() => setShowOverrideMuscles(undefined)}
              onNewExerciseData={(newExerciseData) => {
                updateSettings(
                  props.dispatch,
                  lb<ISettings>().p("exerciseData").record(newExerciseData),
                  "Update exercise muscle override"
                );
              }}
              dispatch={props.dispatch}
            />
          )}
        </>
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        <h1 className="text-xl font-bold">{Exercise_fullName(fullExercise, props.settings)}</h1>
        <div className="text-xs text-text-secondary" style={{ marginTop: "-0.25rem" }}>
          {Exercise_isCustom(fullExercise.id, props.settings.exercises) ? "Custom exercise" : "Built-in exercise"}
        </div>
        <div className="py-2">
          <MuscleGroupsView
            exercise={fullExercise}
            settings={props.settings}
            onOverride={() => setShowOverrideMuscles(fullExercise)}
          />
        </div>
        {Exercise_isCustom(fullExercise.id, props.settings.exercises) && (
          <div className="flex mb-2">
            <div className="mr-auto">
              <LinkButton
                className="text-sm"
                name="edit-custom-exercise-stats"
                onClick={() => setShowCustomExerciseModal(true)}
              >
                Edit
              </LinkButton>
            </div>
            <div>
              <LinkButton
                name="edit-custom-exercise-stats"
                className="text-sm text-text-error"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this exercise?")) {
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
            </div>
          </div>
        )}

        <GroupHeader name="Notes" />
        <div style={{ marginLeft: "-0.25rem", marginRight: "-0.25rem" }}>
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
        </div>

        <ExerciseDataSettings
          fullExercise={fullExercise}
          programExerciseIds={programExerciseIds}
          settings={props.settings}
          dispatch={props.dispatch}
          show1RM={true}
        />

        <div data-cy="exercise-stats-image">
          <ExerciseImage
            settings={props.settings}
            key={Exercise_toKey(exerciseType)}
            exerciseType={exerciseType}
            size="large"
          />
        </div>
        {history.length > 1 && (
          <div data-cy="exercise-stats-graph" className="relative">
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
          </div>
        )}
        {showPrs && (
          <div className="mt-8">
            <ExerciseAllTimePRs
              maxWeight={maxWeight ? { weight: maxWeight, historyRecord: maxWeightHistoryRecord } : undefined}
              max1RM={max1RM ? { weight: max1RM, historyRecord: max1RMHistoryRecord, set: max1RMSet } : undefined}
              settings={props.settings}
              dispatch={props.dispatch}
            />
          </div>
        )}
        <ExerciseHistory
          surfaceRef={containerRef}
          exerciseType={exerciseType}
          settings={props.settings}
          dispatch={props.dispatch}
          history={history}
        />
      </section>
    </Surface>
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
    <div>
      <div className="text-xs">
        <LinkButton
          data-cy="override-exercise-muscles"
          name="override-exercise-muscles"
          onClick={() => props.onOverride()}
        >
          Override Muscles
        </LinkButton>
      </div>
      <div className="text-xs" onClick={() => setShowMuscles(!showMuscles)}>
        {types.length > 0 && (
          <div>
            <span className="text-text-secondary">Type: </span>
            <span className="font-bold">{types.join(", ")}</span>
          </div>
        )}
        {targetMuscleGroups.length > 0 && (
          <div>
            <span className="text-text-secondary">Target: </span>
            <span className="font-bold">{showMuscles ? targetMuscles.join(", ") : targetMuscleGroups.join(", ")}</span>
          </div>
        )}
        {synergistMuscleGroups.length > 0 && (
          <div>
            <span className="text-text-secondary">Synergist: </span>
            <span className="font-bold">
              {showMuscles ? synergistMuscles.join(", ") : synergistMuscleGroups.join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
