import { Program } from "../models/program";
import { Exercise } from "../models/exercise";
import { Storage } from "../models/storage";
import { History } from "../models/history";
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
  IScreenMuscle,
  IUnit,
  IPercentageUnit,
  IProgram,
} from "../types";
import { IEither } from "../utils/types";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { Weight } from "../models/weight";
import { Progress } from "../models/progress";
import { Equipment } from "../models/equipment";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { ObjectUtils } from "../utils/object";
import { Collector } from "../utils/collector";
import { Muscle } from "../models/muscle";
import { SendMessage } from "../utils/sendMessage";
import { LiveActivityManager } from "../utils/liveActivityManager";

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
  unit?: IUnit | IPercentageUnit;
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
  weightUnit: IUnit;
  initialRpe?: number;
  // Valid weights for the weight field (plate-compatible increments)
  validWeights?: number[];
  validWeightIndex?: number;
  // User prompted state variables
  userPromptedVars: IWatchUserPromptedStateVar[];
}

export interface IWatchRestTimer {
  timerSince: number;
  timer: number;
}

export interface IWatchWorkoutStatus {
  isPaused: boolean;
  intervals: [number, number | null][];
  startTime: number;
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
  askWeight?: boolean;
  rpe?: number;
  timer?: number;
  label?: string;
  isCompleted?: boolean;
  completedReps?: number;
  completedRepsLeft?: number;
  completedWeight?: IWeight;
  completedRpe?: number;
  status: IWatchSetStatus;
  plates?: string;
  isWarmup: boolean;
  isUnilateral: boolean;
}

export interface IWatchFinishWorkoutSummary {
  dayName: string;
  programName: string;
  timeMs: number;
  volume: IWeight;
  totalSets: number;
  totalReps: number;
  exercises: IWatchHistoryEntry[];
  muscleGroups: IWatchMuscleGroup[];
  personalRecords: IWatchPersonalRecords;
}

export interface IWatchMuscleGroup {
  name: string;
  sets: number;
}

export interface IWatchPersonalRecords {
  maxWeight: IWatchMaxWeightRecord[];
  estimated1RM: IWatchEstimated1RMRecord[];
}

export interface IWatchMaxWeightRecord {
  exerciseName: string;
  weight: IWeight;
  reps: number;
}

export interface IWatchEstimated1RMRecord {
  exerciseName: string;
  value: IWeight;
  reps: number;
  weight: IWeight;
}

function setToWatchSet(
  set: ISet,
  exerciseType: IExerciseType,
  settings: ISettings,
  isWarmup: boolean,
  isUnilateral: boolean
): IWatchSet {
  let plates: string | undefined;
  const weightForPlates = set.completedWeight ?? set.weight;
  if (weightForPlates) {
    const unit = weightForPlates.unit;
    const { plates: platesArr } = Weight.calculatePlates(weightForPlates, settings, unit, exerciseType);
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
    askWeight: set.askWeight,
    rpe: set.rpe,
    timer: set.timer,
    label: set.label,
    isCompleted: set.isCompleted,
    completedReps: set.completedReps,
    completedRepsLeft: isUnilateral ? set.completedRepsLeft : undefined,
    completedWeight: set.completedWeight,
    completedRpe: set.completedRpe,
    status: Reps.setsStatus([set]),
    plates,
    isWarmup,
    isUnilateral,
  };
}

// Cache validated storage to avoid re-parsing/validating on every call
let cachedStorage: IStorage | null = null;
let cachedStorageVersion: number = 0; // Incremented on each mutation
let hasValidatedOnceThisSession: boolean = false; // Only validate once per app session

// Cache evaluated program to avoid re-evaluating Liftoscript on every call
// The memoization in Program.evaluate uses reference equality, which fails when
// storage is parsed from JSON (new object references each time)
interface ICachedEvaluatedProgram {
  programId: string;
  plannerText: string;
  evaluatedProgram: ReturnType<typeof Program.evaluate>;
}
let cachedEvaluatedProgram: ICachedEvaluatedProgram | null = null;

function getProgram(storage: IStorage): IProgram | undefined {
  return storage.programs.find((p) => p.id === storage.currentProgramId);
}

