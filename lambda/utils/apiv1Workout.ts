import * as v from "valibot";
import deepmerge from "deepmerge";
import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { IDI } from "./di";
import {
  IHistoryRecord,
  IHistoryEntry,
  ISet,
  IProgram,
  ISettings,
  IStats,
  IUnit,
  IExerciseType,
  IProgressMode,
  IDayData,
  IPercentage,
  IWeight,
  IProgramState,
  VIntervals,
} from "../../src/types";
import {
  Program_evaluate,
  Program_nextHistoryRecordFromEvaluated,
  Program_getDayNumber,
  Program_getProgramExercise,
  Program_numberOfDays,
  Program_getDayData,
  Program_getDayName,
  Program_runAllFinishDayScripts,
  Program_createEmptyProgram,
  emptyProgramId,
  IEvaluatedProgram,
} from "../../src/models/program";
import {
  Progress_completeSetAction,
  Progress_changeAmrapAction,
  Progress_stopTimerPure,
} from "../../src/models/progress";
import { History_finishProgramDay } from "../../src/models/history";
import { Reps_addSet } from "../../src/models/set";
import { Weight_print, Weight_calculatePlates, Weight_parsePct } from "../../src/models/weight";
import { Exercise_get, Exercise_toKey, Exercise_getIsUnilateral } from "../../src/models/exercise";
import { ExerciseImageUtils_url } from "../../src/models/exerciseImage";
import {
  PlannerProgramExercise_getUpdateScript,
  PlannerProgramExercise_currentDescription,
  PlannerProgramExercise_getState,
  PlannerProgramExercise_getStateMetadata,
} from "../../src/pages/planner/models/plannerProgramExercise";
import { IApiError } from "./apiv1";
import { IApiResult, err, ok, VWeightString, MAX_NOTES_LENGTH, issuesToMessage } from "./apiv1Common";
import { IEither } from "../../src/utils/types";
import { ObjectUtils_keys } from "../../src/utils/object";
import { IPlannerProgramExercise } from "../../src/pages/planner/models/types";

export interface IApiWorkoutContext {
  client?: string;
  deviceId?: string;
}

export interface IWorkoutSet {
  setId: string;
  index: number;
  isWarmup: boolean;
  reps: number | null;
  minReps: number | null;
  isAmrap: boolean;
  weight: string | null;
  originalWeight: string | null;
  plates: { weight: string; num: number }[];
  rpe: number | null;
  logRpe: boolean;
  askWeight: boolean;
  isUnilateral: boolean;
  timer: number | null;
  setTimer: number | null;
  completed: {
    reps: number | null;
    repsLeft: number | null;
    weight: string | null;
    rpe: number | null;
    setTimer: number | null;
  } | null;
}

export interface IWorkoutEntry {
  entryId: string;
  exerciseId: string;
  equipment: string | null;
  name: string;
  imageUrl: string | null;
  superset: string | null;
  notes: string | null;
  description: string | null;
  hasUpdateScript: boolean;
  // State variables this exercise prompts the lifter for. A write completing one of its sets must supply a value
  // for each. Numbers stay numbers; weights and percentages are strings ("225lb", "80%"), so the type is
  // inferable from the value — program state is never null.
  promptedVars: { name: string; value: string | number }[];
  warmupSets: IWorkoutSet[];
  sets: IWorkoutSet[];
}

export interface IWorkoutPayload {
  programId: string;
  programName: string;
  dayName: string;
  dayData: Required<IDayData>;
  startTime: number;
  entries: IWorkoutEntry[];
}

export interface IFinishedWorkoutSummary {
  id: number;
  startTime: number;
  endTime: number;
  programId: string;
  programName: string;
  dayName: string;
  nextDay: (Required<IDayData> & { dayName: string }) | null;
}

export interface IWorkoutSettings {
  units: IUnit;
  timers: { warmup: number | null; workout: number | null; superset: number | null };
}

const VCompletedInput = v.object({
  reps: v.optional(v.number()),
  repsLeft: v.optional(v.number()),
  weight: v.optional(VWeightString),
  rpe: v.optional(v.number()),
  setTimer: v.optional(v.number()),
  userVars: v.optional(v.record(v.string(), v.union([v.number(), v.string()]))),
});

// Every set id in the app comes from UidFactory_generateUid(6) — six lowercase letters — including the migration
// that backfilled them (migrations.ts:345). A client minting one for `append` therefore has to match that shape.
// Addressing an *existing* set only bounds the length: a set that exists should stay reachable whatever its id
// looks like, and `set_not_found` is the honest answer when it doesn't.
const VSetIdRef = v.pipe(v.string(), v.minLength(1), v.maxLength(64));
const VNewSetId = v.pipe(
  v.string(),
  v.regex(/^[a-z]{6}$/, "A new setId must be 6 lowercase letters, like the app generates")
);

