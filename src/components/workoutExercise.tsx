import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISettings, ISubscription, IHistoryEntry, IProgramState } from "../types";
import { updateSettings } from "../models/state";
import { lb } from "lens-shmens";
import { Exercise } from "../models/exercise";
import { History } from "../models/history";
import { LinkButton } from "./linkButton";
import { CollectionUtils } from "../utils/collection";
import { IEvaluatedProgram, IEvaluatedProgramDay } from "../models/program";
import { useMemo, useRef } from "preact/hooks";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { Collector } from "../utils/collector";
import { Locker } from "./locker";
import { GraphExercise } from "./graphExercise";
import { ExerciseAllTimePRs } from "./exerciseAllTimePRs";
import { ExerciseHistory } from "./exerciseHistory";
import { Reps } from "../models/set";
import { WorkoutExerciseCard } from "./workoutExerciseCard";

interface IWorkoutExerciseProps {
  day: number;
  otherStates?: IByExercise<IProgramState>;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  showHelp?: boolean;
  isSelected: boolean;
  helps: string[];
  entryIndex: number;
  entry: IHistoryEntry;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
  hidePlatesCalculator?: boolean;
}

export function WorkoutExercise(props: IWorkoutExerciseProps): JSX.Element {
  const exerciseType = props.entry.exercise;

  const historyCollector = Collector.build(props.history)
    .addFn(History.collectAllHistoryRecordsOfExerciseType(exerciseType))
    .addFn(History.collectMinAndMaxTime())
    .addFn(History.collectWeightPersonalRecord(exerciseType, props.settings.units))
    .addFn(History.collect1RMPersonalRecord(exerciseType, props.settings));

  const [
    history,
    { maxTime: maxX, minTime: minX },
    { maxWeight, maxWeightHistoryRecord },
    { max1RM, max1RMHistoryRecord, max1RMSet },
  ] = useMemo(() => {
    const results = historyCollector.run();
    results[0] = CollectionUtils.sort(results[0], (a, b) => {
      return props.settings.exerciseStatsSettings.ascendingSort ? a.startTime - b.startTime : b.startTime - a.startTime;
    });
    return results;
  }, [props.history, exerciseType, props.settings]);
  const showPrs = maxWeight.value > 0 || max1RM.value > 0;
  const status = Reps.setsStatus(props.entry.sets);
  const surfaceRef = useRef<HTMLDivElement>(null);

  return (
    <div data-cy={`exercise-progress-${status}`} ref={surfaceRef}>
      <WorkoutExerciseCard
        day={props.day}
        entry={props.entry}
        entryIndex={props.entryIndex}
        settings={props.settings}
        dispatch={props.dispatch}
        history={history}
        program={props.program}
        programDay={props.programDay}
        otherStates={props.otherStates}
        progress={props.progress}
        showHelp={props.showHelp}
        helps={props.helps}
        subscription={props.subscription}
        hidePlatesCalculator={props.hidePlatesCalculator}
      />
      {(history.length > 1 || showPrs) && (
        <div className="mt-2 text-xs text-center">
          <LinkButton
            name="toggle-workout-graphs"
            onClick={() => {
              updateSettings(
                props.dispatch,
                lb<ISettings>()
                  .p("workoutSettings")
                  .p("shouldHideGraphs")
                  .record(!props.settings.workoutSettings.shouldHideGraphs)
              );
            }}
          >
            {props.settings.workoutSettings.shouldHideGraphs ? "Show Graphs and PRs" : "Hide Graphs and PRs"}
          </LinkButton>
        </div>
      )}
      {!props.settings.workoutSettings.shouldHideGraphs && (
        <>
          {history.length > 1 && (
            <div data-cy="workout-stats-graph" className="relative mt-2">
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
            <div className="mx-4 mt-2">
              <ExerciseAllTimePRs
                maxWeight={maxWeight ? { weight: maxWeight, historyRecord: maxWeightHistoryRecord } : undefined}
                max1RM={max1RM ? { weight: max1RM, historyRecord: max1RMHistoryRecord, set: max1RMSet } : undefined}
                settings={props.settings}
                dispatch={props.dispatch}
              />
            </div>
          )}
        </>
      )}
      {history.length > 0 && (
        <div className="mx-4 mt-2">
          <ExerciseHistory
            surfaceRef={surfaceRef}
            exerciseType={exerciseType}
            settings={props.settings}
            dispatch={props.dispatch}
            history={history}
          />
        </div>
      )}
    </div>
  );
}