function getEvaluatedProgram(storage: IStorage): ReturnType<typeof Program.evaluate> | undefined {
  const program = getProgram(storage);
  if (!program) {
    return undefined;
  }

  // Generate a key from the program's planner text for cache comparison
  const plannerText = program.planner
    ? program.planner.weeks.map((w) => w.days.map((d) => d.exerciseText).join("\n")).join("\n")
    : "";

  // Check if we have a cached evaluation for this program
  if (
    cachedEvaluatedProgram &&
    cachedEvaluatedProgram.programId === program.id &&
    cachedEvaluatedProgram.plannerText === plannerText
  ) {
    return cachedEvaluatedProgram.evaluatedProgram;
  }

  // Evaluate and cache
  const evalStart = Date.now();
  const evaluatedProgram = Program.evaluate(program, storage.settings);
  const evalTime = Date.now() - evalStart;
  if (evalTime > 100) {
    console.log(`[PERF] Program.evaluate took ${evalTime}ms`);
  }

  cachedEvaluatedProgram = {
    programId: program.id,
    plannerText,
    evaluatedProgram,
  };

  return evaluatedProgram;
}

function parseStorageSync(storageJson: string, forceRevalidate: boolean = false): IEither<IStorage, string[]> {
  // If we have cached storage from a recent mutation, use it directly
  // The version check ensures we use cache only for our own mutations
  if (cachedStorage !== null && !forceRevalidate) {
    return { success: true, data: cachedStorage };
  }

  const parseStart = Date.now();
  const data = JSON.parse(storageJson);
  const parseTime = Date.now() - parseStart;
  if (parseTime > 50) {
    console.log(`[PERF] JSON.parse took ${parseTime}ms`);
  }

  // Validate only once per session to catch schema issues from development changes.
  // After first successful validation, trust subsequent storage from phone/server.
  // See: rfcs/watch-storage-performance.md
  if (!hasValidatedOnceThisSession) {
    const validateStart = Date.now();
    const result = Storage.validateStorage(data);
    const validateTime = Date.now() - validateStart;
    if (validateTime > 50) {
      console.log(`[PERF] validateStorage took ${validateTime}ms`);
    }

    if (!result.success) {
      return result;
    }
    hasValidatedOnceThisSession = true;
    cachedStorage = result.data;
  } else {
    cachedStorage = data as IStorage;
  }

  cachedStorageVersion += 1;
  return { success: true, data: cachedStorage };
}

