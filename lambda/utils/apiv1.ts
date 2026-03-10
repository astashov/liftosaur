import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { IDI } from "./di";
import { LiftohistorySerializer_serialize } from "../../src/liftohistory/liftohistorySerializer";
import {
  LiftohistoryDeserializer_deserialize,
  LiftohistorySyntaxError,
} from "../../src/liftohistory/liftohistoryDeserializer";
import {
  PlannerProgram_generateFullText,
  PlannerProgram_evaluateText,
  PlannerProgram_evaluateFull,
  PlannerProgram_fullToWeekEvalResult,
} from "../../src/pages/planner/models/plannerProgram";
import { PlannerSyntaxError } from "../../src/pages/planner/plannerExerciseEvaluator";
import { IPlannerProgramExercise } from "../../src/pages/planner/models/types";
import { IProgram, ISettings, IHistoryRecord, IMuscle, IExerciseKind, ICustomExercise } from "../../src/types";
import { UidFactory_generateUid } from "./generator";
import {
  Program_evaluate,
  Program_getDayNumber,
  Program_getProgramDay,
  Program_getProgramDayUsedExercises,
} from "../../src/models/program";
import {
  Exercise_toKey,
  Exercise_createCustomExercise,
  Exercise_editCustomExercise,
  Exercise_deleteCustomExercise,
} from "../../src/models/exercise";
import { Playground_run, Playground_validateProgramText } from "../../src/playground/playground";
import {
  PlannerStatsUtils_dayApproxTimeMs,
  PlannerStatsUtils_calculateSetResults,
} from "../../src/pages/planner/models/plannerStatsUtils";
import { PlannerProgramExercise_sets } from "../../src/pages/planner/models/plannerProgramExercise";
import { IEither } from "../../src/utils/types";

export interface IApiError {
  status: number;
  code: string;
  message: string;
  details?: { line: number; offset: number; from: number; to: number; message: string }[];
}

type IApiResult<T> = IEither<T, IApiError>;

function err<T>(status: number, code: string, message: string, details?: IApiError["details"]): IApiResult<T> {
  return { success: false, error: { status, code, message, details } };
}

function ok<T>(data: T): IApiResult<T> {
  return { success: true, data };
}

function syntaxErrorDetails(
  errors: (LiftohistorySyntaxError | PlannerSyntaxError)[]
): { line: number; offset: number; from: number; to: number; message: string }[] {
  return errors.map((e) => ({ line: e.line, offset: e.offset, from: e.from, to: e.to, message: e.message }));
}

function parseDate(dateStr: string): string {
  const asNum = Number(dateStr);
  if (!isNaN(asNum) && asNum > 1000000000) {
    return new Date(asNum > 9999999999 ? asNum : asNum * 1000).toISOString();
  }
  return new Date(dateStr).toISOString();
}

function validateProgramText(text: string, settings: ISettings): IApiError | undefined {
  const { evaluatedWeeks } = PlannerProgram_evaluateFull(text, settings);
  if (!evaluatedWeeks.success) {
    return {
      status: 422,
      code: "parse_error",
      message: "Failed to parse program",
      details: syntaxErrorDetails([evaluatedWeeks.error]),
    };
  }
  return undefined;
}

// --- History ---

export interface IGetHistoryParams {
  startDate?: string;
  endDate?: string;
  limit?: string;
  cursor?: string;
}

export async function ApiV1_getHistory(
  userId: string,
  user: ILimitedUserDao,
  params: IGetHistoryParams,
  di: IDI
): Promise<IApiResult<{ records: { id: number; text: string }[]; hasMore: boolean; nextCursor?: number }>> {
  const userDao = new UserDao(di);
  const settings = user.storage.settings;
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const cursor = params.cursor ? parseInt(params.cursor, 10) : undefined;

  let history;
  if (params.startDate) {
    const startDate = parseDate(params.startDate);
    const endDate = params.endDate ? parseDate(params.endDate) : undefined;
    const result = await userDao.getUserAndHistory(userId, startDate, endDate);
    history = result?.storage.history || [];
  } else {
    history = await userDao.getHistoryByUserId(userId, { limit: limit + 1, after: cursor });
  }

  const hasMore = history.length > limit;
  const records = history.slice(0, limit);
  const nextCursor = hasMore && records.length > 0 ? records[records.length - 1].id : undefined;

  return ok({
    records: records.map((r) => ({ id: r.id, text: LiftohistorySerializer_serialize(r, settings) })),
    hasMore,
    nextCursor,
  });
}

