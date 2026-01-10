import { Program } from "../models/program";
import { Exercise } from "../models/exercise";
import { Storage } from "../models/storage";
import { Sync, IStorageUpdate2 } from "../utils/sync";
import { IStorage, ISet, IWeight, IHistoryRecord, ISettings } from "../types";
import { IEither } from "../utils/types";
import { getLatestMigrationVersion } from "../migrations/migrations";

export interface IWatchHistoryRecord {
  dayName: string;
  programName: string;
  exercises: IWatchHistoryEntry[];
}

export interface IWatchHistoryEntry {
  name: string;
  sets: IWatchSet[];
}

export interface IWatchSet {
  index: number;
  reps?: number;
  minReps?: number;
  weight?: IWeight;
  isAmrap?: boolean;
  rpe?: number;
  timer?: number;
  label?: string;
  isCompleted?: boolean;
  completedReps?: number;
  completedWeight?: IWeight;
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

class LiftosaurWatch {
  private static getStorage<T>(storageJson: string, cb: (storage: IStorage) => IEither<T, string>): string {
    try {
      const result = parseStorageSync(storageJson);
      if (!result.success) {
        return JSON.stringify({ success: false, error: result.error.join(", ") });
      }
      const newStorageResult = cb(result.data);
      return JSON.stringify(newStorageResult);
    } catch (error) {
      return JSON.stringify({ success: false, error: String(error) });
    }
  }

  private static modifyStorage(
    storageJson: string,
    deviceId: string,
    cb: (storage: IStorage) => IEither<IStorage, string>
  ): string {
    return this.getStorage<IStorage>(storageJson, (storage) => {
      const newStorageResult = cb(storage);
      if (!newStorageResult.success) {
        return { success: false, error: newStorageResult.error };
      }
      const newStorage = newStorageResult.data;
      const newVersions = Storage.updateVersions(storage, newStorage, deviceId);
      newStorage._versions = newVersions;
      return { success: true, data: newStorage };
    });
  }

  private static convertHistoryRecordToWatchHistoryRecord(
    historyRecord: IHistoryRecord,
    settings: ISettings
  ): IWatchHistoryRecord {
    const exercises: IWatchHistoryEntry[] = historyRecord.entries.map((entry) => {
      const exercise = Exercise.get(entry.exercise, settings.exercises);
      return {
        name: exercise.name,
        sets: entry.sets.map((set) => setToWatchSet(set)),
      };
    });
    return {
      dayName: historyRecord.dayName,
      programName: historyRecord.programName,
      exercises,
    };
  }

  public static getNextHistoryRecord(storageJson: string): string {
    return this.getStorage<IWatchHistoryRecord>(storageJson, (storage) => {
      const program = storage.programs.find((p) => p.id === storage.currentProgramId);
      if (!program) {
        return { success: false, error: "No current program" };
      }
      const settings = storage.settings;

      const historyRecord = Program.nextHistoryRecord(program, settings, storage.stats);
      const watchWorkout = this.convertHistoryRecordToWatchHistoryRecord(historyRecord, settings);
      return { success: true, data: watchWorkout };
    });
  }

  public static hasProgram(storageJson: string): string {
    return this.getStorage<{ hasProgram: boolean }>(storageJson, (storage) => {
      const has = storage.programs.some((p) => p.id === storage.currentProgramId);
      return { success: true, data: { hasProgram: has } };
    });
  }

  public static startWorkout(storageJson: string, deviceId: string): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const program = storage.programs.find((p) => p.id === storage.currentProgramId);
      if (!program) {
        return { success: false, error: "No current program" };
      }

      const settings = storage.settings;
      const newProgress = Program.nextHistoryRecord(program, settings, storage.stats);
      const updatedStorage: IStorage = {
        ...storage,
        progress: [newProgress],
      };
      return { success: true, data: updatedStorage };
    });
  }

  public static getProgress(storageJson: string): string {
    return this.getStorage<IWatchHistoryRecord | undefined>(storageJson, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: true, data: undefined };
      }
      const watchHistoryRecord = this.convertHistoryRecordToWatchHistoryRecord(progress, storage.settings);
      return { success: true, data: watchHistoryRecord };
    });
  }

  public static discardWorkout(storageJson: string, deviceId: string): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const updatedStorage: IStorage = { ...storage, progress: [] };
      return { success: true, data: updatedStorage };
    });
  }

  public static prepareSync(currentStorageJson: string, lastSyncedStorageJson: string, deviceId: string): string {
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

  public static mergeStorage(currentStorageJson: string, incomingStorageJson: string, deviceId: string): string {
    try {
      const currentStorage = JSON.parse(currentStorageJson) as IStorage;
      const incomingStorage = JSON.parse(incomingStorageJson) as IStorage;
      const merged = Storage.mergeStorage(currentStorage, incomingStorage, deviceId);
      return JSON.stringify(merged);
    } catch (e) {
      return JSON.stringify({ error: String(e) });
    }
  }

  public static getLatestMigrationVersion(): string {
    return getLatestMigrationVersion();
  }
}

declare const globalThis: Record<string, unknown>;
globalThis.Liftosaur = LiftosaurWatch;
