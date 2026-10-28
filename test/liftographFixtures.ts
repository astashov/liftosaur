import { Settings_build } from "../src/models/settings";
import { IHistoryEntry, IHistoryRecord, ISet, ISettings, IStats, IUnit } from "../src/types";

let lastId = 0;

function takeId(): number {
  lastId += 1;
  return lastId;
}

export function fxSet(
  weight: number | undefined,
  completedReps: number | undefined,
  opts: { reps?: number; rpe?: number; completedRpe?: number; unit?: IUnit; plannedWeight?: number } = {}
): ISet {
  const unit = opts.unit ?? "lb";
  const id = takeId();
  return {
    vtype: "set",
    id: `set${id}`,
    index: id,
    reps: opts.reps ?? 5,
    weight: { value: opts.plannedWeight ?? weight ?? 0, unit },
    rpe: opts.rpe,
    isCompleted: completedReps != null && completedReps > 0,
    completedReps,
    completedWeight: weight != null ? { value: weight, unit } : undefined,
    completedRpe: opts.completedRpe,
  };
}

export function fxEntry(
  exerciseId: string,
  sets: ISet[],
  opts: {
    equipment?: string;
    programExerciseId?: string;
    state?: IHistoryEntry["state"];
    vars?: IHistoryEntry["vars"];
  } = {}
): IHistoryEntry {
  const id = takeId();
  return {
    vtype: "history_entry",
    id: `entry${id}`,
    index: id,
    exercise: { id: exerciseId, equipment: opts.equipment ?? "barbell" },
    sets,
    warmupSets: [],
    programExerciseId: opts.programExerciseId,
    state: opts.state,
    vars: opts.vars,
  };
}

export function fxRecord(
  date: Date,
  entries: IHistoryEntry[],
  opts: { programName?: string; day?: number; dayName?: string; durationMin?: number; open?: boolean } = {}
): IHistoryRecord {
  const startTime = date.getTime();
  return {
    vtype: "history_record",
    id: takeId(),
    date: date.toISOString(),
    programId: "p1",
    programName: opts.programName ?? "Program",
    day: opts.day ?? 1,
    dayName: opts.dayName ?? "Day 1",
    entries,
    startTime,
    endTime: opts.open ? undefined : startTime + (opts.durationMin ?? 60) * 60000,
  };
}

export function fxStats(weights: [Date, number][] = []): IStats {
  return {
    weight: {
      weight: weights.map(([date, value]) => ({
        vtype: "stat",
        value: { value, unit: "lb" },
        timestamp: date.getTime(),
      })),
    },
    length: {},
    percentage: {},
  };
}

export function fxSettings(): ISettings {
  return Settings_build("lb");
}

export function fxDay(year: number, month: number, day: number, hour: number = 10): Date {
  return new Date(year, month - 1, day, hour);
}
