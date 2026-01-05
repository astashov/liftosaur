import { Program } from "../models/program";
import { Exercise } from "../models/exercise";
import { Storage } from "../models/storage";
import { Sync, IStorageUpdate2 } from "../utils/sync";
import { IStorage, ISet, IStats } from "../types";
import { IEither } from "../utils/types";

export interface IWatchWorkout {
  dayName: string;
  programName: string;
  exercises: IWatchExercise[];
}

export interface IWatchExercise {
  name: string;
  equipment: string;
  targetMuscles: string[];
  sets: IWatchSet[];
}

export interface IWatchSet {
  index: number;
  reps?: number;
  minReps?: number;
  weight?: { value: number; unit: string };
  isAmrap?: boolean;
  rpe?: number;
  timer?: number;
  label?: string;
  isCompleted?: boolean;
  completedReps?: number;
  completedWeight?: { value: number; unit: string };
}

function setToWatchSet(set: ISet): IWatchSet {
  return {
    index: set.index,
    reps: set.reps,
    minReps: set.minReps,
    weight: set.weight ? { value: set.weight.value, unit: set.weight.unit } : undefined,
    isAmrap: set.isAmrap,
    rpe: set.rpe,
    timer: set.timer,
    label: set.label,
    isCompleted: set.isCompleted,
    completedReps: set.completedReps,
    completedWeight: set.completedWeight
      ? { value: set.completedWeight.value, unit: set.completedWeight.unit }
      : undefined,
  };
}

function parseStorageSync(storageJson: string): IEither<IStorage, string[]> {
  const data = JSON.parse(storageJson);
  // For watch, skip migrations and just validate
  return Storage.validateStorage(data);
}

export function getNextWorkout(storageJson: string): string {
  const result = parseStorageSync(storageJson);
  if (!result.success) {
    return JSON.stringify({ error: result.error.join(", ") });
  }
  const storage = result.data;

  const program = storage.programs.find((p) => p.id === storage.currentProgramId);
  if (!program) {
    return JSON.stringify({ error: "No current program" });
  }

  const settings = storage.settings;
  const stats: IStats = storage.stats ?? { visibleMuscles: {} };

  try {
    const historyRecord = Program.nextHistoryRecord(program, settings, stats);
    const exercises: IWatchExercise[] = historyRecord.entries.map((entry) => {
      const exercise = Exercise.get(entry.exercise, settings.exercises);
      return {
        name: exercise.name,
        equipment: entry.exercise.equipment || "bodyweight",
        targetMuscles: exercise.targetMuscles || [],
        sets: entry.sets.map((set) => setToWatchSet(set)),
      };
    });
    const watchWorkout: IWatchWorkout = {
      dayName: historyRecord.dayName,
      programName: historyRecord.programName,
      exercises,
    };
    return JSON.stringify(watchWorkout);
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

export function hasProgram(storageJson: string): string {
  try {
    const storage = JSON.parse(storageJson) as IStorage;
    const has = storage.programs.some((p) => p.id === storage.currentProgramId);
    return JSON.stringify({ hasProgram: has });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

export function startWorkout(storageJson: string, deviceId: string): string {
  const result = parseStorageSync(storageJson);
  if (!result.success) {
    return JSON.stringify({ error: result.error.join(", ") });
  }
  const storage = result.data;

  const program = storage.programs.find((p) => p.id === storage.currentProgramId);
  if (!program) {
    return JSON.stringify({ error: "No current program" });
  }

  try {
    const settings = storage.settings;
    const stats: IStats = storage.stats ?? { visibleMuscles: {} };
    const newProgress = Program.nextHistoryRecord(program, settings, stats);
    const updatedStorage: IStorage = {
      ...storage,
      progress: [newProgress],
    };
    // Update versions so sync can detect the change
    const versions = Storage.updateVersions(storage, updatedStorage, deviceId);
    updatedStorage._versions = versions;
    return JSON.stringify(updatedStorage);
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

export function getActiveWorkout(storageJson: string): string {
  const result = parseStorageSync(storageJson);
  if (!result.success) {
    return JSON.stringify({ error: result.error.join(", ") });
  }
  const storage = result.data;

  const progress = storage.progress?.[0];
  if (!progress) {
    return JSON.stringify({ hasWorkout: false });
  }

  const exercises: IWatchExercise[] = progress.entries.map((entry) => {
    const exercise = Exercise.get(entry.exercise, storage.settings.exercises);
    return {
      name: exercise.name,
      equipment: entry.exercise.equipment || "bodyweight",
      targetMuscles: exercise.targetMuscles || [],
      sets: entry.sets.map((set) => setToWatchSet(set)),
    };
  });

  const watchWorkout: IWatchWorkout & { hasWorkout: boolean; startTime: number } = {
    hasWorkout: true,
    dayName: progress.dayName,
    programName: progress.programName,
    startTime: progress.startTime,
    exercises,
  };
  return JSON.stringify(watchWorkout);
}

export function discardWorkout(storageJson: string, deviceId: string): string {
  const result = parseStorageSync(storageJson);
  if (!result.success) {
    return JSON.stringify({ error: result.error.join(", ") });
  }
  const storage = result.data;

  try {
    const updatedStorage: IStorage = {
      ...storage,
      progress: [],
    };
    // Update versions so sync can detect the change
    const versions = Storage.updateVersions(storage, updatedStorage, deviceId);
    updatedStorage._versions = versions;
    return JSON.stringify(updatedStorage);
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

export function prepareSync(currentStorageJson: string, lastSyncedStorageJson: string, deviceId: string): string {
  try {
    const currentStorage = JSON.parse(currentStorageJson) as IStorage;
    const lastSyncedStorage = JSON.parse(lastSyncedStorageJson) as IStorage;
    console.log("current", JSON.stringify(currentStorage.progress));
    console.log("last", JSON.stringify(lastSyncedStorage.progress));
    const update: IStorageUpdate2 = Sync.getStorageUpdate2(currentStorage, lastSyncedStorage, deviceId);
    console.log("update", JSON.stringify(update));
    return JSON.stringify(update);
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

export function mergeStorage(currentStorageJson: string, incomingStorageJson: string, deviceId: string): string {
  try {
    const currentStorage = JSON.parse(currentStorageJson) as IStorage;
    const incomingStorage = JSON.parse(incomingStorageJson) as IStorage;
    const merged = Storage.mergeStorage(currentStorage, incomingStorage, deviceId);
    return JSON.stringify(merged);
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

declare const globalThis: Record<string, unknown>;
globalThis.Liftosaur = {
  getNextWorkout,
  hasProgram,
  startWorkout,
  discardWorkout,
  getActiveWorkout,
  prepareSync,
  mergeStorage,
};