// Called when storage is updated from external source (phone sync, server)
function invalidateStorageCache(): void {
  cachedStorage = null;
  cachedEvaluatedProgram = null;
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
      // Update cache with the new storage so next call doesn't need to re-validate
      cachedStorage = newStorage;
      cachedStorageVersion += 1;
      return { success: true, data: newStorage };
    });
  }

  private static convertHistoryEntryToWatchEntry(
    entry: { exercise: IExerciseType; warmupSets?: ISet[]; sets: ISet[] },
    settings: ISettings
  ): IWatchHistoryEntry {
    const exercise = Exercise.get(entry.exercise, settings.exercises);
    const imageUrl = ExerciseImageUtils.url(entry.exercise, "small", settings);
    const isUnilateral = Exercise.getIsUnilateral(entry.exercise, settings);
    const warmupSets = (entry.warmupSets || []).map((set) =>
      setToWatchSet(set, entry.exercise, settings, true, isUnilateral)
    );
    const workoutSets = entry.sets.map((set) => setToWatchSet(set, entry.exercise, settings, false, isUnilateral));
    return {
      name: exercise.name,
      imageUrl,
      sets: [...warmupSets, ...workoutSets],
    };
  }

  private static convertHistoryRecordToWatchHistoryRecord(
    historyRecord: IHistoryRecord,
    settings: ISettings
  ): IWatchHistoryRecord {
    const exercises: IWatchHistoryEntry[] = historyRecord.entries.map((entry) =>
      this.convertHistoryEntryToWatchEntry(entry, settings)
    );
    return {
      dayName: historyRecord.dayName,
      programName: historyRecord.programName,
      exercises,
    };
  }

  public static getNextHistoryRecord(storageJson: string): string {
    return this.getStorage<IWatchHistoryRecord>(storageJson, (storage) => {
      const evaluatedProgram = getEvaluatedProgram(storage);
      if (!evaluatedProgram) {
        return { success: false, error: "No current program" };
      }
      const settings = storage.settings;

      const historyRecord = Program.nextHistoryRecordFromEvaluated(evaluatedProgram, settings, storage.stats);
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

  public static hasSubscription(storageJson: string): string {
    return this.getStorage<{ hasSubscription: boolean }>(storageJson, (storage) => {
      // const has = Subscriptions.hasSubscription(storage.subscription);
      return { success: true, data: { hasSubscription: true } };
    });
  }

  public static finishWorkout(storageJson: string, deviceId: string): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No progress to finish" };
      }
      const newStorage = Progress.finishWorkout(storage, progress);
      return { success: true, data: newStorage };
    });
  }

  public static startWorkout(storageJson: string, deviceId: string): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const evaluatedProgram = getEvaluatedProgram(storage);
      if (!evaluatedProgram) {
        return { success: false, error: "No current program" };
      }

      const settings = storage.settings;
      const newProgress = Program.nextHistoryRecordFromEvaluated(evaluatedProgram, settings, storage.stats);
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
      const update: IStorageUpdate2 = Sync.getStorageUpdate2(currentStorage, lastSyncedStorage, deviceId);
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
      return JSON.stringify(merged);
    } catch (e) {
      return JSON.stringify({ error: String(e) });
    }
  }

  public static getLatestMigrationVersion(): string {
    return getLatestMigrationVersion();
  }

  public static completeSetLiveActivity(
    storageJson: string,
    deviceId: string,
    entryIndex: number,
    setIndex: number,
    restTimer: number,
    restTimerSince: number
  ): string {
    return this.modifyStorage(storageJson, deviceId, (storage): IEither<IStorage, string> => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }
      const entry = progress.entries[entryIndex];
      if (!entry) {
        return { success: false, error: "Entry not found" };
      }
      const isWarmup = setIndex < entry.warmupSets.length;
      let adjustedSetIndex = setIndex;
      if (!isWarmup) {
        adjustedSetIndex -= entry.warmupSets.length;
      }
      console.log(`Main App: complete set entryIndex: ${entryIndex}, setIndex: ${setIndex}`);
      const evaluatedProgram = getEvaluatedProgram(storage);
      const programExercise = evaluatedProgram
        ? Program.getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId)
        : undefined;

      const set = isWarmup ? entry.warmupSets[adjustedSetIndex] : entry.sets[adjustedSetIndex];
      if (set.isCompleted) {
        console.log(`Main App: Set already completed, refreshing live activity`);
        const program = getProgram(storage);
        LiveActivityManager.updateProgressLiveActivity(
          program,
          progress,
          storage.settings,
          storage.subscription,
          entryIndex,
          setIndex,
          restTimer,
          restTimerSince
        );
        return { success: true, data: storage };
      }
      const newProgress = Progress.completeSetAction(
        storage.settings,
        storage.stats,
        progress,
        {
          type: "CompleteSetAction",
          entryIndex,
          setIndex: adjustedSetIndex,
          mode: isWarmup ? "warmup" : "workout",
          programExercise: programExercise,
          otherStates: evaluatedProgram?.states,
          isPlayground: false,
          forceUpdateEntryIndex: true,
          isExternal: true,
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

  public static adjustTimerLiveActivity(
    storageJson: string,
    deviceId: string,
    action: "increase" | "decrease",
    incomingRestTimer: number,
    incomingRestTimerSince: number,
    entryIndex: number,
    setIndex: number,
    skipLiveActivityUpdate: boolean
  ): string {
    return this.modifyStorage(storageJson, deviceId, (storage): IEither<IStorage, string> => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }
      const { timer, timerSince } = progress;
      console.log(`Main app: ${action === "increase" ? "Increasing" : "Decreasing"} rest timer by 15 seconds`);
      console.log(`Main app: Current timer: ${timer}, since: ${timerSince}`);
      if (timer == null || timerSince == null) {
        return { success: true, data: storage };
      }
      const program = getProgram(storage);
      if (incomingRestTimer !== timer || incomingRestTimerSince !== timerSince) {
        console.log(
          `Main app: Incoming rest timer data does not match current state, refreshing live activity. ${incomingRestTimer} != ${timer} || ${incomingRestTimerSince} != ${timerSince}`
        );
        if (!skipLiveActivityUpdate) {
          LiveActivityManager.updateProgressLiveActivity(
            program,
            progress,
            storage.settings,
            storage.subscription,
            entryIndex,
            setIndex,
            timer,
            timerSince
          );
        }
      } else {
        const newProgress = Progress.updateTimer(
          progress,
          program,
          action === "increase" ? timer + 15 : Math.max(0, timer - 15),
          progress.timerSince || Date.now(),
          entryIndex,
          setIndex,
          !!skipLiveActivityUpdate,
          storage.settings,
          storage.subscription
        );
        const newStorage: IStorage = {
          ...storage,
          progress: [newProgress],
        };
        return { success: true, data: newStorage };
      }
      return { success: true, data: storage };
    });
  }

  public static completeSet(storageJson: string, deviceId: string, entryIndex: number, globalSetIndex: number): string {
    return this.modifyStorage(storageJson, deviceId, (storage): IEither<IStorage, string> => {
      let progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }
      if (progress.ui?.amrapModal) {
        progress = { ...progress, ui: { ...progress.ui, amrapModal: undefined } };
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

      const evaluatedProgram = getEvaluatedProgram(storage);
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
          otherStates: evaluatedProgram?.states,
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

  public static updateSetRepsLeft(
    storageJson: string,
    deviceId: string,
    entryIndex: number,
    globalSetIndex: number,
    reps: number
  ): string {
    return this.modifySet(storageJson, deviceId, entryIndex, globalSetIndex, (set) => ({
      ...set,
      completedRepsLeft: reps,
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

  public static getNextEntryAndSetIndex(storageJson: string, entryIndex: number, setIndex: number): string {
    return this.getStorage<{ entryIndex: number; setIndex: number } | undefined>(storageJson, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }
      const entry = progress.entries[entryIndex];
      if (!entry) {
        return { success: false, error: "Entry not found" };
      }
      const mode = setIndex < (entry.warmupSets?.length || 0) ? "warmup" : "workout";
      const result = Reps.findNextEntryAndSetIndex(progress, entryIndex, mode);
      return { success: true, data: result };
    });
  }

  private static generateValidWeightsArray(
    settings: ISettings,
    exerciseType: IExerciseType,
    currentWeightValue: number,
    unit: IUnit,
    countUp: number,
    countDown: number
  ): { weights: number[]; currentIndex: number } {
    const currentWeight: IWeight = { value: currentWeightValue, unit };

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

    return { weights, currentIndex };
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

      const result = this.generateValidWeightsArray(
        storage.settings,
        entry.exercise,
        currentWeightValue,
        unit as IUnit,
        countUp,
        countDown
      );

      return { success: true, data: result };
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

      // Generate valid weights for the main weight field
      let validWeights: number[] | undefined;
      let validWeightIndex: number | undefined;
      if (modalData.askWeight) {
        const initialWeight = set.completedWeight?.value ?? set.weight?.value ?? 0;
        const result = this.generateValidWeightsArray(settings, entry.exercise, initialWeight, weightUnit, 50, 50);
        validWeights = result.weights;
        validWeightIndex = result.currentIndex;
      }

      // Build user prompted vars if needed
      const userPromptedVars: IWatchUserPromptedStateVar[] = [];
      if (modalData.userVars) {
        const evaluatedProgram = getEvaluatedProgram(storage);
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
        validWeights,
        validWeightIndex,
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
      const evaluatedProgram = getEvaluatedProgram(storage);
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

  public static getWorkoutStatus(storageJson: string): string {
    return this.getStorage<IWatchWorkoutStatus | undefined>(storageJson, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: true, data: undefined };
      }

      // Convert intervals to the format expected by Swift
      // If no intervals, use [startTime, endTime or undefined]
      const intervals: [number, number | null][] = progress.intervals
        ? progress.intervals.map((i) => [i[0], i[1] ?? null])
        : [[progress.startTime, progress.endTime ?? null]];

      return {
        success: true,
        data: {
          isPaused: History.isPaused(progress.intervals),
          intervals,
          startTime: progress.startTime,
        },
      };
    });
  }

  public static pauseWorkout(storageJson: string, deviceId: string): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }

      const newIntervals = History.pauseWorkout(progress.intervals);
      if (newIntervals !== progress.intervals) {
        const newProgress = { ...progress, intervals: newIntervals };
        const newStorage: IStorage = { ...storage, progress: [newProgress] };
        return { success: true, data: newStorage };
      }
      return { success: true, data: storage };
    });
  }

  public static resumeWorkout(storageJson: string, deviceId: string): string {
    return this.modifyStorage(storageJson, deviceId, (storage) => {
      const progress = storage.progress?.[0];
      if (!progress) {
        return { success: false, error: "No active workout" };
      }

      const newIntervals = History.resumeWorkout(progress, false);
      if (newIntervals !== progress.intervals) {
        const newProgress = { ...progress, intervals: newIntervals };
        const newStorage: IStorage = { ...storage, progress: [newProgress] };
        return { success: true, data: newStorage };
      }
      return { success: true, data: storage };
    });
  }

  public static getFinishWorkoutSummary(storageJson: string): string {
    return this.getStorage<IWatchFinishWorkoutSummary | undefined>(storageJson, (storage) => {
      const history = storage.history;
      if (history.length === 0) {
        return { success: true, data: undefined };
      }

      const record = history[0];
      const settings = storage.settings;

      // Calculate stats using History helpers
      const timeMs = History.workoutTime(record);
      const volume = History.totalRecordWeight(record, settings.units);
      const totalSets = History.totalRecordSets(record);
      const totalReps = History.totalRecordReps(record);

      // Convert started entries to watch format
      const startedEntries = History.getStartedEntries(record);
      const exercises = startedEntries.map((entry) => this.convertHistoryEntryToWatchEntry(entry, settings));

      // Calculate muscle groups using History.collectMuscleGroups
      const historyCollector = Collector.build([record]).addFn(History.collectMuscleGroups(settings));
      const [muscleGroupsData] = historyCollector.run();
      const muscleGroups: IWatchMuscleGroup[] = [];
      for (const mg of ObjectUtils.keys(muscleGroupsData) as IScreenMuscle[]) {
        if (mg !== "total") {
          const values = muscleGroupsData[mg];
          const sets = values[2][0];
          if (sets > 0) {
            muscleGroups.push({
              name: Muscle.getMuscleGroupName(mg, settings),
              sets: Math.round(sets * 10) / 10,
            });
          }
        }
      }
      muscleGroups.sort((a, b) => b.sets - a.sets);

      // PRs disabled - watch doesn't receive full history for performance reasons
      // See: rfcs/watch-storage-performance.md
      const personalRecords: IWatchPersonalRecords = { maxWeight: [], estimated1RM: [] };

      return {
        success: true,
        data: {
          dayName: record.dayName,
          programName: record.programName,
          timeMs,
          volume,
          totalSets,
          totalReps,
          exercises,
          muscleGroups,
          personalRecords,
        },
      };
    });
  }

  public static finishWorkoutContinue(storageJson: string): string {
    return this.getStorage<{ sent: boolean }>(storageJson, (storage) => {
      const history = storage.history;
      if (history.length === 0) {
        return { success: true, data: { sent: false } };
      }

      const record = history[0];
      const settings = storage.settings;

      const healthSync = !!settings.appleHealthSyncWorkout;
      const calories = History.calories(record);
      const intervals = record.intervals || [[record.startTime, record.endTime || Date.now()]];

      SendMessage.toIos({
        type: "finishWorkout",
        healthSync: healthSync ? "true" : "false",
        calories: `${calories}`,
        intervals: JSON.stringify(intervals),
      });

      return { success: true, data: { sent: true } };
    });
  }

  // Called when storage is updated from external source (phone sync, server)
  // Forces next operation to re-parse and re-validate from the new storageJson
  public static invalidateStorageCache(): void {
    invalidateStorageCache();
  }

  public static getVolume(storageJson: string): string {
    return this.getStorage<{ volume: number }>(storageJson, (storage) => {
      return { success: true, data: { volume: storage.settings.volume } };
    });
  }

  public static getHealthSettings(storageJson: string): string {
    return this.getStorage<{ appleHealthSyncWorkout: boolean; healthConfirmation: boolean }>(storageJson, (storage) => {
      return {
        success: true,
        data: {
          appleHealthSyncWorkout: !!storage.settings.appleHealthSyncWorkout,
          healthConfirmation: !!storage.settings.healthConfirmation,
        },
      };
    });
  }

  // Validates storage without performing any operation.
  // Used by phone to validate storage before sending to watch.
  public static validateStorage(storageJson: string): string {
    try {
      const result = parseStorageSync(storageJson, true); // force revalidate
      if (!result.success) {
        return JSON.stringify({ success: false, error: result.error.join(", ") });
      }
      return JSON.stringify({ success: true });
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) });
    }
  }
}

declare const globalThis: Record<string, unknown>;
globalThis.Liftosaur = LiftosaurWatch;
