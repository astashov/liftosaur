import { Weight_add, Weight_build, Weight_lt } from "../models/weight";
import { ISettings, IWeight } from "../types";
import type { ILiftographFoldContext } from "./liftographFold";
import {
  LiftographMeasures_entryVolume,
  LiftographMeasures_setE1rm,
  LiftographMeasures_setWeight,
  LiftographMeasures_workoutDuration,
} from "./liftographMeasures";
import { ILiftographRow, ILiftographSource } from "./liftographRows";

export type ILiftographPresetName =
  | "maxWeight"
  | "e1rm"
  | "volume"
  | "maxReps"
  | "muscleSets"
  | "muscleVolume"
  | "duration";

export interface ILiftographPreset {
  name: ILiftographPresetName;
  sources: ILiftographSource["type"][];
  hasArg: boolean;
  script: (arg?: string) => string;
  evaluate: (row: ILiftographRow, context: ILiftographFoldContext, arg?: string) => number | IWeight | undefined;
}

function maxWeight(weights: (IWeight | undefined)[]): IWeight | undefined {
  let best: IWeight | undefined;
  for (const weight of weights) {
    if (weight != null && (best == null || Weight_lt(best, weight))) {
      best = weight;
    }
  }
  return best;
}

function workoutVolume(row: ILiftographRow, settings: ISettings): IWeight | undefined {
  if (row.type === "exercise") {
    return LiftographMeasures_entryVolume(row.entry, settings);
  } else if (row.type === "workout") {
    return row.record.entries.reduce(
      (memo, entry) => Weight_add(memo, LiftographMeasures_entryVolume(entry, settings)),
      Weight_build(0, settings.units)
    );
  }
  return undefined;
}

export const liftographPresets: Record<ILiftographPresetName, ILiftographPreset> = {
  maxWeight: {
    name: "maxWeight",
    sources: ["exercise"],
    hasArg: false,
    script: () => "point(max(completedWeights))",
    evaluate: (row) =>
      row.type === "exercise" ? maxWeight(row.entry.sets.map((set) => LiftographMeasures_setWeight(set))) : undefined,
  },
  e1rm: {
    name: "e1rm",
    sources: ["exercise"],
    hasArg: false,
    script: () => "point(max(e1rm))",
    evaluate: (row, context) =>
      row.type === "exercise"
        ? maxWeight(row.entry.sets.map((set) => LiftographMeasures_setE1rm(set, context.settings.units)))
        : undefined,
  },
  volume: {
    name: "volume",
    sources: ["exercise", "workout"],
    hasArg: false,
    script: () => "point(volume)",
    evaluate: (row, context) => workoutVolume(row, context.settings),
  },
  maxReps: {
    name: "maxReps",
    sources: ["exercise"],
    hasArg: false,
    script: () => "point(max(completedReps))",
    evaluate: (row) => {
      if (row.type !== "exercise") {
        return undefined;
      }
      const reps = row.entry.sets.map((set) => set.completedReps).filter((r): r is number => r != null);
      return reps.length === 0 ? undefined : Math.max(...reps);
    },
  },
  muscleSets: {
    name: "muscleSets",
    sources: ["workout"],
    hasArg: true,
    script: (arg) => `point(muscleSets("${arg ?? ""}"))`,
    evaluate: (row, context, arg) => {
      if (row.type !== "workout" || arg == null) {
        return undefined;
      }
      const groups: Partial<Record<string, { sets: number }>> = context.muscleGroups(row.record);
      return groups[arg]?.sets ?? 0;
    },
  },
  muscleVolume: {
    name: "muscleVolume",
    sources: ["workout"],
    hasArg: true,
    script: (arg) => `point(muscleVolume("${arg ?? ""}"))`,
    evaluate: (row, context, arg) => {
      if (row.type !== "workout" || arg == null) {
        return undefined;
      }
      const groups: Partial<Record<string, { volume: IWeight }>> = context.muscleGroups(row.record);
      return groups[arg]?.volume ?? Weight_build(0, context.settings.units);
    },
  },
  duration: {
    name: "duration",
    sources: ["workout"],
    hasArg: false,
    script: () => "point(duration)",
    evaluate: (row) => (row.type === "workout" ? LiftographMeasures_workoutDuration(row.record) : undefined),
  },
};

export function LiftographPresets_isName(name: string): name is ILiftographPresetName {
  return Object.prototype.hasOwnProperty.call(liftographPresets, name);
}