export async function ApiV1_createHistory(
  userId: string,
  user: ILimitedUserDao,
  text: string,
  di: IDI
): Promise<IApiResult<{ id: number; text: string }>> {
  const settings = user.storage.settings;
  const result = LiftohistoryDeserializer_deserialize(text, settings);
  if (!result.success) {
    return err(422, "parse_error", "Failed to parse history record", syntaxErrorDetails(result.error));
  }
  if (result.data.historyRecords.length !== 1) {
    return err(400, "invalid_input", "Expected exactly one history record");
  }

  const record = result.data.historyRecords[0];
  const userDao = new UserDao(di);

  if (record.programName && record.programName !== "Adhoc") {
    const linkError = await linkRecordToProgram(record, userId, userDao, settings);
    if (linkError) {
      return { success: false, error: linkError };
    }
  }

  const history = await userDao.getHistoryByUserId(userId);
  user.storage = { ...user.storage, history };
  await userDao.applyStorageUpdate(user, (old) => ({ ...old, history: [...(old.history || []), record] }), [
    userDao.saveHistoryRecord(userId, record),
  ]);

  return ok({ id: record.id, text: LiftohistorySerializer_serialize(record, settings) });
}

async function linkRecordToProgram(
  record: IHistoryRecord,
  userId: string,
  userDao: UserDao,
  settings: ISettings
): Promise<IApiError | undefined> {
  const programs = await userDao.getProgramsByUserId(userId);
  const program = programs.find(
    (p) =>
      p.name.toLowerCase() === record.programName.toLowerCase() ||
      (p.planner?.name && p.planner.name.toLowerCase() === record.programName.toLowerCase())
  );
  if (!program) {
    return {
      status: 400,
      code: "invalid_input",
      message: `Program "${record.programName}" not found. Use list_programs to see available programs.`,
    };
  }

  record.programId = program.id;

  const evaluatedProgram = Program_evaluate(program, settings);
  const week = record.week || 1;
  const dayInWeek = record.dayInWeek || 1;
  const dayNumber = Program_getDayNumber(evaluatedProgram, week, dayInWeek);
  const programDay = Program_getProgramDay(evaluatedProgram, dayNumber);

  if (programDay) {
    record.day = dayNumber;
    if (!record.dayName || record.dayName === "Workout") {
      record.dayName = programDay.name;
    }
    const dayExercises = Program_getProgramDayUsedExercises(programDay);
    for (const entry of record.entries) {
      const entryKey = Exercise_toKey(entry.exercise);
      const match = dayExercises.find((pe) => pe.key === entryKey || pe.key.endsWith(entryKey));
      if (match) {
        entry.programExerciseId = match.key;
      }
    }
  }

  return undefined;
}

