import { JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { ActiveGraphContext, IActiveGraphContext } from "./activeGraphContext";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISettings, ISubscription, IHistoryEntry, IProgramState, IStats } from "../types";
import { updateSettings } from "../models/state";
import { lb } from "lens-shmens";
import { Exercise_toKey } from "../models/exercise";
import {
  History_collectAllHistoryRecordsOfExerciseType,
  History_collectMinAndMaxTime,
  History_collectWeightPersonalRecord,
  History_collect1RMPersonalRecord,
} from "../models/history";
import { LinkButton } from "./linkButton";
import { CollectionUtils_sort } from "../utils/collection";
import { IEvaluatedProgram, IEvaluatedProgramDay } from "../models/program";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { Collector } from "../utils/collector";
import { Locker } from "./locker";
import { GraphExercise } from "./graphExercise";
import { ExerciseAllTimePRs } from "./exerciseAllTimePRs";
import { ExerciseHistory } from "./exerciseHistory";
import { Reps_setsStatus } from "../models/set";
import { Progress_isCurrent } from "../models/progress";
import { WorkoutExerciseCard } from "./workoutExerciseCard";

interface IWorkoutExerciseProps {
  day: number;
  otherStates?: IByExercise<IProgramState>;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  showHelp?: boolean;
  helps: string[];
  stats: IStats;
  entryIndex: number;
  entry: IHistoryEntry;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
  hidePlatesCalculator?: boolean;
}

function WorkoutExerciseInner(props: IWorkoutExerciseProps): JSX.Element {
  const exerciseType = props.entry.exercise;

  const historyCollector = Collector.build(props.history)
    .addFn(History_collectAllHistoryRecordsOfExerciseType(exerciseType))
    .addFn(History_collectMinAndMaxTime())
    .addFn(History_collectWeightPersonalRecord(exerciseType, props.settings.units))
    .addFn(History_collect1RMPersonalRecord(exerciseType, props.settings));

  const [
    history,
    { maxTime: maxX, minTime: minX },
    { maxWeight, maxWeightHistoryRecord },
    { max1RM, max1RMHistoryRecord, max1RMSet },
  ] = useMemo(() => {
    const results = historyCollector.run();
    results[0] = CollectionUtils_sort(results[0], (a, b) => {
      return props.settings.exerciseStatsSettings.ascendingSort ? a.startTime - b.startTime : b.startTime - a.startTime;
    });
    return results;
  }, [props.history, exerciseType, props.settings]);
  const showPrs = maxWeight.value > 0 || max1RM.value > 0;
  const status = Reps_setsStatus(props.entry.sets);
  const isCurrentProgress = Progress_isCurrent(props.progress);
  const surfaceRef = useRef<{ clientHeight?: number } | null>(null);

  const [isHeavyContentReady, setIsHeavyContentReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIsHeavyContentReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const activeGraphValue = useMemo<IActiveGraphContext>(
    () => ({ activeId: activeGraphId, setActive: setActiveGraphId }),
    [activeGraphId]
  );

  const dispatch = props.dispatch;
  const shouldHideGraphs = props.settings.workoutSettings.shouldHideGraphs;
  const onToggleGraphs = useCallback(() => {
    updateSettings(
      dispatch,
      lb<ISettings>().p("workoutSettings").p("shouldHideGraphs").record(!shouldHideGraphs),
      "Toggle graphs visibility"
    );
  }, [dispatch, shouldHideGraphs]);

  return (
    <View data-testid={`exercise-progress-${status}`} testID={`exercise-progress-${status}`}>
      <WorkoutExerciseCard
        day={props.day}
        stats={props.stats}
        entry={props.entry}
        entryIndex={props.entryIndex}
        settings={props.settings}
        dispatch={props.dispatch}
        history={history}
        program={props.program}
        programDay={props.programDay}
        otherStates={props.otherStates}
        progressId={props.progress.id}
        progressStartTime={props.progress.startTime}
        progressEntries={props.progress.entries}
        progressUserPromptedStateVars={props.progress.userPromptedStateVars}
        isCurrentProgress={isCurrentProgress}
        showHelp={props.showHelp}
        helps={props.helps}
        subscription={props.subscription}
        hidePlatesCalculator={props.hidePlatesCalculator}
      />
      {(history.length > 1 || showPrs) && (
        <View className="items-center mt-2">
          <LinkButton name="toggle-workout-graphs" onClick={onToggleGraphs}>
            {props.settings.workoutSettings.shouldHideGraphs ? "Show Graphs and PRs" : "Hide Graphs and PRs"}
          </LinkButton>
        </View>
      )}
      {!props.settings.workoutSettings.shouldHideGraphs && (
        <>
          {history.length > 1 && isHeavyContentReady && (
            <View data-testid="workout-stats-graph" testID="workout-stats-graph" className="relative mx-4 mt-2">
              <Locker topic="Graphs" dispatch={props.dispatch} blur={8} subscription={props.subscription} />
              <ActiveGraphContext.Provider value={activeGraphValue}>
                <GraphExercise
                  id={`workout-graph-${Exercise_toKey(exerciseType)}`}
                  isSameXAxis={false}
                  minX={Math.round(minX / 1000)}
                  maxX={Math.round(maxX / 1000)}
                  isWithOneRm={true}
                  key={`${Exercise_toKey(exerciseType)}_${props.settings.theme}`}
                  settings={props.settings}
                  isWithProgramLines={true}
                  history={props.history}
                  exercise={exerciseType}
                  initialType={props.settings.graphsSettings.defaultType}
                  dispatch={props.dispatch}
                />
              </ActiveGraphContext.Provider>
            </View>
          )}
          {showPrs && (
            <View className="mx-4 mt-2">
              <ExerciseAllTimePRs
                maxWeight={maxWeight ? { weight: maxWeight, historyRecord: maxWeightHistoryRecord } : undefined}
                max1RM={max1RM ? { weight: max1RM, historyRecord: max1RMHistoryRecord, set: max1RMSet } : undefined}
                settings={props.settings}
                dispatch={props.dispatch}
              />
            </View>
          )}
        </>
      )}
      {history.length > 0 && isHeavyContentReady && (
        <View className="mx-4 mt-2">
          <ExerciseHistory
            surfaceRef={surfaceRef}
            exerciseType={exerciseType}
            settings={props.settings}
            dispatch={props.dispatch}
            history={history}
          />
        </View>
      )}
    </View>
  );
}

export const WorkoutExercise = memo(WorkoutExerciseInner);
