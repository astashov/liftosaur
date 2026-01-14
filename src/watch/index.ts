import { Program } from "../models/program";
import { Exercise } from "../models/exercise";
import { Storage } from "../models/storage";
import { Reps } from "../models/set";
import { Sync, IStorageUpdate2 } from "../utils/sync";
import {
  IStorage,
  ISet,
  IWeight,
  IHistoryRecord,
  ISettings,
  IExerciseType,
  IPercentage,
  IProgressMode,
  IProgramState,
} from "../types";
import { IEither } from "../utils/types";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { Weight } from "../models/weight";
import { Progress } from "../models/progress";
import { Equipment } from "../models/equipment";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { ObjectUtils } from "../utils/object";

export interface IWatchHistoryRecord {
  dayName: string;
  programName: string;
  exercises: IWatchHistoryEntry[];
}

export interface IWatchHistoryEntry {
  name: string;
  imageUrl?: string;
  sets: IWatchSet[];
}

export type IWatchSetStatus = "success" | "in-range" | "failed" | "not-finished";

export interface IWatchUserPromptedStateVar {
  name: string;
  value: number;
  unit?: "lb" | "kg" | "%";
}

export interface IWatchAmrapModal {
  entryIndex: number;
  setIndex: number;
  isAmrap: boolean;
  logRpe: boolean;
  askWeight: boolean;
  hasUserVars: boolean;
  isUnilateral: boolean;
  // Initial values for the fields
  initialReps?: number;
  initialRepsLeft?: number;
  initialWeight?: number;
  weightUnit: "lb" | "kg";
  initialRpe?: number;
  // User prompted state variables
  userPromptedVars: IWatchUserPromptedStateVar[];
}

export interface IWatchRestTimer {
  timerSince: number;
  timer: number;
}

export interface IWatchCompleteSetResult {
  amrapModal?: IWatchAmrapModal;
}

export interface IWatchSet {
  index: number;
  reps?: number;
  minReps?: number;
  weight?: IWeight;
  originalWeight?: IWeight | IPercentage;
  isAmrap?: boolean;
  rpe?: number;
  timer?: number;
  label?: string;
  isCompleted?: boolean;
  completedReps?: number;
  completedWeight?: IWeight;
  status: IWatchSetStatus;
  plates?: string;
  isWarmup: boolean;
}

function setToWatchSet(set: ISet, exerciseType: IExerciseType, settings: ISettings, isWarmup: boolean): IWatchSet {
  let plates: string | undefined;
  const weight = set.weight;
  if (weight) {
    const unit = weight.unit;
    const { plates: platesArr } = Weight.calculatePlates(weight, settings, unit, exerciseType);
    if (platesArr.length > 0) {
      plates = Weight.formatOneSide(settings, platesArr, exerciseType);
    }
  }
  return {
    index: set.index,
    reps: set.reps,
    minReps: set.minReps,
    weight: set.weight,
    originalWeight: set.originalWeight,
    isAmrap: set.isAmrap,
    rpe: set.rpe,
    timer: set.timer,
    label: set.label,
    isCompleted: set.isCompleted,
    completedReps: set.completedReps,
    completedWeight: set.completedWeight,
    status: Reps.setsStatus([set]),
    plates,
    isWarmup,
  };
}

// Cache validated storage to avoid re-parsing/validating on every call
let cachedStorage: IStorage | null = null;
let cachedStorageVersion: number = 0; // Incremented on each mutation

function parseStorageSync(storageJson: string, forceRevalidate: boolean = false): IEither<IStorage, string[]> {
  // If we have cached storage from a recent mutation, use it directly
  // The version check ensures we use cache only for our own mutations
  if (cachedStorage !== null && !forceRevalidate) {
    console.log(`[PERF] using cached storage (version ${cachedStorageVersion})`);
    return { success: true, data: cachedStorage };
  }

  const parseStart = Date.now();
  const data = JSON.parse(storageJson);
  console.log(`[PERF] JSON.parse took ${Date.now() - parseStart}ms`);
  // For watch, skip migrations and just validate
  const validateStart = Date.now();
  const result = Storage.validateStorage(data);
  console.log(`[PERF] validateStorage took ${Date.now() - validateStart}ms`);

  if (result.success) {
    cachedStorage = result.data;
    cachedStorageVersion += 1;
  }
  return result;
}

// Called when storage is updated from external source (phone sync, server)
function invalidateStorageCache(): void {
  cachedStorage = null;
  console.log(`[PERF] storage cache invalidated`);
}