const VSetWrite = v.object({
  setId: VSetIdRef,
  entryId: v.optional(v.string()),
  append: v.optional(v.boolean()),
  completed: v.optional(v.nullable(VCompletedInput)),
});

const VSetsInput = v.object({ sets: v.array(VSetWrite) });

const VStartInput = v.object({
  programId: v.optional(v.string()),
  week: v.optional(v.number()),
  dayInWeek: v.optional(v.number()),
  startTime: v.optional(v.number()),
});

const VFinishInput = v.object({
  startTime: v.number(),
  endTime: v.optional(v.number()),
  intervals: v.optional(VIntervals),
  notes: v.optional(v.pipe(v.string(), v.maxLength(MAX_NOTES_LENGTH))),
});

const VDiscardInput = v.object({ startTime: v.number() });

type ISetWrite = v.InferOutput<typeof VSetWrite>;

// Both identity headers are required on writes, for different reasons.
//
// The device id is the VersionTracker's node identity, not an attribution hint: without it Storage_updateVersions
// writes bare timestamps instead of vector clocks, and merges silently lose the ability to order concurrent
// changes. A write that omits it degrades sync for every one of the user's devices.
//
// The client string is recorded as `source` on the resulting history record. Provenance cannot be reconstructed
// after the fact, so a workout written without it is permanently unattributable — which is exactly the workout a
// support report will be about.
// Returns the validated identity rather than just an error, so the caller carries a `deviceId: string`
// into the write instead of re-asserting a value this check already guaranteed.
function requireIdentityHeaders(
  apiCtx: IApiWorkoutContext
): { error: IApiError; identity?: undefined } | { error?: undefined; identity: IWorkoutIdentity } {
  const missing = [
    ...(apiCtx.deviceId ? [] : ["X-Liftosaur-Device-Id"]),
    ...(apiCtx.client ? [] : ["X-Liftosaur-Client"]),
  ];
  if (missing.length > 0) {
    return {
      error: {
        status: 400,
        code: "invalid_input",
        message: `${missing.join(" and ")} ${missing.length > 1 ? "headers are" : "header is"} required for writes`,
      },
    };
  }
  return { identity: { deviceId: apiCtx.deviceId!, client: apiCtx.client! } };
}

interface IWorkoutIdentity {
  deviceId: string;
  client: string;
}

interface IWorkoutCtx {
  settings: ISettings;
  stats: IStats;
  program: IProgram;
  evaluated: IEvaluatedProgram;
  progress: IHistoryRecord;
}

// Mirrors the fallback chain in Progress_startTimer (progress.ts:438-447) so a client never has to know it:
// a warmup set always takes the warmup default, and a working set takes its own timer, then the superset default
// when it's in a superset, then the workout default. Returning the raw `set.timer` would hand back `null` for
// every program that doesn't set one explicitly — which is exactly the gap this API was asked to close.
function resolveTimer(set: ISet, settings: ISettings, isWarmup: boolean, isSuperset: boolean): number | null {
  if (isWarmup) {
    return settings.timers.warmup ?? null;
  }
  if (set.timer != null) {
    return set.timer;
  }
  if (isSuperset && settings.timers.superset != null) {
    return settings.timers.superset;
  }
  return settings.timers.workout ?? null;
}

function serializeSet(
  set: ISet,
  exerciseType: IExerciseType,
  settings: ISettings,
  isWarmup: boolean,
  isUnilateral: boolean,
  isSuperset: boolean
): IWorkoutSet {
  const weightForPlates = set.completedWeight ?? set.weight;
  const plates =
    weightForPlates != null
      ? Weight_calculatePlates(weightForPlates, settings, weightForPlates.unit, exerciseType).plates
      : [];
  return {
    setId: set.id,
    index: set.index,
    isWarmup,
    reps: set.reps ?? null,
    minReps: set.minReps ?? null,
    isAmrap: !!set.isAmrap,
    weight: set.weight != null ? Weight_print(set.weight) : null,
    originalWeight: set.originalWeight != null ? Weight_print(set.originalWeight) : null,
    plates: plates.map((p) => ({ weight: Weight_print(p.weight), num: p.num })),
    rpe: set.rpe ?? null,
    logRpe: !!set.logRpe,
    askWeight: !!set.askWeight,
    isUnilateral,
    timer: resolveTimer(set, settings, isWarmup, isSuperset),
    setTimer: set.setTimer ?? null,
    completed: set.isCompleted
      ? {
          reps: set.completedReps ?? null,
          repsLeft: set.completedRepsLeft ?? null,
          weight: set.completedWeight != null ? Weight_print(set.completedWeight) : null,
          rpe: set.completedRpe ?? null,
          setTimer: set.completedSetTimer ?? null,
        }
      : null,
  };
}

