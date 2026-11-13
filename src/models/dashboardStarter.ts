import { IDashboard, IExerciseType, IHistoryEntry, IHistoryRecord, ISet, ISettings } from "../types";
import { Weight_build, Weight_convertTo, Weight_getOneRepMax } from "./weight";
import {
  equipmentName,
  Exercise_find,
  Exercise_fullName,
  Exercise_get,
  Exercise_resolveNameAndEquipmentParts,
  Exercise_toKey,
} from "./exercise";
import { IEvaluatedProgram, Program_getAllUsedProgramExercises } from "./program";
import { LiftographGraphs_exerciseSource } from "../liftograph/liftographGraphs";
import { LiftographWrite_quote } from "../liftograph/liftographWrite";

export const DashboardStarter_liftCount = 3;

const HISTORY_WINDOW_MS = 183 * 24 * 60 * 60 * 1000;

const BARBELL_EQUIPMENT = new Set(["barbell", "trapbar"]);

interface ILiftCount {
  exerciseType: IExerciseType;
  count: number;
  e1rmLb: number;
  rank: number;
}

export function DashboardStarter_isOffered(dashboards: IDashboard[] | undefined, rowCount: number): boolean {
  return (dashboards ?? []).length <= 1 && rowCount === 0;
}

function isLift(exerciseType: IExerciseType, settings: ISettings): boolean {
  return exerciseType.equipment !== "bodyweight" && Exercise_find(exerciseType, settings.exercises) != null;
}

function barbellScore(exerciseType: IExerciseType): number {
  return BARBELL_EQUIPMENT.has(exerciseType.equipment ?? "") ? 1 : 0;
}

function weightedSets(entry: IHistoryEntry): ISet[] {
  return entry.sets.filter((set) => !!set.isCompleted && (set.completedWeight?.value ?? 0) > 0);
}

function e1rmLb(sets: ISet[]): number {
  return sets.reduce((max, set) => {
    const weight = set.completedWeight ?? Weight_build(0, "lb");
    const oneRm = Weight_getOneRepMax(weight, set.completedReps ?? 0, set.completedRpe);
    return Math.max(max, Weight_convertTo(oneRm, "lb").value);
  }, 0);
}

function sourceResolvesBack(exerciseType: IExerciseType, settings: ISettings): boolean {
  const exercise = Exercise_get(exerciseType, settings.exercises);
  const parts =
    exerciseType.equipment != null ? [exercise.name, equipmentName(exerciseType.equipment)] : [exercise.name];
  const resolved = Exercise_resolveNameAndEquipmentParts(parts, settings.exercises)?.exercise;
  const resolvedEquipment = resolved?.equipment ?? resolved?.defaultEquipment ?? undefined;
  const expectedEquipment = exerciseType.equipment ?? exercise.defaultEquipment ?? undefined;
  return resolved?.id === exerciseType.id && resolvedEquipment === expectedEquipment;
}

function topLifts(counts: Map<string, ILiftCount>, settings: ISettings): IExerciseType[] {
  return Array.from(counts.values())
    .sort(
      (a, b) =>
        barbellScore(b.exerciseType) - barbellScore(a.exerciseType) ||
        b.count - a.count ||
        b.e1rmLb - a.e1rmLb ||
        a.rank - b.rank
    )
    .map((c) => c.exerciseType)
    .filter((exerciseType) => sourceResolvesBack(exerciseType, settings))
    .slice(0, DashboardStarter_liftCount);
}

function bump(counts: Map<string, ILiftCount>, exerciseType: IExerciseType, rank: number, e1rm: number): void {
  const key = Exercise_toKey(exerciseType);
  const current = counts.get(key);
  counts.set(key, {
    exerciseType,
    count: (current?.count ?? 0) + 1,
    e1rmLb: Math.max(current?.e1rmLb ?? 0, e1rm),
    rank: current?.rank ?? rank,
  });
}

function historyLifts(history: IHistoryRecord[], settings: ISettings, now: number): IExerciseType[] {
  const counts = new Map<string, ILiftCount>();
  const recent = history
    .filter((record) => now - record.startTime <= HISTORY_WINDOW_MS)
    .sort((a, b) => b.startTime - a.startTime);
  recent.forEach((record, rank) => {
    const seen = new Set<string>();
    for (const entry of record.entries) {
      const key = Exercise_toKey(entry.exercise);
      const sets = weightedSets(entry);
      if (!seen.has(key) && isLift(entry.exercise, settings) && sets.length > 0) {
        seen.add(key);
        bump(counts, entry.exercise, rank, e1rmLb(sets));
      }
    }
  });
  return topLifts(counts, settings);
}

function programLifts(program: IEvaluatedProgram | undefined, settings: ISettings): IExerciseType[] {
  const counts = new Map<string, ILiftCount>();
  const exercises = program != null ? Program_getAllUsedProgramExercises(program) : [];
  exercises.forEach((exercise, rank) => {
    if (isLift(exercise.exerciseType, settings)) {
      bump(counts, exercise.exerciseType, rank, 0);
    }
  });
  return topLifts(counts, settings);
}

export function DashboardStarter_lifts(
  history: IHistoryRecord[],
  program: () => IEvaluatedProgram | undefined,
  settings: ISettings,
  now: number
): IExerciseType[] {
  const fromHistory = historyLifts(history, settings, now);
  return fromHistory.length > 0 ? fromHistory : programLifts(program(), settings);
}

function liftLines(lifts: IExerciseType[], settings: ISettings): string[] {
  if (lifts.length === 0) {
    return [];
  }
  const named = lifts.map((exerciseType) => ({
    name: LiftographWrite_quote(Exercise_fullName(Exercise_get(exerciseType, settings.exercises), settings)),
    source: LiftographGraphs_exerciseSource(exerciseType, settings),
  }));
  return [
    "// ## Strength",
    "row {",
    ...named.map((l) => `  value / name: ${l.name} / source: ${l.source} / y: e1rm / compare: 4w / trend: 3m`),
    "}",
    "",
    "graph / range: 1y {",
    ...named.map((l) => `  name: ${l.name} / source: ${l.source} / y: e1rm / group: max(1w)`),
    "}",
    "",
  ];
}

export function DashboardStarter_text(lifts: IExerciseType[], settings: ISettings): string {
  return [
    ...liftLines(lifts, settings),
    "row {",
    "  muscles / range: 7d / show: map",
    "  calendar / range: 6m",
    "}",
    "",
    "row {",
    "  value / name: Bodyweight / source: stats(weight) / smooth: avg(7d) / compare: 4w / trend: 3m",
    "  value / name: Workouts in 7 days / source: workout / smooth: count(7d) / compare: 1w",
    "}",
  ].join("\n");
}