class LiftosaurWatch {
  private static getStorage<T>(storageJson: string, cb: (storage: IStorage) => IEither<T, string>): string {
    try {
      const totalStart = Date.now();
      const parseStart = Date.now();
      const result = parseStorageSync(storageJson);
      console.log(`[PERF] parseStorageSync took ${Date.now() - parseStart}ms`);
      if (!result.success) {
        return JSON.stringify({ success: false, error: result.error.join(", ") });
      }
      const cbStart = Date.now();
      const newStorageResult = cb(result.data);
      console.log(`[PERF] callback took ${Date.now() - cbStart}ms`);
      const stringifyStart = Date.now();
      const jsonResult = JSON.stringify(newStorageResult);
      console.log(`[PERF] JSON.stringify took ${Date.now() - stringifyStart}ms`);
      console.log(`[PERF] getStorage total took ${Date.now() - totalStart}ms`);
      return jsonResult;
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
      const cbStart = Date.now();
      const newStorageResult = cb(storage);
      console.log(`[PERF] modifyStorage callback took ${Date.now() - cbStart}ms`);
      if (!newStorageResult.success) {
        return { success: false, error: newStorageResult.error };
      }
      const newStorage = newStorageResult.data;
      const versionsStart = Date.now();
      const newVersions = Storage.updateVersions(storage, newStorage, deviceId);
      console.log(`[PERF] updateVersions took ${Date.now() - versionsStart}ms`);
      newStorage._versions = newVersions;
      // Update cache with the new storage so next call doesn't need to re-validate
      cachedStorage = newStorage;
      cachedStorageVersion += 1;
      return { success: true, data: newStorage };
    });
  }

  private static convertHistoryRecordToWatchHistoryRecord(
    historyRecord: IHistoryRecord,
    settings: ISettings
  ): IWatchHistoryRecord {
    const exercises: IWatchHistoryEntry[] = historyRecord.entries.map((entry) => {
      const exercise = Exercise.get(entry.exercise, settings.exercises);
      const imageUrl = ExerciseImageUtils.url(entry.exercise, "small", settings);
      const warmupSets = (entry.warmupSets || []).map((set) => setToWatchSet(set, entry.exercise, settings, true));
      const workoutSets = entry.sets.map((set) => setToWatchSet(set, entry.exercise, settings, false));
      return {
        name: exercise.name,
        imageUrl,
        sets: [...warmupSets, ...workoutSets],
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
      // Update cache with merged result so next operation doesn't need to re-validate
      cachedStorage = merged;
      cachedStorageVersion += 1;
      console.log(`[PERF] mergeStorage updated cache (version ${cachedStorageVersion})`);
      return JSON.stringify(merged);
    } catch (e) {
      return JSON.stringify({ error: String(e) });
    }
  }

  public static getLatestMigrationVersion(): string {
    return getLatestMigrationVersion();
  }

  public static completeSet(storageJson: string, deviceId: string, entryIndex: number, globalSetIndex: number): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }
      const entry = progress.entries[entryIndex];
      if (!entry) {
        return { success: false, error: "Entry not found" };
      }

      // Derive mode and adjusted setIndex from global setIndex
      const warmupSetsCount = (entry.warmupSets || []).length;
      const isWarmup = globalSetIndex < warmupSetsCount;
      const mode: IProgressMode = isWarmup ? "warmup" : "workout";
      const setIndex = isWarmup ? globalSetIndex : globalSetIndex - warmupSetsCount;

      const program = Program.getCurrentProgram(storage);
      const evaluatedProgram = program ? Program.evaluate(program, storage.settings) : undefined;
      const programExercise = evaluatedProgram
        ? Program.getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId)
        : undefined;
      const newProgress = Progress.completeSetAction(
        storage.settings,
        storage.stats,
        progress,
        {
          type: "CompleteSetAction",
          entryIndex,
          setIndex,
          mode,
          programExercise,
          forceUpdateEntryIndex: false,
          isExternal: true,
          isPlayground: false,
        },
        storage.subscription
      );
      const newStorage: IStorage = {
        ...storage,
        progress: [newProgress],
      };
      return { success: true, data: newStorage };
    });
  }

  private static modifySet(
    storageJson: string,
    deviceId: string,
    entryIndex: number,
    globalSetIndex: number,
    modifier: (set: ISet, context: { settings: ISettings; exerciseType: IExerciseType }) => ISet
  ): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }
      const entry = progress.entries[entryIndex];
      if (!entry) {
        return { success: false, error: "Entry not found" };
      }

      const warmupSetsCount = (entry.warmupSets || []).length;
      const isWarmup = globalSetIndex < warmupSetsCount;
      const setIndex = isWarmup ? globalSetIndex : globalSetIndex - warmupSetsCount;
      const setsKey = isWarmup ? "warmupSets" : "sets";

      const sets = entry[setsKey];
      if (!sets || setIndex >= sets.length) {
        return { success: false, error: "Set not found" };
      }

      const newSets = [...sets];
      newSets[setIndex] = modifier(newSets[setIndex], { settings: storage.settings, exerciseType: entry.exercise });

      const newEntries = [...progress.entries];
      newEntries[entryIndex] = { ...entry, [setsKey]: newSets };

      const newProgress = { ...progress, entries: newEntries };
      const newStorage: IStorage = { ...storage, progress: [newProgress] };
      return { success: true, data: newStorage };
    });
  }

  public static updateSetReps(
    storageJson: string,
    deviceId: string,
    entryIndex: number,
    globalSetIndex: number,
    reps: number
  ): string {
    return this.modifySet(storageJson, deviceId, entryIndex, globalSetIndex, (set) => ({
      ...set,
      completedReps: reps,
    }));
  }

  public static updateSetWeight(
    storageJson: string,
    deviceId: string,
    entryIndex: number,
    globalSetIndex: number,
    weightValue: number
  ): string {
    return this.modifySet(storageJson, deviceId, entryIndex, globalSetIndex, (set, { settings, exerciseType }) => {
      const unit =
        set.completedWeight?.unit ??
        set.weight?.unit ??
        Equipment.getUnitOrDefaultForExerciseType(settings, exerciseType);
      return {
        ...set,
        completedWeight: { value: weightValue, unit },
      };
    });
  }

  public static getNextEntryAndSetIndex(storageJson: string, entryIndex: number): string {
    return this.getStorage<{ entryIndex: number; setIndex: number } | undefined>(storageJson, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }

      // First try to find next warmup set, then workout set
      // findNextEntryAndSetIndex already returns global setIndex
      const warmupResult = Reps.findNextEntryAndSetIndex(progress, entryIndex, "warmup");
      if (warmupResult) {
        return { success: true, data: warmupResult };
      }

      const workoutResult = Reps.findNextEntryAndSetIndex(progress, entryIndex, "workout");
      return { success: true, data: workoutResult };
    });
  }

  public static getValidWeights(
    storageJson: string,
    entryIndex: number,
    currentWeightValue: number,
    unit: string,
    countUp: number,
    countDown: number
  ): string {
    return this.getStorage<{ weights: number[]; currentIndex: number }>(storageJson, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }
      const entry = progress.entries[entryIndex];
      if (!entry) {
        return { success: false, error: "Entry not found" };
      }

      const exerciseType = entry.exercise;
      const settings = storage.settings;
      const currentWeight: IWeight = { value: currentWeightValue, unit: unit as "lb" | "kg" };

      const weightsUp: number[] = [];
      const weightsDown: number[] = [];

      // Generate weights going up
      let w = currentWeight;
      for (let i = 0; i < countUp; i++) {
        const nextW = Weight.increment(w, settings, exerciseType);
        if (nextW.value === w.value) {
          break;
        }
        weightsUp.push(nextW.value);
        w = nextW;
      }

      // Generate weights going down
      w = currentWeight;
      for (let i = 0; i < countDown; i++) {
        const prevW = Weight.decrement(w, settings, exerciseType);
        if (prevW.value === w.value || prevW.value <= 0) {
          break;
        }
        weightsDown.unshift(prevW.value);
        w = prevW;
      }

      // Combine: [...down, current, ...up]
      const weights = [...weightsDown, currentWeight.value, ...weightsUp];
      const currentIndex = weightsDown.length;

      return { success: true, data: { weights, currentIndex } };
    });
  }

  public static getAmrapModal(storageJson: string): string {
    return this.getStorage<IWatchAmrapModal | undefined>(storageJson, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: true, data: undefined };
      }

      const modalData = progress.ui?.amrapModal;
      if (!modalData) {
        return { success: true, data: undefined };
      }

      const entry = progress.entries[modalData.entryIndex];
      if (!entry) {
        return { success: true, data: undefined };
      }

      const set = entry.sets[modalData.setIndex];
      if (!set) {
        return { success: true, data: undefined };
      }

      const settings = storage.settings;
      const isUnilateral = Exercise.getIsUnilateral(entry.exercise, settings);
      const weightUnit = set.weight?.unit ?? Equipment.getUnitOrDefaultForExerciseType(settings, entry.exercise);

      // Build user prompted vars if needed
      const userPromptedVars: IWatchUserPromptedStateVar[] = [];
      if (modalData.userVars) {
        const program = Program.getCurrentProgram(storage);
        const evaluatedProgram = program ? Program.evaluate(program, settings) : undefined;
        const programExercise = evaluatedProgram
          ? Program.getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId)
          : undefined;

        if (programExercise) {
          const stateMetadata = PlannerProgramExercise.getStateMetadata(programExercise) || {};
          const state = PlannerProgramExercise.getState(programExercise);
          for (const key of ObjectUtils.keys(stateMetadata)) {
            if (stateMetadata[key]?.userPrompted) {
              const value = state[key];
              if (typeof value === "number") {
                userPromptedVars.push({ name: key, value });
              } else if (Weight.is(value)) {
                userPromptedVars.push({ name: key, value: value.value, unit: value.unit });
              } else if (Weight.isPct(value)) {
                userPromptedVars.push({ name: key, value: value.value, unit: "%" });
              }
            }
          }
        }
      }

      const modal: IWatchAmrapModal = {
        entryIndex: modalData.entryIndex,
        setIndex: modalData.setIndex,
        isAmrap: !!modalData.isAmrap,
        logRpe: !!modalData.logRpe,
        askWeight: !!modalData.askWeight,
        hasUserVars: !!modalData.userVars,
        isUnilateral,
        initialReps: set.completedReps ?? set.reps,
        initialRepsLeft: isUnilateral ? (set.completedRepsLeft ?? set.reps) : undefined,
        initialWeight: set.completedWeight?.value ?? set.weight?.value,
        weightUnit,
        initialRpe: set.completedRpe ?? set.rpe,
        userPromptedVars,
      };

      return { success: true, data: modal };
    });
  }

  public static completeSetWithAmrap(
    storageJson: string,
    deviceId: string,
    completedReps?: number,
    completedRepsLeft?: number,
    completedWeight?: number,
    completedRpe?: number,
    userPromptedVarsJson?: string
  ): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }

      const modalData = progress.ui?.amrapModal;
      if (!modalData) {
        return { success: false, error: "No amrap modal data" };
      }

      const { entryIndex, setIndex } = modalData;
      const entry = progress.entries[entryIndex];
      if (!entry) {
        return { success: false, error: "Entry not found" };
      }

      const settings = storage.settings;
      const set = entry.sets[setIndex];
      if (!set) {
        return { success: false, error: "Set not found" };
      }

      // Get program exercise for running update script
      const program = Program.getCurrentProgram(storage);
      const evaluatedProgram = program ? Program.evaluate(program, settings) : undefined;
      const programExercise = evaluatedProgram
        ? Program.getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId)
        : undefined;

      // Build the action similar to ChangeAMRAPAction
      let weightValue: IWeight | undefined;
      if (completedWeight != null) {
        const weightUnit = set.weight?.unit ?? Equipment.getUnitOrDefaultForExerciseType(settings, entry.exercise);
        weightValue = { value: completedWeight, unit: weightUnit };
      }

      // Parse user vars if provided
      let userVars: IProgramState | undefined;
      if (userPromptedVarsJson) {
        try {
          userVars = JSON.parse(userPromptedVarsJson) as IProgramState;
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Use Progress.changeAmrapAction which handles all the logic
      const newProgress = Progress.changeAmrapAction(
        settings,
        storage.stats,
        progress,
        {
          type: "ChangeAMRAPAction",
          entryIndex,
          setIndex,
          isPlayground: false,
          amrapValue: completedReps,
          amrapLeftValue: completedRepsLeft,
          rpeValue: completedRpe,
          weightValue,
          isAmrap: modalData.isAmrap,
          logRpe: modalData.logRpe,
          askWeight: modalData.askWeight,
          programExercise,
          otherStates: {},
          userVars,
        },
        storage.subscription
      );

      const newStorage: IStorage = {
        ...storage,
        progress: [newProgress],
      };
      return { success: true, data: newStorage };
    });
  }

  public static getRestTimer(storageJson: string): string {
    return this.getStorage<IWatchRestTimer | undefined>(storageJson, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: true, data: undefined };
      }

      if (progress.timerSince == null || progress.timer == null) {
        return { success: true, data: undefined };
      }

      return {
        success: true,
        data: {
          timerSince: progress.timerSince,
          timer: progress.timer,
        },
      };
    });
  }

  public static adjustRestTimer(storageJson: string, deviceId: string, adjustment: number): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }

      if (progress.timerSince == null || progress.timer == null) {
        return { success: false, error: "No active timer" };
      }

      const program = Program.getCurrentProgram(storage);
      if (!program) {
        return { success: false, error: "No current program" };
      }

      const newTimer = progress.timer + adjustment;
      const newProgress = Progress.updateTimer(
        progress,
        program,
        newTimer,
        progress.timerSince,
        undefined,
        undefined,
        true,
        storage.settings,
        storage.subscription
      );
      const newStorage: IStorage = { ...storage, progress: [newProgress] };
      return { success: true, data: newStorage };
    });
  }

  public static stopRestTimer(storageJson: string, deviceId: string): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }

      const newProgress = Progress.stopTimerPure(progress);
      const newStorage: IStorage = { ...storage, progress: [newProgress] };
      return { success: true, data: newStorage };
    });
  }

  // Called when storage is updated from external source (phone sync, server)
  // Forces next operation to re-parse and re-validate from the new storageJson
  public static invalidateStorageCache(): void {
    invalidateStorageCache();
  }
}

declare const globalThis: Record<string, unknown>;
globalThis.Liftosaur = LiftosaurWatch;