function serializeStateValue(value: number | IWeight | IPercentage): string | number {
  return typeof value === "number" ? value : Weight_print(value);
}

function promptedVarsFor(
  programExercise: IPlannerProgramExercise | undefined
): { name: string; value: string | number }[] {
  if (programExercise == null) {
    return [];
  }
  const metadata = PlannerProgramExercise_getStateMetadata(programExercise) || {};
  const state = PlannerProgramExercise_getState(programExercise);
  return ObjectUtils_keys(metadata)
    .filter((name) => metadata[name]?.userPrompted && state[name] != null)
    .map((name) => ({ name, value: serializeStateValue(state[name]) }));
}

function serializeEntry(
  entry: IHistoryEntry,
  progress: IHistoryRecord,
  evaluated: IEvaluatedProgram | undefined,
  settings: ISettings
): IWorkoutEntry {
  const exercise = Exercise_get(entry.exercise, settings.exercises);
  const isUnilateral = Exercise_getIsUnilateral(entry.exercise, settings);
  const isSuperset = entry.superset != null;
  const programExercise = Program_getProgramExercise(progress.day, evaluated, entry.programExerciseId);
  return {
    entryId: entry.id,
    exerciseId: Exercise_toKey(entry.exercise),
    equipment: entry.exercise.equipment ?? null,
    name: exercise.name,
    imageUrl: ExerciseImageUtils_url(exercise, "small", settings) ?? null,
    superset: entry.superset ?? null,
    notes: entry.notes ?? null,
    description: programExercise != null ? (PlannerProgramExercise_currentDescription(programExercise) ?? null) : null,
    hasUpdateScript: programExercise != null ? PlannerProgramExercise_getUpdateScript(programExercise) != null : false,
    promptedVars: promptedVarsFor(programExercise),
    warmupSets: (entry.warmupSets || []).map((s) =>
      serializeSet(s, entry.exercise, settings, true, isUnilateral, isSuperset)
    ),
    sets: entry.sets.map((s) => serializeSet(s, entry.exercise, settings, false, isUnilateral, isSuperset)),
  };
}

function serializeWorkout(
  progress: IHistoryRecord,
  evaluated: IEvaluatedProgram | undefined,
  settings: ISettings
): IWorkoutPayload {
  return {
    programId: progress.programId,
    programName: progress.programName,
    dayName: progress.dayName,
    dayData: {
      day: progress.day,
      week: progress.week ?? 1,
      dayInWeek: progress.dayInWeek ?? progress.day,
    },
    startTime: progress.startTime,
    entries: progress.entries.map((e) => serializeEntry(e, progress, evaluated, settings)),
  };
}

// `getLimitedById` returns `progress` inline in the user row but never `programs`, so only the one program the
// live workout points at is hydrated — not the whole collection. An ad-hoc workout started on the phone points at
// `emptyProgramId`, which is synthesised rather than stored (see `Program_getProgram`).
async function loadProgram(userId: string, di: IDI, programId: string): Promise<IProgram | undefined> {
  if (programId === emptyProgramId) {
    return Program_createEmptyProgram();
  }
  const programs = await new UserDao(di).getProgramsByUserId(userId, { ids: [programId] });
  return programs[0];
}

function findEntryIndexesById(progress: IHistoryRecord, entryId: string): number[] {
  return progress.entries.reduce<number[]>((memo, e, i) => (e.id === entryId ? [...memo, i] : memo), []);
}

// Sets are addressed by `setId` alone: ids are 6-letter uids unique within a workout, while `entryId` is derived
// from the exercise plus its label (`Progress_getEntryId`) and two entries can share one. `entryId` is validated
// when supplied so a client that has drifted gets an error instead of a silent write to the wrong exercise.
function resolveSetTarget(
  progress: IHistoryRecord,
  write: ISetWrite
): IEither<{ entryIndex: number; mode: IProgressMode; setIndex: number }, IApiError> {
  for (let entryIndex = 0; entryIndex < progress.entries.length; entryIndex += 1) {
    const entry = progress.entries[entryIndex];
    const warmupIndex = (entry.warmupSets || []).findIndex((s) => s.id === write.setId);
    const setIndex = entry.sets.findIndex((s) => s.id === write.setId);
    if (warmupIndex === -1 && setIndex === -1) {
      continue;
    }
    if (write.entryId != null && write.entryId !== entry.id) {
      return {
        success: false,
        error: {
          status: 400,
          code: "invalid_input",
          message: `Set '${write.setId}' belongs to entry '${entry.id}', not '${write.entryId}'`,
        },
      };
    }
    return {
      success: true,
      data:
        warmupIndex !== -1
          ? { entryIndex, mode: "warmup", setIndex: warmupIndex }
          : { entryIndex, mode: "workout", setIndex },
    };
  }
  return {
    success: false,
    error: { status: 404, code: "set_not_found", message: `No set '${write.setId}' in the current workout` },
  };
}

