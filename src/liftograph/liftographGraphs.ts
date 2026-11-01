import { equipmentName, Exercise_get } from "../models/exercise";
import { History_getMaxWeightSet } from "../models/history";
import {
  IExerciseSelectedType,
  IExerciseType,
  IGraphMuscleGroupSelectedType,
  IHistoryRecord,
  IScreenMuscle,
  ISet,
  ISettings,
  IStatsKey,
} from "../types";
import { ILiftographSeriesSpec } from "./liftographCompile";
import { LiftographDocument_quote } from "./liftographDocument";
import { LiftographEngine_evaluateWidget } from "./liftographEngine";
import { ILiftographRow } from "./liftographRows";
import { ILiftographSeriesEval, LiftographSeriesEval_compile, LiftographSeriesEval_rows } from "./liftographSeriesEval";

export interface ILiftographExerciseGraphData {
  data: [number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]];
  historyRecords: { [ts: number]: IHistoryRecord };
  changeProgramTimes: [number, string][];
}

export type ILiftographMuscleGraphData = Partial<Record<IScreenMuscle | "total", [number[], number[], number[]]>>;

interface IGraphSeries {
  spec: ILiftographSeriesSpec;
  points: { x: number; y: number }[];
}

type IExerciseColumns = [number, number | null, number | null, number | null, number | null, number | null];

function seconds(ts: number): number {
  return ts / 1000;
}

function graphSeries(evaluation: ILiftographSeriesEval, text: string): (IGraphSeries | undefined)[] {
  const widget = LiftographSeriesEval_compile(evaluation, text).layout[0]?.items[0];
  if (widget?.kind !== "graph") {
    return [];
  }
  const result = LiftographEngine_evaluateWidget(widget, evaluation);
  if (result.type !== "graph") {
    return [];
  }
  return result.series.map((s) => (s.status === "ready" ? { spec: s.spec, points: s.points.points } : undefined));
}

function byX(series: IGraphSeries | undefined, combine: (a: number, b: number) => number): Map<number, number> {
  const result = new Map<number, number>();
  for (const point of series?.points ?? []) {
    const current = result.get(point.x);
    result.set(point.x, current != null ? combine(current, point.y) : point.y);
  }
  return result;
}

function recordsOf(rows: ILiftographRow[]): { ts: number; record: IHistoryRecord; sets: ISet[] }[] {
  const result: { ts: number; record: IHistoryRecord; sets: ISet[] }[] = [];
  for (const row of rows) {
    if (row.type !== "exercise") {
      continue;
    }
    const last = result[result.length - 1];
    if (last != null && last.record === row.record) {
      last.sets.push(...row.entry.sets);
    } else {
      result.push({ ts: row.ts, record: row.record, sets: [...row.entry.sets] });
    }
  }
  return result;
}

function mergeByTs(rows: IExerciseColumns[]): ILiftographExerciseGraphData["data"] {
  const sorted = [...rows].sort((a, b) => a[0] - b[0]);
  const [xs, ...columns]: [number[], ...(number | null)[][]] = [[], [], [], [], [], []];
  for (const [x, ...values] of sorted) {
    const last = xs.length - 1;
    if (last >= 0 && xs[last] === x) {
      values.forEach((value, i) => {
        columns[i][last] = columns[i][last] ?? value;
      });
      continue;
    }
    xs.push(x);
    values.forEach((value, i) => columns[i].push(value));
  }
  return [xs, columns[0], columns[1], columns[2], columns[3], columns[4]];
}

export function LiftographGraphs_exerciseSource(exerciseType: IExerciseType, settings: ISettings): string {
  const exercise = Exercise_get(exerciseType, settings.exercises);
  const args = [LiftographDocument_quote(exercise.name)];
  if (exerciseType.equipment != null) {
    args.push(LiftographDocument_quote(equipmentName(exerciseType.equipment)));
  }
  return `exercise(${args.join(", ")})`;
}

export function LiftographGraphs_exerciseDocument(
  source: string,
  selectedType: IExerciseSelectedType,
  isWithOneRm: boolean,
  isWithBodyweight: boolean = false
): string {
  const lines = ["graph {"];
  if (selectedType === "volume") {
    lines.push(`  name: Volume / source: ${source} / y: volume`);
  } else {
    lines.push(`  name: Weight / source: ${source} / y: maxWeight`);
    if (isWithOneRm) {
      lines.push(`  name: e1RM / source: ${source} / y: e1rm`);
    }
    if (isWithBodyweight) {
      lines.push("  name: Bodyweight / source: stats(weight) / axis: right");
    }
  }
  lines.push("}");
  return lines.join("\n");
}