export async function ApiV1_updateHistory(
  userId: string,
  user: ILimitedUserDao,
  recordId: number,
  text: string,
  di: IDI
): Promise<IApiResult<{ id: number; text: string }>> {
  const settings = user.storage.settings;
  const result = LiftohistoryDeserializer_deserialize(text, settings);
  if (!result.success) {
    return err(422, "parse_error", "Failed to parse history record", syntaxErrorDetails(result.error));
  }
  if (result.data.historyRecords.length !== 1) {
    return err(400, "invalid_input", "Expected exactly one history record");
  }

  const userDao = new UserDao(di);
  const existing = await userDao.getHistoryByUserId(userId, { ids: [recordId] });
  if (existing.length === 0) {
    return err(404, "not_found", "History record not found");
  }

  const record = { ...result.data.historyRecords[0], id: recordId };

  if (record.programName && record.programName !== "Adhoc") {
    const linkError = await linkRecordToProgram(record, userId, userDao, settings);
    if (linkError) {
      return { success: false, error: linkError };
    }
  }

  const history = await userDao.getHistoryByUserId(userId);
  user.storage = { ...user.storage, history };
  await userDao.applyStorageUpdate(
    user,
    (old) => ({ ...old, history: (old.history || []).map((h) => (h.id === recordId ? record : h)) }),
    [userDao.saveHistoryRecord(userId, record)]
  );

  return ok({ id: record.id, text: LiftohistorySerializer_serialize(record, settings) });
}

export async function ApiV1_deleteHistory(
  userId: string,
  user: ILimitedUserDao,
  recordId: number,
  di: IDI
): Promise<IApiResult<{ deleted: true }>> {
  const userDao = new UserDao(di);
  const existing = await userDao.getHistoryByUserId(userId, { ids: [recordId] });
  if (existing.length === 0) {
    return err(404, "not_found", "History record not found");
  }

  const history = await userDao.getHistoryByUserId(userId);
  user.storage = { ...user.storage, history };
  await userDao.applyStorageUpdate(
    user,
    (old) => ({ ...old, history: (old.history || []).filter((h) => h.id !== recordId) }),
    [userDao.deleteHistoryRecord(userId, recordId)]
  );

  return ok({ deleted: true as const });
}

// --- Programs ---

export async function ApiV1_listPrograms(
  userId: string,
  user: ILimitedUserDao,
  di: IDI
): Promise<IApiResult<{ programs: { id: string; name: string; isCurrent: boolean }[] }>> {
  const userDao = new UserDao(di);
  const programs = await userDao.getProgramsByUserId(userId);
  const currentProgramId = user.storage.currentProgramId;
  return ok({
    programs: programs.map((p) => ({ id: p.id, name: p.name, isCurrent: p.id === currentProgramId })),
  });
}

export async function ApiV1_getProgram(
  userId: string,
  user: ILimitedUserDao,
  programId: string,
  di: IDI
): Promise<IApiResult<{ id: string; name: string; text: string; isCurrent: boolean }>> {
  const resolvedId = programId === "current" ? user.storage.currentProgramId : programId;
  if (!resolvedId) {
    return err(404, "not_found", "No current program set");
  }
  const userDao = new UserDao(di);
  const program = await userDao.getProgram(userId, resolvedId);
  if (!program) {
    return err(404, "not_found", "Program not found");
  }
  if (!program.planner) {
    return err(400, "invalid_input", "Program uses legacy format and cannot be represented as text");
  }
  const text = PlannerProgram_generateFullText(program.planner.weeks);
  const currentProgramId = user.storage.currentProgramId || "";
  return ok({ id: program.id, name: program.name, text, isCurrent: program.id === currentProgramId });
}

export async function ApiV1_createProgram(
  userId: string,
  user: ILimitedUserDao,
  name: string,
  text: string,
  di: IDI
): Promise<IApiResult<{ id: string; name: string; text: string }>> {
  const settings = user.storage.settings;
  const validation = validateProgramText(text, settings);
  if (validation) {
    return { success: false, error: validation };
  }

  const weeks = PlannerProgram_evaluateText(text);
  const program: IProgram = {
    vtype: "program" as const,
    id: UidFactory_generateUid(8),
    name,
    url: "",
    author: "",
    shortDescription: "",
    description: "",
    nextDay: 1,
    exercises: [],
    days: [],
    weeks: [],
    isMultiweek: weeks.length > 1,
    tags: [],
    clonedAt: Date.now(),
    planner: { vtype: "planner" as const, name, weeks },
  };

  const userDao = new UserDao(di);
  const programs = await userDao.getProgramsByUserId(userId);
  user.storage = { ...user.storage, programs };
  await userDao.applyStorageUpdate(user, (old) => ({ ...old, programs: [...(old.programs || []), program] }), [
    userDao.saveProgram(userId, program),
  ]);

  return ok({ id: program.id, name: program.name, text });
}