function setsKeyFor(mode: IProgressMode): "warmupSets" | "sets" {
  return mode === "warmup" ? "warmupSets" : "sets";
}

// Records what the lifter did onto the set *before* it is completed, so the `update:` script sees the actual
// performance rather than the programmed target. Only `completed*` fields are touched — overwriting the target
// would make progressions that compare completed-vs-target always pass.
function withCompletedValues(set: ISet, completed: v.InferOutput<typeof VCompletedInput>): ISet {
  return {
    ...set,
    ...(completed.reps !== undefined ? { completedReps: completed.reps } : {}),
    ...(completed.repsLeft !== undefined ? { completedRepsLeft: completed.repsLeft } : {}),
    ...(completed.weight !== undefined ? { completedWeight: completed.weight } : {}),
    ...(completed.rpe !== undefined ? { completedRpe: completed.rpe } : {}),
    ...(completed.setTimer !== undefined ? { completedSetTimer: completed.setTimer } : {}),
  };
}

function appendSet(
  progress: IHistoryRecord,
  write: ISetWrite,
  settings: ISettings
): IEither<IHistoryRecord, IApiError> {
  if (write.entryId == null) {
    return {
      success: false,
      error: { status: 400, code: "invalid_input", message: "'entryId' is required when appending a set" },
    };
  }
  const parsedId = v.safeParse(VNewSetId, write.setId);
  if (!parsedId.success) {
    return { success: false, error: { status: 400, code: "invalid_input", message: issuesToMessage(parsedId.issues) } };
  }
  const entryIndexes = findEntryIndexesById(progress, write.entryId);
  if (entryIndexes.length === 0) {
    return {
      success: false,
      error: { status: 404, code: "entry_not_found", message: `No entry '${write.entryId}' in the current workout` },
    };
  }
  if (entryIndexes.length > 1) {
    return {
      success: false,
      error: {
        status: 409,
        code: "ambiguous_entry",
        message: `'${write.entryId}' matches ${entryIndexes.length} exercises in this workout; append is not possible`,
      },
    };
  }
  const entryIndex = entryIndexes[0];
  const entry = progress.entries[entryIndex];
  const isUnilateral = Exercise_getIsUnilateral(entry.exercise, settings);
  const appended = Reps_addSet(entry.sets, isUnilateral, undefined, false);
  const newSets = appended.map((s, i) => (i === appended.length - 1 ? { ...s, id: write.setId } : s));
  const entries = progress.entries.map((e, i) => (i === entryIndex ? { ...e, sets: newSets } : e));
  return { success: true, data: { ...progress, entries } };
}

// Prompted state vars come back as the same shapes they went out as: numbers stay numbers, weights and
// percentages are strings. Names the client didn't supply are collected into `missing` so one error can report
// everything the set is short of, rather than failing one field at a time.
function parsePromptedVars(
  programExercise: IPlannerProgramExercise | undefined,
  supplied: Record<string, string | number> | undefined,
  missing: string[]
): IEither<IProgramState | undefined, IApiError> {
  const prompted = promptedVarsFor(programExercise);
  if (prompted.length === 0) {
    return { success: true, data: undefined };
  }
  const result: IProgramState = {};
  for (const { name } of prompted) {
    const value = supplied?.[name];
    if (value == null) {
      missing.push(`completed.userVars.${name}`);
      continue;
    }
    if (typeof value === "number") {
      result[name] = value;
      continue;
    }
    const parsed = Weight_parsePct(value);
    if (parsed == null) {
      return {
        success: false,
        error: {
          status: 400,
          code: "invalid_input",
          message: `userVars.${name} must be a number or a string like "225lb" or "80%", got "${value}"`,
        },
      };
    }
    result[name] = parsed;
  }
  return { success: true, data: ObjectUtils_keys(result).length > 0 ? result : undefined };
}

