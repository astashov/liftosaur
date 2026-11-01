import { Exercise_fromKey } from "../models/exercise";
import { IExerciseType, IHistoryRecord, IStatsKey, IStorage } from "../types";
import type { ILiftographSeriesSpec } from "./liftographCompile";
import { LiftographEnvironment_exercise } from "./liftographEnvironments";
import { LiftographFold_compileScript } from "./liftographFold";
import {
  LiftographGraphs_exerciseData,
  LiftographGraphs_exerciseDocument,
  LiftographGraphs_exerciseSource,
  LiftographGraphs_muscleGroupsData,
  LiftographGraphs_statsData,
} from "./liftographGraphs";
import {
  Legacy_exerciseData,
  Legacy_lengthData,
  Legacy_muscleGroupsData,
  Legacy_percentageData,
  Legacy_statsGraphData,
  Legacy_weightData,
} from "./liftographLegacyGraphs";
import {
  LiftographSeriesEval_compile,
  LiftographSeriesEval_create,
  LiftographSeriesEval_fold,
  LiftographSeriesEval_rows,
} from "./liftographSeriesEval";

export type ILiftographBenchScenario =
  | "firstVisit"
  | "returnVisit"
  | "appendWorkout"
  | "editOldWorkout"
  | "deleteWorkout"
  | "mergeOlderWorkout"
  | "settingsChange"
  | "bodyweightEdit";
export type ILiftographBenchImpl = "legacy" | "engine" | "engineScript";
export type ILiftographBenchPhase = "total" | "compile" | "rows" | "fold" | "shape";

export interface ILiftographBenchSample {
  scenario: ILiftographBenchScenario;
  impl: ILiftographBenchImpl;
  graph: string;
  phase: ILiftographBenchPhase;
  durationMs: number;
}

export const liftographBenchScenarios: ILiftographBenchScenario[] = [
  "firstVisit",
  "returnVisit",
  "appendWorkout",
  "editOldWorkout",
  "deleteWorkout",
  "mergeOlderWorkout",
  "settingsChange",
  "bodyweightEdit",
];

const scriptForms: { name: string; text: string }[] = [
  { name: "maxWeight", text: "point(max(completedWeights))" },
  { name: "e1rm", text: "point(max(e1rm))" },
  { name: "stateful", text: "state.best = max(state.best, max(e1rm))\npoint(state.best)" },
];

function byStartTime(history: IHistoryRecord[]): IHistoryRecord[] {
  return [...history].sort((a, b) => a.startTime - b.startTime);
}

function withHistory(storage: IStorage, history: IHistoryRecord[]): IStorage {
  return { ...storage, history };
}

export function LiftographBench_mutate(storage: IStorage, scenario: ILiftographBenchScenario, now: number): IStorage {
  const sorted = byStartTime(storage.history);
  const newest = sorted[sorted.length - 1];
  const oldest = sorted[0];
  const middle = sorted[Math.floor(sorted.length / 2)];
  const nextId = Math.max(0, ...storage.history.map((r) => r.id)) + 1;
  if (scenario === "appendWorkout" && newest != null) {
    const duration = (newest.endTime ?? newest.startTime) - newest.startTime;
    const record = {
      ...newest,
      id: nextId,
      startTime: now,
      endTime: now + duration,
      date: new Date(now).toISOString(),
    };
    return withHistory(storage, [record, ...storage.history]);
  } else if (scenario === "editOldWorkout" && oldest != null) {
    const edited = { ...oldest, entries: oldest.entries.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) };
    return withHistory(
      storage,
      storage.history.map((r) => (r === oldest ? edited : r))
    );
  } else if (scenario === "deleteWorkout" && middle != null) {
    return withHistory(
      storage,
      storage.history.filter((r) => r !== middle)
    );
  } else if (scenario === "mergeOlderWorkout" && middle != null) {
    const startTime = middle.startTime - 60000;
    const merged = {
      ...middle,
      id: nextId,
      startTime,
      endTime: middle.endTime != null ? middle.endTime - 60000 : undefined,
    };
    return withHistory(storage, [...storage.history, merged]);
  } else if (scenario === "settingsChange") {
    return {
      ...storage,
      settings: { ...storage.settings, startWeekFromMonday: !storage.settings.startWeekFromMonday },
    };
  } else if (scenario === "bodyweightEdit") {
    const weights = storage.stats.weight.weight ?? [];
    const last = weights[weights.length - 1];
    const edited =
      last != null
        ? [...weights.slice(0, -1), { ...last, value: { ...last.value, value: last.value.value + 1 } }]
        : weights;
    return { ...storage, stats: { ...storage.stats, weight: { ...storage.stats.weight, weight: edited } } };
  }
  return storage;
}