export async function ApiV1_updateProgram(
  userId: string,
  user: ILimitedUserDao,
  programId: string,
  text: string,
  name: string | undefined,
  di: IDI
): Promise<IApiResult<{ id: string; name: string; text: string; isCurrent: boolean }>> {
  const settings = user.storage.settings;
  const validation = validateProgramText(text, settings);
  if (validation) {
    return { success: false, error: validation };
  }

  const resolvedId = programId === "current" ? user.storage.currentProgramId : programId;
  if (!resolvedId) {
    return err(404, "not_found", "No current program set");
  }
  const userDao = new UserDao(di);
  const existing = await userDao.getProgram(userId, resolvedId);
  if (!existing) {
    return err(404, "not_found", "Program not found");
  }

  const weeks = PlannerProgram_evaluateText(text);
  const updatedProgram: IProgram = {
    ...existing,
    name: name || existing.name,
    planner: {
      vtype: "planner" as const,
      name: name || existing.planner?.name || existing.name,
      weeks,
    },
  };

  const programs = await userDao.getProgramsByUserId(userId);
  user.storage = { ...user.storage, programs };
  await userDao.applyStorageUpdate(
    user,
    (old) => ({ ...old, programs: (old.programs || []).map((p) => (p.id === resolvedId ? updatedProgram : p)) }),
    [userDao.saveProgram(userId, updatedProgram)]
  );

  const currentProgramId = user.storage.currentProgramId || "";
  const resultText = PlannerProgram_generateFullText(updatedProgram.planner!.weeks);
  return ok({
    id: updatedProgram.id,
    name: updatedProgram.name,
    text: resultText,
    isCurrent: updatedProgram.id === currentProgramId,
  });
}

export async function ApiV1_deleteProgram(
  userId: string,
  user: ILimitedUserDao,
  programId: string,
  di: IDI
): Promise<IApiResult<{ deleted: true }>> {
  if (programId === user.storage.currentProgramId) {
    return err(400, "invalid_input", "Cannot delete the current program");
  }
  const userDao = new UserDao(di);
  const existing = await userDao.getProgram(userId, programId);
  if (!existing) {
    return err(404, "not_found", "Program not found");
  }

  const programs = await userDao.getProgramsByUserId(userId);
  user.storage = { ...user.storage, programs };
  await userDao.applyStorageUpdate(
    user,
    (old) => ({ ...old, programs: (old.programs || []).filter((p) => p.id !== programId) }),
    [userDao.deleteProgram(userId, programId)]
  );

  return ok({ deleted: true as const });
}

// --- Playground ---

export interface IPlaygroundParams {
  programText: string;
  day?: number;
  week?: number;
  commands?: string[];
}

export function ApiV1_playground(
  user: ILimitedUserDao,
  params: IPlaygroundParams
): IApiResult<{ workout: string; updatedProgramText?: string }> {
  const settings = user.storage.settings;
  const stats = user.storage.stats || { weight: {}, length: {}, percentage: {} };

  const validationErrors = Playground_validateProgramText(params.programText, settings);
  if (validationErrors) {
    return err(422, "parse_error", "Failed to parse program", validationErrors);
  }

  const result = Playground_run(
    {
      programText: params.programText,
      day: params.day,
      week: params.week,
      commands: params.commands,
    },
    settings,
    stats
  );

  if (!result.success) {
    return err(400, "invalid_input", result.error);
  }

  return ok(result.data);
}

// --- Program Stats ---

export interface IProgramStatsDayInfo {
  name: string;
  approxMinutes: number;
  workingSets: number;
}

export interface IProgramStatsMuscleGroup {
  muscle: string;
  totalSets: number;
  strengthSets: number;
  hypertrophySets: number;
  frequencyPerWeek: number;
  exercises: { name: string; sets: number; isSynergist: boolean }[];
}