function applySetWrite(
  ctx: IWorkoutCtx,
  progress: IHistoryRecord,
  write: ISetWrite,
  onError: (message: string) => void
): IEither<IHistoryRecord, IApiError> {
  const { settings, stats, evaluated } = ctx;
  let current = progress;

  if (write.append) {
    // A replayed append finds its own id already present — a no-op rather than a duplicate set.
    const exists = current.entries.some(
      (e) => e.sets.some((s) => s.id === write.setId) || (e.warmupSets || []).some((s) => s.id === write.setId)
    );
    if (!exists) {
      const appendResult = appendSet(current, write, settings);
      if (!appendResult.success) {
        return appendResult;
      }
      current = appendResult.data;
    }
  }

  const targetResult = resolveSetTarget(current, write);
  if (!targetResult.success) {
    return targetResult;
  }
  const { entryIndex, mode, setIndex } = targetResult.data;
  const setsKey = setsKeyFor(mode);
  const existingSet = current.entries[entryIndex][setsKey][setIndex];
  const wasCompleted = !!existingSet.isCompleted;

  if (write.completed !== undefined && write.completed !== null) {
    const updated = withCompletedValues(existingSet, write.completed);
    const entries = current.entries.map((e, i) =>
      i === entryIndex ? { ...e, [setsKey]: e[setsKey].map((s, j) => (j === setIndex ? updated : s)) } : e
    );
    current = { ...current, entries };
  }

  const shouldToggle =
    (write.completed !== undefined && write.completed !== null && !wasCompleted) ||
    (write.completed === null && wasCompleted);
  if (!shouldToggle) {
    return { success: true, data: current };
  }

  const entry = current.entries[entryIndex];
  const programExercise = Program_getProgramExercise(current.day, evaluated, entry.programExerciseId);
  current = Progress_completeSetAction(
    settings,
    stats,
    current,
    {
      type: "CompleteSetAction",
      entryIndex,
      setIndex,
      mode,
      programExercise,
      otherStates: evaluated.states,
      isPlayground: false,
      forceUpdateEntryIndex: false,
      isExternal: true,
    },
    undefined,
    onError
  );

  // A timed set's first completion only starts its clock; the app records the held time on a second signal. There
  // is no clock on the server, so fire that signal immediately with whatever the client reported holding.
  if (
    current.setTimer != null &&
    current.setTimer.entryIndex === entryIndex &&
    current.setTimer.setIndex === setIndex
  ) {
    const timedSet = current.entries[entryIndex][setsKey][setIndex];
    current = Progress_completeSetAction(
      settings,
      stats,
      current,
      {
        type: "CompleteSetAction",
        entryIndex,
        setIndex,
        mode,
        programExercise,
        otherStates: evaluated.states,
        isPlayground: false,
        forceUpdateEntryIndex: false,
        isExternal: true,
        recordedSeconds: write.completed?.setTimer ?? timedSet.completedSetTimer ?? timedSet.setTimer,
      },
      undefined,
      onError
    );
  }

  // AMRAP / askWeight / logRpe / user-prompted vars open a prompt instead of finishing the set. A UI waits for the
  // lifter; the API answers immediately with what the client sent, falling back to the programmed target.
  if (current.amrapModal != null) {
    const modal = current.amrapModal;
    const modalEntry = current.entries[modal.entryIndex];
    const modalSet = modalEntry.sets[modal.setIndex];
    const modalProgramExercise = Program_getProgramExercise(current.day, evaluated, modalEntry.programExerciseId);
    const isUnilateral = Exercise_getIsUnilateral(modalEntry.exercise, settings);

    // The modal only opens for values the write did not already carry, so whatever it still asks for is genuinely
    // missing. Guessing here is how you get a 0lb set or an AMRAP recorded at its minimum, so require it instead —
    // the payload already tells the client which values a set asks for.
    const missing: string[] = [];
    if (modal.isAmrap && write.completed?.reps == null) {
      missing.push("completed.reps");
    }
    if (modal.isAmrap && isUnilateral && write.completed?.repsLeft == null) {
      missing.push("completed.repsLeft");
    }
    if (modal.askWeight && write.completed?.weight == null) {
      missing.push("completed.weight");
    }
    if (modal.logRpe && write.completed?.rpe == null) {
      missing.push("completed.rpe");
    }

    const userVars = parsePromptedVars(modalProgramExercise, write.completed?.userVars, missing);
    if (!userVars.success) {
      return userVars;
    }
    if (missing.length > 0) {
      return {
        success: false,
        error: {
          status: 400,
          code: "missing_set_input",
          message: `This set asks for values the write didn't supply: ${missing.join(", ")}`,
        },
      };
    }

    current = Progress_changeAmrapAction(
      settings,
      stats,
      current,
      {
        type: "ChangeAMRAPAction",
        entryIndex: modal.entryIndex,
        setIndex: modal.setIndex,
        isPlayground: false,
        programExercise: modalProgramExercise,
        otherStates: evaluated.states,
        amrapValue: modal.isAmrap ? write.completed?.reps : undefined,
        amrapLeftValue: modal.isAmrap && isUnilateral ? write.completed?.repsLeft : undefined,
        logRpe: modal.logRpe,
        rpeValue: modal.logRpe ? write.completed?.rpe : undefined,
        askWeight: modal.askWeight,
        weightValue: modal.askWeight ? (write.completed?.weight ?? modalSet.weight) : undefined,
        userVars: userVars.data,
      },
      undefined,
      onError
    );
  }

  return { success: true, data: current };
}

