import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IHistoryRecord, IProgram, ISettings, ISubscription } from "../types";
import { INavCommon, updateSettings } from "../models/state";
import { History } from "../models/history";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { Exercise } from "../models/exercise";
import { CollectionUtils } from "../utils/collection";
import { lb } from "lens-shmens";
import { ExerciseImage } from "./exerciseImage";
import { GraphExercise } from "./graphExercise";
import { Collector } from "../utils/collector";
import { useRef, useState } from "preact/hooks";
import { Locker } from "./locker";
import { HelpExerciseStats } from "./help/helpExerciseStats";
import { ExerciseDataSettings } from "./exerciseDataSettings";
import { MuscleGroupsView } from "./modalExercise";
import { LinkButton } from "./linkButton";
import { Thunk } from "../ducks/thunks";
import { Program } from "../models/program";
import { ExerciseAllTimePRs } from "./exerciseAllTimePRs";
import { ExerciseHistory } from "./exerciseHistory";
import { MarkdownEditorBorderless } from "./markdownEditorBorderless";
import { GroupHeader } from "./groupHeader";
import { BottomSheetCustomExercise } from "./bottomSheetCustomExercise";

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
  const evaluatedProgram = props.currentProgram ? Program.evaluate(props.currentProgram, props.settings) : undefined;
  const programExerciseIds = evaluatedProgram
    ? Program.getProgramExercisesFromExerciseType(evaluatedProgram, exerciseType).map((pe) => pe.key)
    : [];
  const fullExercise = Exercise.get(props.exerciseType, props.settings.exercises);
  const customExercise = props.settings.exercises[exerciseType.id];
  const historyCollector = Collector.build(props.history)
    .addFn(History.collectMinAndMaxTime())
    .addFn(History.collectAllUsedExerciseTypes())
    .addFn(History.collectAllHistoryRecordsOfExerciseType(exerciseType))
    .addFn(History.collectWeightPersonalRecord(exerciseType, props.settings.units))
    .addFn(History.collect1RMPersonalRecord(exerciseType, props.settings));

  const [showCustomExerciseModal, setShowCustomExerciseModal] = useState(false);

  const [
    { maxTime: maxX, minTime: minX },
    _exerciseTypes,
    unsortedHistory,
    { maxWeight, maxWeightHistoryRecord },
    { max1RM, max1RMHistoryRecord, max1RMSet },
  ] = historyCollector.run();
  let history = unsortedHistory;
  history = CollectionUtils.sort(history, (a, b) => {
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
                Exercise.handleCustomExerciseChange(
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
        </>
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        <h1 className="text-xl font-bold">{Exercise.fullName(fullExercise, props.settings)}</h1>
        <div className="text-xs text-text-secondary" style={{ marginTop: "-0.25rem" }}>
          {Exercise.isCustom(fullExercise.id, props.settings.exercises) ? "Custom exercise" : "Built-in exercise"}
        </div>
        <div className="py-2">
          <MuscleGroupsView exercise={fullExercise} settings={props.settings} />
        </div>
        {Exercise.isCustom(fullExercise.id, props.settings.exercises) && (
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
                    props.dispatch(Thunk.pullScreen());
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
            value={Exercise.getNotes(exerciseType, props.settings)}
            placeholder={`Exercise notes in Markdown...`}
            onChange={(v) => {
              updateSettings(
                props.dispatch,
                lb<ISettings>()
                  .p("exerciseData")
                  .recordModify((data) => {
                    const key = Exercise.toKey(exerciseType);
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
            key={Exercise.toKey(exerciseType)}
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
              key={Exercise.toKey(exerciseType)}
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