export interface IProgramStatsResult {
  days: IProgramStatsDayInfo[];
  totalWeeklySets: number;
  strengthSets: number;
  hypertrophySets: number;
  muscleGroups: IProgramStatsMuscleGroup[];
}

export function ApiV1_programStats(user: ILimitedUserDao, programText: string): IApiResult<IProgramStatsResult> {
  const settings = user.storage.settings;
  const { evaluatedWeeks } = PlannerProgram_evaluateFull(programText, settings);

  if (!evaluatedWeeks.success) {
    return err(422, "parse_error", "Failed to parse program", syntaxErrorDetails([evaluatedWeeks.error]));
  }

  const defaultRestTimer = settings.timers.workout ?? 180;

  const days: IProgramStatsDayInfo[] = [];
  const week1 = evaluatedWeeks.data[0];
  for (let dayIndex = 0; dayIndex < week1.days.length; dayIndex++) {
    const day = week1.days[dayIndex];
    const exercises = day.exercises.filter((e: IPlannerProgramExercise) => !e.notused);
    const timeMs = PlannerStatsUtils_dayApproxTimeMs(exercises, defaultRestTimer);
    const totalSets = exercises.reduce((acc: number, e: IPlannerProgramExercise) => {
      return acc + PlannerProgramExercise_sets(e).reduce((a: number, s) => a + (s.repRange?.numberOfSets ?? 0), 0);
    }, 0);
    days.push({ name: day.name, approxMinutes: Math.round(timeMs / 60000), workingSets: totalSets });
  }

  const weekResults = PlannerProgram_fullToWeekEvalResult(evaluatedWeeks);
  const setResults = PlannerStatsUtils_calculateSetResults(weekResults[0], settings);

  const muscleGroups: IProgramStatsMuscleGroup[] = Object.entries(setResults.muscleGroup)
    .filter(([_, stats]) => stats.strength > 0 || stats.hypertrophy > 0)
    .sort((a, b) => b[1].strength + b[1].hypertrophy - (a[1].strength + a[1].hypertrophy))
    .map(([muscle, stats]) => ({
      muscle,
      totalSets: parseFloat((stats.strength + stats.hypertrophy).toFixed(1)),
      strengthSets: parseFloat(stats.strength.toFixed(1)),
      hypertrophySets: parseFloat(stats.hypertrophy.toFixed(1)),
      frequencyPerWeek: Object.keys(stats.frequency).length,
      exercises: stats.exercises
        .filter((ex) => ex.strengthSets > 0 || ex.hypertrophySets > 0)
        .sort((a, b) => b.strengthSets + b.hypertrophySets - (a.strengthSets + a.hypertrophySets))
        .map((ex) => ({
          name: ex.exerciseName,
          sets: parseFloat((ex.strengthSets + ex.hypertrophySets).toFixed(1)),
          isSynergist: ex.isSynergist,
        })),
    }));

  return ok({
    days,
    totalWeeklySets: setResults.total,
    strengthSets: setResults.strength,
    hypertrophySets: setResults.hypertrophy,
    muscleGroups,
  });
}

// --- Custom Exercises ---

interface ICustomExerciseResponse {
  id: string;
  name: string;
  targetMuscles: string[];
  synergistMuscles: string[];
  types: string[];
}

function formatCustomExercise(e: ICustomExercise): ICustomExerciseResponse {
  return {
    id: e.id,
    name: e.name,
    targetMuscles: e.meta?.targetMuscles || [],
    synergistMuscles: e.meta?.synergistMuscles || [],
    types: e.types || [],
  };
}