// `store()` strips stats from the user row, so `user.storage.stats` is always absent here. Scripts that read
// `bodyweight` would silently evaluate against nothing and write wrong progressions, so it has to be fetched.
// Only the last few weigh-ins are needed (`Stats_getCurrentMovingAverageBodyweight` reads a short window), and a
// full stats query on every set write would be far too expensive.
async function loadStats(userId: string, di: IDI): Promise<IStats> {
  return new UserDao(di).getLastBodyweightStats(userId);
}

async function loadWorkoutCtx(userId: string, user: ILimitedUserDao, di: IDI): Promise<IApiResult<IWorkoutCtx>> {
  const progress = user.storage.progress?.[0];
  if (progress == null) {
    return err(404, "no_active_workout", "There is no workout in progress");
  }
  const program = await loadProgram(userId, di, progress.programId);
  if (program == null) {
    return err(404, "not_found", `Program '${progress.programId}' no longer exists`);
  }
  const settings = user.storage.settings;
  const stats = await loadStats(userId, di);
  return ok({ settings, stats, program, evaluated: Program_evaluate(program, settings), progress });
}

export async function ApiV1_getNextWorkout(
  userId: string,
  user: ILimitedUserDao,
  params: { programId?: string; week?: string; dayInWeek?: string },
  di: IDI
): Promise<IApiResult<{ workout: IWorkoutPayload }>> {
  const built = await buildNextWorkout(userId, user, di, {
    programId: params.programId,
    week: params.week != null ? parseInt(params.week, 10) : undefined,
    dayInWeek: params.dayInWeek != null ? parseInt(params.dayInWeek, 10) : undefined,
  });
  if (!built.success) {
    return built;
  }
  const { progress, evaluated, settings } = built.data;
  return ok({ workout: serializeWorkout(progress, evaluated, settings) });
}

async function buildNextWorkout(
  userId: string,
  user: ILimitedUserDao,
  di: IDI,
  input: { programId?: string; week?: number; dayInWeek?: number }
): Promise<
  IApiResult<{ progress: IHistoryRecord; evaluated: IEvaluatedProgram; program: IProgram; settings: ISettings }>
> {
  const settings = user.storage.settings;
  const stats = await loadStats(userId, di);
  const programId = input.programId ?? user.storage.currentProgramId;
  if (programId == null) {
    return err(404, "not_found", "No current program is set");
  }
  const program = await loadProgram(userId, di, programId);
  if (program == null) {
    return err(404, "not_found", `Program '${programId}' not found`);
  }
  const evaluated = Program_evaluate(program, settings);

  let dayIndex: number | undefined;
  if (input.week != null || input.dayInWeek != null) {
    if (input.week == null || input.dayInWeek == null) {
      return err(400, "invalid_input", "'week' and 'dayInWeek' must be provided together");
    }
    dayIndex = Program_getDayNumber(evaluated, input.week, input.dayInWeek);
    if (dayIndex === -1 || dayIndex > Program_numberOfDays(evaluated)) {
      return err(404, "day_not_found", `Week ${input.week} day ${input.dayInWeek} is not in program '${programId}'`);
    }
  }

  const progress = Program_nextHistoryRecordFromEvaluated(evaluated, settings, stats, dayIndex);
  return ok({ progress, evaluated, program, settings });
}