function statsCollection(storage: IStorage, key: IStatsKey): [number, number][] {
  if (key === "weight") {
    return Legacy_weightData(storage.stats.weight.weight ?? [], storage.settings);
  } else if (key === "bodyfat") {
    return Legacy_percentageData(storage.stats.percentage.bodyfat ?? []);
  }
  return Legacy_lengthData(storage.stats.length[key] ?? [], storage.settings);
}

export function LiftographBench_run(storage: IStorage, now: number, clock: () => number): ILiftographBenchSample[] {
  const samples: ILiftographBenchSample[] = [];
  const time = <T>(sample: Omit<ILiftographBenchSample, "durationMs">, fn: () => T): T => {
    const start = clock();
    const result = fn();
    samples.push({ ...sample, durationMs: clock() - start });
    return result;
  };
  for (const scenario of liftographBenchScenarios) {
    const input = LiftographBench_mutate(storage, scenario, now);
    const { history, stats, settings } = input;
    const graphs = settings.graphs.graphs;
    const exerciseTypes: [string, IExerciseType][] = graphs
      .filter((g) => g.type === "exercise")
      .map((g) => [g.id, Exercise_fromKey(g.id)]);
    const muscleGroups = graphs.filter((g) => g.type === "muscleGroup").map((g) => g.id);
    const statsKeys = graphs.flatMap((g): IStatsKey[] =>
      g.type === "statsWeight" || g.type === "statsLength" || g.type === "statsPercentage" ? [g.id] : []
    );

    const legacy: Omit<ILiftographBenchSample, "graph" | "durationMs"> = { scenario, impl: "legacy", phase: "total" };
    time({ ...legacy, graph: "all" }, () => {
      const bodyweight = Legacy_weightData(stats.weight.weight ?? [], settings);
      for (const [key, type] of exerciseTypes) {
        time({ ...legacy, graph: key }, () => Legacy_exerciseData(history, type, settings, true, bodyweight));
      }
      if (muscleGroups.length > 0) {
        time({ ...legacy, graph: "muscleGroups" }, () => Legacy_muscleGroupsData(history, settings));
      }
      for (const key of statsKeys) {
        time({ ...legacy, graph: `stats:${key}` }, () => Legacy_statsGraphData(statsCollection(input, key)));
      }
    });

    const engine: Pick<ILiftographBenchSample, "scenario" | "impl"> = { scenario, impl: "engine" };
    time({ ...engine, phase: "total", graph: "all" }, () => {
      const evaluation = LiftographSeriesEval_create({ history, stats, settings, today: now });
      for (const [key, type] of exerciseTypes) {
        time({ ...engine, phase: "compile", graph: key }, () =>
          LiftographSeriesEval_compile(
            evaluation,
            LiftographGraphs_exerciseDocument(LiftographGraphs_exerciseSource(type, settings), "weight", true)
          )
        );
        time({ ...engine, phase: "total", graph: key }, () =>
          LiftographGraphs_exerciseData(evaluation, type, "weight", true, true)
        );
      }
      if (muscleGroups.length > 0) {
        time({ ...engine, phase: "rows", graph: "muscleGroups" }, () =>
          LiftographSeriesEval_rows(evaluation, { type: "workout" })
        );
        time({ ...engine, phase: "total", graph: "muscleGroups" }, () =>
          LiftographGraphs_muscleGroupsData(evaluation, muscleGroups)
        );
      }
      for (const key of statsKeys) {
        time({ ...engine, phase: "total", graph: `stats:${key}` }, () => LiftographGraphs_statsData(evaluation, key));
      }
    });

    if (scenario === "firstVisit" || scenario === "returnVisit") {
      const scriptEval = LiftographSeriesEval_create({ history, stats, settings, today: now });
      for (const [key, type] of exerciseTypes.slice(0, 3)) {
        for (const form of scriptForms) {
          const graph = `${key}:${form.name}`;
          const sample: Pick<ILiftographBenchSample, "scenario" | "impl" | "graph"> = {
            scenario,
            impl: "engineScript",
            graph,
          };
          const script = time({ ...sample, phase: "compile" }, () =>
            LiftographFold_compileScript(form.text, 0, LiftographEnvironment_exercise, settings)
          );
          if (!("environment" in script)) {
            continue;
          }
          const spec: ILiftographSeriesSpec = {
            id: graph,
            source: { type: "exercise", exerciseId: type.id, equipment: type.equipment },
            values: { type: "script", script },
            xMode: "time",
            span: { from: 0, to: 0 },
          };
          time({ ...sample, phase: "fold" }, () => LiftographSeriesEval_fold(scriptEval, spec));
        }
      }
    }
  }
  return samples;
}
