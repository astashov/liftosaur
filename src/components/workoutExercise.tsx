import { JSX, memo, useCallback, useEffect, useMemo, useState } from "react";
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
  IPrevExerciseData,
} from "../models/history";
import { LinkButton } from "./linkButton";
import { CollectionUtils_sort } from "../utils/collection";
import { IEvaluatedProgram, IEvaluatedProgramDay } from "../models/program";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { Collector } from "../utils/collector";
import { Locker } from "./locker";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { GraphExercise } from "./graphExercise";
import { ExerciseAllTimePRs } from "./exerciseAllTimePRs";
import { ExerciseHistory } from "./exerciseHistory";
import { Reps_setsStatus } from "../models/set";
import { Weight_build } from "../models/weight";
import { WorkoutExerciseCard } from "./workoutExerciseCard";
import { usePerfRenderCount } from "../utils/usePerfRenderCount";

interface IWorkoutExerciseProps {
  day: number;
  otherStates?: IByExercise<IProgramState>;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  history: IHistoryRecord[];
  progressId: number;
  progressStartTime: number;
  userPromptedStateVars?: Partial<Record<string, IProgramState>>;
  supersetEntry?: IHistoryEntry;
  prevData?: IPrevExerciseData;
  isCurrentProgress: boolean;
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
  usePerfRenderCount("WorkoutExercise");
  const exerciseType = props.entry.exercise;

  const [isHeavyContentReady, setIsHeavyContentReady] = useState(false);
  useEffect(() => {
    // Defer below-the-fold heavy content (graphs/PRs + the O(history) PR math) off the first paint so
    // the card renders immediately. Deterministic delay on purpose, NOT InteractionManager: this
    // screen uses native-stack transitions (react-native-screens) and a gesture-driven pager, neither
    // of which registers a JS interaction handle — runAfterInteractions would fire mid-transition, not
    // after it. ~350ms clears the push slide so the work lands once the screen has settled.
    const t = setTimeout(() => setIsHeavyContentReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  // The "previous workout" values shown on first paint come from props.prevData, which the parent
  // builds for the whole workout in a single pass — so the card mounts without scanning history here.
  // This full per-exercise filter + sort + time range only feeds the deferred graph/PRs/history
  // blocks below, so it's gated behind isHeavyContentReady to keep it off the mount frame (it was the
  // dominant workout-screen mount jank for users with large histories).
  const [history, { maxTime: maxX, minTime: minX }] = useMemo(() => {
    if (!isHeavyContentReady) {
      return [[], { maxTime: 0, minTime: 0 }] as [IHistoryRecord[], { maxTime: number; minTime: number }];
    }
    const results = Collector.build(props.history)
      .addFn(History_collectAllHistoryRecordsOfExerciseType(exerciseType))
      .addFn(History_collectMinAndMaxTime())
      .run();
    results[0] = CollectionUtils_sort(results[0], (a, b) => {
      return props.settings.exerciseStatsSettings.ascendingSort ? a.startTime - b.startTime : b.startTime - a.startTime;
    });
    return results;
  }, [isHeavyContentReady, props.history, exerciseType, props.settings.exerciseStatsSettings.ascendingSort]);

  // PRs feed only the (already deferred) graphs/PRs block, and the per-record 1RM math is the
  // expensive part — so defer it and run it over the already-filtered slice, not all history.
  const [{ maxWeight, maxWeightHistoryRecord }, { max1RM, max1RMHistoryRecord, max1RMSet }] = useMemo(() => {
    if (!isHeavyContentReady) {
      const zero = Weight_build(0, props.settings.units);
      return [
        { maxWeight: zero, maxWeightHistoryRecord: undefined },
        { max1RM: zero, max1RMHistoryRecord: undefined, max1RMSet: undefined },
      ];
    }
    return Collector.build(history)
      .addFn(History_collectWeightPersonalRecord(exerciseType, props.settings.units))
      .addFn(History_collect1RMPersonalRecord(exerciseType, props.settings.units))
      .run();
  }, [isHeavyContentReady, history, exerciseType, props.settings.units]);
  const showPrs = maxWeight.value > 0 || max1RM.value > 0;
  const status = Reps_setsStatus(props.entry.sets);

  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const activeGraphValue = useMemo<IActiveGraphContext>(
    () => ({ activeId: activeGraphId, setActive: setActiveGraphId }),
    [activeGraphId]
  );

  const dispatch = props.dispatch;
  const shouldHideGraphs = props.settings.workoutSettings.shouldHideGraphs;
  const maxWeightProp = useMemo(
    () => (maxWeight ? { weight: maxWeight, historyRecord: maxWeightHistoryRecord } : undefined),
    [maxWeight, maxWeightHistoryRecord]
  );
  const max1RMProp = useMemo(
    () => (max1RM ? { weight: max1RM, historyRecord: max1RMHistoryRecord, set: max1RMSet } : undefined),
    [max1RM, max1RMHistoryRecord, max1RMSet]
  );
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
        prevData={props.prevData}
        program={props.program}
        programDay={props.programDay}
        otherStates={props.otherStates}
        progressId={props.progressId}
        supersetEntry={props.supersetEntry}
        progressUserPromptedStateVars={props.userPromptedStateVars}
        isCurrentProgress={props.isCurrentProgress}
        showHelp={props.showHelp}
        helps={props.helps}
        subscription={props.subscription}
        hidePlatesCalculator={props.hidePlatesCalculator}
      />
      {((props.prevData?.count ?? 0) > 1 || showPrs) && (
        <View className="items-center mt-2">
          <LinkButton className="text-sm" name="toggle-workout-graphs" onClick={onToggleGraphs}>
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
                  isInteractive={Subscriptions_hasSubscription(props.subscription)}
                />
              </ActiveGraphContext.Provider>
            </View>
          )}
          {showPrs && (
            <View className="mx-4 mt-2">
              <ExerciseAllTimePRs
                maxWeight={maxWeightProp}
                max1RM={max1RMProp}
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