export async function ApiV1_startWorkout(
  userId: string,
  user: ILimitedUserDao,
  input: unknown,
  ctx: IApiWorkoutContext,
  di: IDI
): Promise<IApiResult<{ workout: IWorkoutPayload }>> {
  const identityResult = requireIdentityHeaders(ctx);
  if (identityResult.error) {
    return { success: false, error: identityResult.error };
  }
  const identity = identityResult.identity;
  const parsed = v.safeParse(VStartInput, input ?? {});
  if (!parsed.success) {
    return err(400, "invalid_input", issuesToMessage(parsed.issues));
  }
  const { programId, week, dayInWeek, startTime } = parsed.output;

  const built = await buildNextWorkout(userId, user, di, { programId, week, dayInWeek });
  if (!built.success) {
    return built;
  }
  const requested = built.data;

  const live = user.storage.progress?.[0];
  if (live != null) {
    // A supplied startTime is the workout's identity, so the same day with a different one is a *different*
    // session, not a retry — collapsing them would merge two offline sessions into one.
    const isSame =
      live.programId === requested.progress.programId &&
      live.week === requested.progress.week &&
      live.dayInWeek === requested.progress.dayInWeek &&
      (startTime == null || live.startTime === startTime);
    if (isSame) {
      // A retry whose reply was lost — hand back what it asked for rather than refusing.
      const program = await loadProgram(userId, di, live.programId);
      const evaluated = program != null ? Program_evaluate(program, requested.settings) : undefined;
      return ok({ workout: serializeWorkout(live, evaluated, requested.settings) });
    }
    return err(409, "workout_already_active", "A different workout is already in progress");
  }

  const userDao = new UserDao(di);
  let progress = requested.progress;
  if (startTime != null) {
    const existing = await userDao.getHistoryByUserId(userId, { ids: [startTime] });
    if (existing.length > 0) {
      return err(409, "workout_start_time_taken", `A workout with startTime ${startTime} already exists`);
    }
    progress = { ...progress, startTime, updatedAt: startTime, date: new Date(startTime).toISOString() };
  }
  if (ctx.client != null) {
    progress = { ...progress, source: ctx.client };
  }

  const toStore = progress;
  await userDao.applyStorageUpdate(user, (old) => ({ ...old, progress: [toStore] }), identity.deviceId);
  return ok({ workout: serializeWorkout(toStore, requested.evaluated, requested.settings) });
}

export async function ApiV1_getCurrentWorkout(
  userId: string,
  user: ILimitedUserDao,
  di: IDI
): Promise<IApiResult<{ workout: IWorkoutPayload | null }>> {
  const progress = user.storage.progress?.[0];
  if (progress == null) {
    return ok({ workout: null });
  }
  const loaded = await loadWorkoutCtx(userId, user, di);
  if (!loaded.success) {
    return loaded;
  }
  const ctx = loaded.data;
  return ok({ workout: serializeWorkout(ctx.progress, ctx.evaluated, ctx.settings) });
}

export async function ApiV1_writeSets(
  userId: string,
  user: ILimitedUserDao,
  input: unknown,
  apiCtx: IApiWorkoutContext,
  di: IDI
): Promise<IApiResult<{ workout: IWorkoutPayload }>> {
  const identityResult = requireIdentityHeaders(apiCtx);
  if (identityResult.error) {
    return { success: false, error: identityResult.error };
  }
  const identity = identityResult.identity;
  const parsed = v.safeParse(VSetsInput, input ?? {});
  if (!parsed.success) {
    return err(400, "invalid_input", issuesToMessage(parsed.issues));
  }
  const writes = parsed.output.sets;
  if (writes.length === 0) {
    return err(400, "invalid_input", "'sets' must contain at least one set write");
  }

  const loaded = await loadWorkoutCtx(userId, user, di);
  if (!loaded.success) {
    return loaded;
  }
  const ctx = loaded.data;

  const scriptErrors: string[] = [];
  const onError = (message: string): void => {
    scriptErrors.push(message);
  };

  let progress = ctx.progress;
  for (const write of writes) {
    const result = applySetWrite(ctx, progress, write, onError);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    progress = result.data;
  }

  if (scriptErrors.length > 0) {
    di.log.log("api-v1-workout script error:", scriptErrors.join("; "));
    return err(422, "program_error", scriptErrors[0]);
  }

  const next = progress;
  await new UserDao(di).applyStorageUpdate(user, (old) => ({ ...old, progress: [next] }), identity.deviceId);
  return ok({ workout: serializeWorkout(next, ctx.evaluated, ctx.settings) });
}

function summarize(
  record: IHistoryRecord,
  program: IProgram | undefined,
  settings: ISettings
): IFinishedWorkoutSummary {
  const evaluated = program != null ? Program_evaluate(program, settings) : undefined;
  const nextDay =
    evaluated != null && program != null
      ? {
          ...Program_getDayData(evaluated, program.nextDay),
          dayName: Program_getDayName(evaluated, program.nextDay),
        }
      : null;
  return {
    id: record.id,
    startTime: record.startTime,
    endTime: record.endTime ?? record.startTime,
    programId: record.programId,
    programName: record.programName,
    dayName: record.dayName,
    nextDay,
  };
}

