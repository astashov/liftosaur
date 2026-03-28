import { useMemo } from "react";
import type { JSX } from "react";
import { View } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { IHistoryRecord, ISettings, ISubscription, IHistoryEntry, IProgramState, IStats } from "@shared/types";
import type { IEvaluatedProgram, IEvaluatedProgramDay } from "@shared/models/program";
import type { IByExercise } from "@shared/pages/planner/plannerEvaluator";
import {
  History_collectAllHistoryRecordsOfExerciseType,
  History_collectMinAndMaxTime,
  History_collectWeightPersonalRecord,
  History_collect1RMPersonalRecord,
} from "@shared/models/history";
import { CollectionUtils_sort } from "@shared/utils/collection";
import { Collector } from "@shared/utils/collector";
import { updateSettings } from "@shared/models/state";
import { lb } from "lens-shmens";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";
import { ExerciseAllTimePRs } from "./ExerciseAllTimePRs";
import { ExerciseHistory } from "./ExerciseHistory";
import { LinkButton } from "./LinkButton";
import { Locker } from "./Locker";

interface IProps {
  day: number;
  otherStates?: IByExercise<IProgramState>;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  stats: IStats;
  entryIndex: number;
  entry: IHistoryEntry;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
  renderGraph?: (args: { history: IHistoryRecord[]; minX: number; maxX: number }) => JSX.Element;
}

export function WorkoutExercise(props: IProps): JSX.Element {
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
  const shouldHideGraphs = props.settings.workoutSettings.shouldHideGraphs;

  return (
    <View>
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
        progress={props.progress}
        subscription={props.subscription}
      />
      {(history.length > 1 || showPrs) && (
        <View className="mt-2 items-center">
          <LinkButton
            name="toggle-workout-graphs"
            className="text-xs"
            onPress={() => {
              updateSettings(
                props.dispatch,
                lb<ISettings>().p("workoutSettings").p("shouldHideGraphs").record(!shouldHideGraphs),
                "Toggle graphs visibility"
              );
            }}
          >
            {shouldHideGraphs ? "Show Graphs and PRs" : "Hide Graphs and PRs"}
          </LinkButton>
        </View>
      )}
      {!shouldHideGraphs && (
        <>
          {history.length > 1 && props.renderGraph && (
            <View className="relative mt-2">
              <Locker topic="Graphs" dispatch={props.dispatch} subscription={props.subscription} />
              {props.renderGraph({
                history: props.history,
                minX: Math.round(minX / 1000),
                maxX: Math.round(maxX / 1000),
              })}
            </View>
          )}
          {showPrs && (
            <View className="mx-4 mt-2">
              <ExerciseAllTimePRs
                maxWeight={
                  maxWeight.value > 0 ? { weight: maxWeight, historyRecord: maxWeightHistoryRecord } : undefined
                }
                max1RM={
                  max1RM.value > 0 ? { weight: max1RM, historyRecord: max1RMHistoryRecord, set: max1RMSet } : undefined
                }
                settings={props.settings}
                dispatch={props.dispatch}
              />
            </View>
          )}
        </>
      )}
      {history.length > 0 && (
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
