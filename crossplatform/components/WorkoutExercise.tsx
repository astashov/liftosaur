import React, { useMemo } from "react";
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
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";

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
}

export function WorkoutExercise(props: IProps): React.ReactElement {
  const exerciseType = props.entry.exercise;

  const historyCollector = Collector.build(props.history)
    .addFn(History_collectAllHistoryRecordsOfExerciseType(exerciseType))
    .addFn(History_collectMinAndMaxTime())
    .addFn(History_collectWeightPersonalRecord(exerciseType, props.settings.units))
    .addFn(History_collect1RMPersonalRecord(exerciseType, props.settings));

  const [history] = useMemo(() => {
    const results = historyCollector.run();
    results[0] = CollectionUtils_sort(results[0], (a, b) => {
      return props.settings.exerciseStatsSettings.ascendingSort ? a.startTime - b.startTime : b.startTime - a.startTime;
    });
    return results;
  }, [props.history, exerciseType, props.settings]);

  return (
    <View className="px-2">
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
    </View>
  );
}