export async function ApiV1_finishWorkout(
  userId: string,
  user: ILimitedUserDao,
  input: unknown,
  apiCtx: IApiWorkoutContext,
  di: IDI
): Promise<IApiResult<{ workout: IFinishedWorkoutSummary }>> {
  const identityResult = requireIdentityHeaders(apiCtx);
  if (identityResult.error) {
    return { success: false, error: identityResult.error };
  }
  const identity = identityResult.identity;
  const parsed = v.safeParse(VFinishInput, input ?? {});
  if (!parsed.success) {
    return err(400, "invalid_input", issuesToMessage(parsed.issues));
  }
  const { startTime, endTime, intervals, notes } = parsed.output;
  const userDao = new UserDao(di);

  const live = user.storage.progress?.[0];
  if (live == null || live.startTime !== startTime) {
    // `startTime` becomes the history record's id on finish, so a replayed finish is a direct id lookup rather
    // than a scan — and answering it with the original summary keeps `finish` idempotent without a key.
    const existing = await userDao.getHistoryByUserId(userId, { ids: [startTime] });
    if (existing.length > 0) {
      const program = await loadProgram(userId, di, existing[0].programId);
      return ok({ workout: summarize(existing[0], program, user.storage.settings) });
    }
    return err(404, "no_active_workout", `No workout in progress with startTime ${startTime}`);
  }

  if (intervals != null && intervals.length > 0 && intervals[0][0] !== startTime) {
    return err(400, "invalid_input", "intervals[0][0] must equal the workout's startTime");
  }

  const loaded = await loadWorkoutCtx(userId, user, di);
  if (!loaded.success) {
    return loaded;
  }
  const ctx = loaded.data;

  const scriptErrors: string[] = [];
  const onError = (message: string): void => {
    scriptErrors.push(message);
  };

  let progress = Progress_stopTimerPure(ctx.progress);
  if (intervals != null) {
    progress = { ...progress, intervals };
  }
  if (notes != null) {
    progress = { ...progress, notes };
  }
  const finishTime = endTime ?? Date.now();
  const record = History_finishProgramDay(progress, ctx.settings, progress.day, ctx.evaluated, ctx.stats, finishTime);
  const { program: newProgram, exerciseData } = Program_runAllFinishDayScripts(
    ctx.program,
    progress,
    ctx.stats,
    ctx.settings,
    onError
  );

  if (scriptErrors.length > 0) {
    di.log.log("api-v1-workout finish script error:", scriptErrors.join("; "));
    return err(422, "program_error", scriptErrors[0]);
  }

  // History first, progress cleared second. `applyStorageUpdate` fires the row write and its side effects through
  // one `Promise.all`, so a partial failure here would otherwise leave the workout neither live nor in history —
  // and the replay-by-startTime path above depends on the record existing.
  await userDao.saveHistoryRecord(userId, record);

  const history = await userDao.getHistoryByUserId(userId);
  user.storage = { ...user.storage, history };
  await userDao.applyStorageUpdate(
    user,
    (old) => ({
      ...old,
      progress: [],
      history: [record, ...(old.history || []).filter((h) => h.id !== record.id)],
      settings: {
        // Finish-day scripts emit only `{rm1}` per exercise, but IExerciseDataValue also holds rounding,
        // equipment overrides and notes — a shallow merge would drop those for every exercise whose 1RM moved.
        ...old.settings,
        exerciseData: deepmerge(old.settings.exerciseData || {}, exerciseData),
      },
    }),
    identity.deviceId,
    // An ad-hoc workout's program is synthesised, not stored — persisting it would add a phantom "Ad-Hoc Workout"
    // to the user's program list.
    newProgram.id === emptyProgramId ? undefined : [userDao.saveProgram(userId, newProgram)]
  );

  return ok({ workout: summarize(record, newProgram, ctx.settings) });
}

export async function ApiV1_discardWorkout(
  userId: string,
  user: ILimitedUserDao,
  input: unknown,
  apiCtx: IApiWorkoutContext,
  di: IDI
): Promise<IApiResult<{ discarded: true }>> {
  const identityResult = requireIdentityHeaders(apiCtx);
  if (identityResult.error) {
    return { success: false, error: identityResult.error };
  }
  const identity = identityResult.identity;
  const parsed = v.safeParse(VDiscardInput, input ?? {});
  if (!parsed.success) {
    return err(400, "invalid_input", issuesToMessage(parsed.issues));
  }
  const live = user.storage.progress?.[0];
  if (live == null) {
    return err(404, "no_active_workout", "There is no workout in progress");
  }
  if (live.startTime !== parsed.output.startTime) {
    return err(409, "workout_mismatch", "The workout in progress is not the one you asked to discard");
  }
  await new UserDao(di).applyStorageUpdate(user, (old) => ({ ...old, progress: [] }), identity.deviceId);
  return ok({ discarded: true });
}

export function ApiV1_getWorkoutSettings(user: ILimitedUserDao): IApiResult<IWorkoutSettings> {
  const settings = user.storage.settings;
  return ok({
    units: settings.units,
    timers: {
      warmup: settings.timers.warmup ?? null,
      workout: settings.timers.workout ?? null,
      superset: settings.timers.superset ?? null,
    },
  });
}