export function ApiV1_listCustomExercises(
  user: ILimitedUserDao,
  params: { limit?: string; cursor?: string }
): IApiResult<{ exercises: ICustomExerciseResponse[]; hasMore: boolean; nextCursor?: string }> {
  const exercises = user.storage.settings.exercises || {};
  const all = Object.values(exercises).filter((e): e is ICustomExercise => e != null && !e.isDeleted);
  all.sort((a, b) => a.name.localeCompare(b.name));

  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const cursorIdx = params.cursor ? all.findIndex((e) => e.id === params.cursor) : -1;
  const start = cursorIdx >= 0 ? cursorIdx + 1 : 0;
  const page = all.slice(start, start + limit + 1);
  const hasMore = page.length > limit;
  const result = page.slice(0, limit);
  const nextCursor = hasMore && result.length > 0 ? result[result.length - 1].id : undefined;

  return ok({ exercises: result.map(formatCustomExercise), hasMore, nextCursor });
}

export function ApiV1_getCustomExercise(
  user: ILimitedUserDao,
  exerciseId: string
): IApiResult<ICustomExerciseResponse> {
  const exercises = user.storage.settings.exercises || {};
  const exercise = exercises[exerciseId];
  if (!exercise || exercise.isDeleted) {
    return err(404, "not_found", "Custom exercise not found");
  }
  return ok(formatCustomExercise(exercise));
}

export async function ApiV1_createCustomExercise(
  userId: string,
  user: ILimitedUserDao,
  name: string,
  targetMuscles: IMuscle[],
  synergistMuscles: IMuscle[],
  types: IExerciseKind[],
  di: IDI
): Promise<IApiResult<ICustomExerciseResponse>> {
  if (!name.trim()) {
    return err(400, "invalid_input", "Exercise name is required");
  }

  const exercise = Exercise_createCustomExercise(name.trim(), targetMuscles, synergistMuscles, types);
  const userDao = new UserDao(di);

  await userDao.applyStorageUpdate(user, (old) => ({
    ...old,
    settings: {
      ...old.settings,
      exercises: { ...(old.settings?.exercises || {}), [exercise.id]: exercise },
    },
  }));

  return ok(formatCustomExercise(exercise));
}

export async function ApiV1_updateCustomExercise(
  userId: string,
  user: ILimitedUserDao,
  exerciseId: string,
  fields: { name?: string; targetMuscles?: IMuscle[]; synergistMuscles?: IMuscle[]; types?: IExerciseKind[] },
  di: IDI
): Promise<IApiResult<ICustomExerciseResponse>> {
  const exercises = user.storage.settings.exercises || {};
  const existing = exercises[exerciseId];
  if (!existing || existing.isDeleted) {
    return err(404, "not_found", "Custom exercise not found");
  }

  const newName = fields.name?.trim() ?? existing.name;
  if (!newName) {
    return err(400, "invalid_input", "Exercise name cannot be empty");
  }

  const updated = Exercise_editCustomExercise(
    existing,
    newName,
    fields.targetMuscles ?? existing.meta?.targetMuscles ?? [],
    fields.synergistMuscles ?? existing.meta?.synergistMuscles ?? [],
    fields.types ?? existing.types ?? [],
    existing.smallImageUrl,
    existing.largeImageUrl
  );

  const userDao = new UserDao(di);
  await userDao.applyStorageUpdate(user, (old) => ({
    ...old,
    settings: {
      ...old.settings,
      exercises: { ...(old.settings?.exercises || {}), [exerciseId]: updated },
    },
  }));

  return ok(formatCustomExercise(updated));
}

export async function ApiV1_deleteCustomExercise(
  userId: string,
  user: ILimitedUserDao,
  exerciseId: string,
  di: IDI
): Promise<IApiResult<{ deleted: true }>> {
  const exercises = user.storage.settings.exercises || {};
  const existing = exercises[exerciseId];
  if (!existing || existing.isDeleted) {
    return err(404, "not_found", "Custom exercise not found");
  }

  const updated = Exercise_deleteCustomExercise(exercises, exerciseId);
  const userDao = new UserDao(di);
  await userDao.applyStorageUpdate(user, (old) => ({
    ...old,
    settings: {
      ...old.settings,
      exercises: updated,
    },
  }));

  return ok({ deleted: true as const });
}
