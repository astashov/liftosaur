import fetch from "node-fetch";
import { UserDao } from "../lambda/dao/userDao";
import { buildDi } from "../lambda/utils/di";
import { LogUtil } from "../lambda/utils/log";
import {
  LiftographGraphs_exerciseData,
  LiftographGraphs_muscleGroupsData,
  LiftographGraphs_statsData,
} from "../src/liftograph/liftographGraphs";
import { ILiftographSeriesEval, LiftographSeriesEval_create } from "../src/liftograph/liftographSeriesEval";
import { Exercise_eq, Exercise_findById, Exercise_fromKey, Exercise_toKey } from "../src/models/exercise";
import { Muscle_getAvailableMuscleGroups } from "../src/models/muscle";
import { IExerciseType, IHistoryRecord, IScreenMuscle, IStatsKey, IStorage } from "../src/types";
import { DateUtils_firstDayOfWeekTimestamp } from "../src/utils/date";
import { ObjectUtils_keys } from "../src/utils/object";
import {
  Legacy_exerciseData,
  Legacy_lengthData,
  Legacy_muscleGroupsData,
  Legacy_percentageData,
  Legacy_statsGraphData,
  Legacy_weightData,
} from "../src/liftograph/liftographLegacyGraphs";

type ICause =
  | "startTime"
  | "every entry"
  | "unilateral e1RM"
  | "volume without completed sets"
  | "unfinished or future workout"
  | "default equipment"
  | "empty week"
  | "partial window"
  | "unexplained";

interface IDiff {
  graph: string;
  at: string;
  cause: ICause;
  legacy: unknown;
  next: unknown;
}

const COLUMNS = ["x", "weight", "reps", "e1rm", "volume", "bodyweight"];

function close(a: number | null | undefined, b: number | null | undefined, eps: number = 1e-6): boolean {
  return a == null || b == null ? a == null && b == null : Math.abs(a - b) <= eps;
}

function isCounted(record: IHistoryRecord, today: number): boolean {
  return record.endTime != null && record.startTime <= today;
}

function exerciseCause(record: IHistoryRecord, exerciseType: IExerciseType, column: number, today: number): ICause {
  const entries = record.entries.filter((e) => e.exercise.id === exerciseType.id);
  const exact = entries.filter((e) => Exercise_eq(e.exercise, exerciseType));
  if (!isCounted(record, today)) {
    return "unfinished or future workout";
  } else if (exact.length !== entries.length) {
    return "default equipment";
  } else if (exact.length > 1) {
    return "every entry";
  } else if (column === 0) {
    return "startTime";
  } else if (exact.every((e) => e.sets.every((s) => (s.completedReps ?? 0) <= 0))) {
    return "volume without completed sets";
  } else if (column === 3 && exact.some((e) => e.sets.some((s) => s.isUnilateral))) {
    return "unilateral e1RM";
  }
  return "unexplained";
}

function byRecord(
  data: (number | null)[][],
  records: { [ts: number]: IHistoryRecord }
): Map<number, { record: IHistoryRecord; row: (number | null)[] }> {
  const result = new Map<number, { record: IHistoryRecord; row: (number | null)[] }>();
  data[0].forEach((x, i) => {
    const record = x != null ? records[x] : undefined;
    if (record != null) {
      result.set(record.id, { record, row: data.map((column) => column[i]) });
    }
  });
  return result;
}

function compareExercise(storage: IStorage, evaluation: ILiftographSeriesEval, exerciseType: IExerciseType): IDiff[] {
  const { settings, today } = evaluation.input;
  const graph = Exercise_toKey(exerciseType);
  const legacy = Legacy_exerciseData(storage.history, exerciseType, settings, true);
  const weight = LiftographGraphs_exerciseData(evaluation, exerciseType, "weight", true, false);
  const volume = LiftographGraphs_exerciseData(evaluation, exerciseType, "volume", true, false);
  const [x, w, reps, e1rm, , bodyweight] = weight.data;
  const next = { ...weight, data: [x, w, reps, e1rm, volume.data[4], bodyweight] };
  const legacyRows = byRecord(legacy.data, legacy.historyRecords);
  const nextRows = byRecord(next.data, next.historyRecords);
  const ids = new Set([...legacyRows.keys(), ...nextRows.keys()]);
  const diffs: IDiff[] = [];
  for (const id of ids) {
    const l = legacyRows.get(id);
    const n = nextRows.get(id);
    const record = (l ?? n)?.record;
    if (record == null) {
      continue;
    }
    for (let column = 0; column < 5; column += 1) {
      if (!close(l?.row[column], n?.row[column])) {
        const cause =
          l == null && n != null && column > 0 && record.entries.some((e) => Exercise_eq(e.exercise, exerciseType))
            ? "volume without completed sets"
            : exerciseCause(record, exerciseType, column, today);
        diffs.push({
          graph,
          at: `${record.id}.${COLUMNS[column]}`,
          cause,
          legacy: l?.row[column],
          next: n?.row[column],
        });
      }
    }
  }
  return diffs;
}

function weekOf(seconds: number, startWeekFromMonday?: boolean): number {
  return DateUtils_firstDayOfWeekTimestamp(seconds * 1000, startWeekFromMonday) / 1000;
}