export function LiftographGraphs_muscleGroupDocument(group: string, metric?: IGraphMuscleGroupSelectedType): string {
  const lines = ["graph {"];
  if (metric !== "sets") {
    lines.push(`  name: Volume / source: workout / y: muscleVolume(${group}) / group: sum(1w)`);
  }
  if (metric !== "volume") {
    lines.push(`  name: Sets / source: workout / y: muscleSets(${group}) / group: sum(1w)`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function LiftographGraphs_statsDocument(key: IStatsKey, movingAverageWindowSize?: number): string {
  const lines = ["graph {", `  name: Value / source: stats(${key})`];
  if (movingAverageWindowSize != null) {
    lines.push(`  name: Average / source: stats(${key}) / smooth: avg(${movingAverageWindowSize})`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function LiftographGraphs_programChangeTimes(evaluation: ILiftographSeriesEval): [number, string][] {
  const result: [number, string][] = [];
  let current: string | undefined;
  for (const row of LiftographSeriesEval_rows(evaluation, { type: "workout" })) {
    if (row.type === "workout" && row.record.programName !== current) {
      current = row.record.programName;
      result.push([seconds(row.ts), current]);
    }
  }
  return result;
}

export function LiftographGraphs_statsData(
  evaluation: ILiftographSeriesEval,
  key: IStatsKey,
  movingAverageWindowSize?: number
): [number[], number[], number[]] {
  const [values, average] = graphSeries(evaluation, LiftographGraphs_statsDocument(key, movingAverageWindowSize));
  const points = values?.points ?? [];
  return [points.map((p) => seconds(p.x)), points.map((p) => p.y), average?.points.map((p) => p.y) ?? []];
}

export function LiftographGraphs_pairsData(pairs: [number, number][]): [number[], number[], number[]] {
  return [pairs.map((p) => p[0]), pairs.map((p) => p[1]), []];
}

export function LiftographGraphs_exerciseData(
  evaluation: ILiftographSeriesEval,
  exerciseType: IExerciseType,
  selectedType: IExerciseSelectedType,
  isWithOneRm: boolean,
  isWithBodyweight: boolean
): ILiftographExerciseGraphData {
  const source = LiftographGraphs_exerciseSource(exerciseType, evaluation.input.settings);
  const document = LiftographGraphs_exerciseDocument(source, selectedType, isWithOneRm);
  const series = graphSeries(evaluation, document);
  const [weight, e1rm] = selectedType === "weight" ? series : [];
  const [volume] = selectedType === "volume" ? series : [];
  const weights = byX(weight, Math.max);
  const volumes = byX(volume, (a, b) => a + b);
  const e1rms = byX(e1rm, Math.max);
  const historyRecords: { [ts: number]: IHistoryRecord } = {};
  const rows: IExerciseColumns[] = [];
  const first = series[0];
  const records = first != null ? recordsOf(LiftographSeriesEval_rows(evaluation, first.spec.source)) : [];
  for (const { ts, record, sets } of records) {
    const x = seconds(ts);
    historyRecords[x] = record;
    rows.push([
      x,
      weights.get(ts) ?? null,
      selectedType === "weight" ? (History_getMaxWeightSet(sets)?.completedReps ?? null) : null,
      e1rms.get(ts) ?? null,
      volumes.get(ts) ?? null,
      null,
    ]);
  }
  if (isWithBodyweight) {
    const [ts, values] = LiftographGraphs_statsData(evaluation, "weight");
    ts.forEach((x, i) => rows.push([x, null, null, null, null, values[i]]));
  }
  return { data: mergeByTs(rows), historyRecords, changeProgramTimes: LiftographGraphs_programChangeTimes(evaluation) };
}

export function LiftographGraphs_muscleGroupsData(
  evaluation: ILiftographSeriesEval,
  groups: (IScreenMuscle | "total")[]
): ILiftographMuscleGraphData {
  const result: ILiftographMuscleGraphData = {};
  for (const group of groups) {
    const [volume, sets] = graphSeries(evaluation, LiftographGraphs_muscleGroupDocument(group));
    if (volume != null && sets != null) {
      result[group] = [
        volume.points.map((p) => seconds(p.x)),
        volume.points.map((p) => p.y),
        sets.points.map((p) => p.y),
      ];
    }
  }
  return result;
}