function compareMuscles(storage: IStorage, evaluation: ILiftographSeriesEval): IDiff[] {
  const { settings, today } = evaluation.input;
  const groups: (IScreenMuscle | "total")[] = [...Muscle_getAvailableMuscleGroups(settings), "total"];
  const legacy = Legacy_muscleGroupsData(storage.history, settings);
  const next = LiftographGraphs_muscleGroupsData(evaluation, groups);
  const uncounted = storage.history.filter((r) => !isCounted(r, today)).map((r) => weekOf(r.startTime / 1000));
  const diffs: IDiff[] = [];
  for (const group of groups) {
    const legacyWeeks = new Map<number, [number, number]>();
    const [lx, lv, ls] = legacy[group] ?? [[], [], []];
    lx.forEach((x, i) => legacyWeeks.set(weekOf(x, settings.startWeekFromMonday), [lv[i], ls[i]]));
    const [nx, nv, ns] = next[group] ?? [[], [], []];
    const nextWeeks = new Map<number, [number, number]>();
    nx.forEach((x, i) => nextWeeks.set(x, [nv[i], ns[i]]));
    for (const week of new Set([...legacyWeeks.keys(), ...nextWeeks.keys()])) {
      const l = legacyWeeks.get(week);
      const n = nextWeeks.get(week);
      if (l == null && n != null && n[0] === 0 && n[1] === 0) {
        continue;
      }
      if (!close(l?.[0], n?.[0], 1e-3) || !close(l?.[1], n?.[1])) {
        const cause: ICause =
          uncounted.indexOf(week) !== -1 ? "unfinished or future workout" : l == null ? "empty week" : "unexplained";
        diffs.push({ graph: `muscle:${group}`, at: new Date(week * 1000).toISOString(), cause, legacy: l, next: n });
      }
    }
  }
  return diffs;
}

function compareStats(storage: IStorage, evaluation: ILiftographSeriesEval): IDiff[] {
  const { settings } = evaluation.input;
  const diffs: IDiff[] = [];
  const window = 7;
  const collections: [IStatsKey, [number, number][]][] = [
    ["weight", Legacy_weightData(storage.stats.weight.weight ?? [], settings)],
    ["bodyfat", Legacy_percentageData(storage.stats.percentage.bodyfat ?? [])],
    ...ObjectUtils_keys(storage.stats.length).map((key): [IStatsKey, [number, number][]] => [
      key,
      Legacy_lengthData(storage.stats.length[key] ?? [], settings),
    ]),
  ];
  for (const [key, collection] of collections) {
    const legacy = Legacy_statsGraphData(collection, window);
    const next = LiftographGraphs_statsData(evaluation, key, window);
    legacy[0].forEach((x, i) => {
      if (!close(x, next[0][i]) || !close(legacy[1][i], next[1][i])) {
        diffs.push({ graph: `stats:${key}`, at: `${i}`, cause: "unexplained", legacy: legacy[1][i], next: next[1][i] });
      } else if (!close(legacy[2][i], next[2][i], 0.05)) {
        const cause: ICause = i < window - 1 ? "partial window" : "unexplained";
        diffs.push({ graph: `stats:${key}.avg`, at: `${i}`, cause, legacy: legacy[2][i], next: next[2][i] });
      }
    });
  }
  return diffs;
}

function usedExerciseTypes(storage: IStorage): IExerciseType[] {
  const keys = new Set<string>();
  for (const graph of storage.settings.graphs.graphs) {
    if (graph.type === "exercise") {
      keys.add(graph.id);
    }
  }
  for (const record of storage.history) {
    for (const entry of record.entries) {
      keys.add(Exercise_toKey(entry.exercise));
    }
  }
  return Array.from(keys)
    .map((key) => Exercise_fromKey(key))
    .filter((type) => Exercise_findById(type.id, storage.settings.exercises) != null);
}

async function main(): Promise<void> {
  const userId = process.argv[2];
  if (userId == null) {
    console.error("Usage: npx ts-node scripts/compare-liftograph-graphs.ts <userId>");
    process.exit(1);
  }
  const user = await new UserDao(buildDi(new LogUtil(), fetch)).getById(userId);
  if (user == null) {
    console.error(`User ${userId} not found`);
    process.exit(1);
  }
  const storage = user.storage;
  const evaluation = LiftographSeriesEval_create({
    history: storage.history,
    stats: storage.stats,
    settings: storage.settings,
    today: Date.now(),
  });
  const types = usedExerciseTypes(storage);
  const diffs = [
    ...types.flatMap((type) => compareExercise(storage, evaluation, type)),
    ...compareMuscles(storage, evaluation),
    ...compareStats(storage, evaluation),
  ];
  const counts = new Map<ICause, number>();
  for (const diff of diffs) {
    counts.set(diff.cause, (counts.get(diff.cause) ?? 0) + 1);
  }
  console.log(`${storage.history.length} workouts, ${types.length} exercise graphs`);
  for (const [cause, count] of counts) {
    console.log(`${cause}: ${count}`);
  }
  const unexplained = diffs.filter((d) => d.cause === "unexplained");
  for (const diff of unexplained.slice(0, 50)) {
    console.log(JSON.stringify(diff));
  }
  process.exit(unexplained.length > 0 ? 1 : 0);
}

main();
