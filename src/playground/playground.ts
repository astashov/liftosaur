import { IHistoryRecord, IProgram, ISettings, IStats, IWeight } from "../types";
import {
  PlannerProgram_generateFullText,
  PlannerProgram_evaluateText,
  PlannerProgram_evaluateFull,
} from "../pages/planner/models/plannerProgram";
import {
  Program_nextHistoryRecord,
  Program_runAllFinishDayScripts,
  Program_getDayNumber,
  Program_evaluate,
  Program_getProgramExercise,
  IEvaluatedProgram,
} from "../models/program";
import { Weight_parse } from "../models/weight";
import { LiftohistorySerializer_serialize } from "../liftohistory/liftohistorySerializer";
import { IEither } from "../utils/types";
import { Progress_completeSetAction } from "../models/progress";

export interface IPlaygroundResult {
  workout: string;
  updatedProgramText?: string;
}

export interface IPlaygroundInput {
  programText: string;
  day?: number;
  week?: number;
  commands?: string[];
}

interface IParsedCommand {
  type: "complete_set" | "change_weight" | "change_reps" | "change_rpe" | "set_state_variable" | "finish_workout";
  exerciseIndex: number;
  setIndex: number;
  weight?: IWeight;
  reps?: number;
  rpe?: number;
  varName?: string;
  varValue?: string;
}

function parseCommand(cmd: string): IParsedCommand | undefined {
  const trimmed = cmd.trim();

  if (trimmed === "finish_workout()") {
    return { type: "finish_workout", exerciseIndex: 0, setIndex: 0 };
  }

  const match = trimmed.match(/^(\w+)\((.+)\)$/);
  if (!match) {
    return undefined;
  }
  const [, name, argsStr] = match;
  const args = argsStr.split(",").map((a) => a.trim());

  if (name === "complete_set") {
    if (args.length < 2) {
      return undefined;
    }
    return {
      type: "complete_set",
      exerciseIndex: parseInt(args[0], 10),
      setIndex: parseInt(args[1], 10),
    };
  } else if (name === "change_weight") {
    if (args.length < 3) {
      return undefined;
    }
    const weight = Weight_parse(args[2]);
    if (!weight) {
      return undefined;
    }
    return { type: "change_weight", exerciseIndex: parseInt(args[0], 10), setIndex: parseInt(args[1], 10), weight };
  } else if (name === "change_reps") {
    if (args.length < 3) {
      return undefined;
    }
    return {
      type: "change_reps",
      exerciseIndex: parseInt(args[0], 10),
      setIndex: parseInt(args[1], 10),
      reps: parseInt(args[2], 10),
    };
  } else if (name === "change_rpe") {
    if (args.length < 3) {
      return undefined;
    }
    return {
      type: "change_rpe",
      exerciseIndex: parseInt(args[0], 10),
      setIndex: parseInt(args[1], 10),
      rpe: parseFloat(args[2]),
    };
  } else if (name === "set_state_variable") {
    if (args.length < 3) {
      return undefined;
    }
    return {
      type: "set_state_variable",
      exerciseIndex: parseInt(args[0], 10),
      setIndex: 0,
      varName: args[1],
      varValue: args[2],
    };
  }
  return undefined;
}

function parseStateValue(str: string): number | IWeight {
  const weight = Weight_parse(str);
  if (weight) {
    return weight;
  }
  return parseFloat(str);
}

export function Playground_validateProgramText(
  text: string,
  settings: ISettings
): { line: number; offset: number; from: number; to: number; message: string }[] | undefined {
  const { evaluatedWeeks } = PlannerProgram_evaluateFull(text, settings);
  if (!evaluatedWeeks.success) {
    const err = evaluatedWeeks.error;
    return [{ line: err.line, offset: err.offset, from: err.from, to: err.to, message: err.message }];
  }
  return undefined;
}

export function Playground_run(
  input: IPlaygroundInput,
  settings: ISettings,
  stats: IStats
): IEither<IPlaygroundResult, string> {
  const weeks = PlannerProgram_evaluateText(input.programText);
  const program: IProgram = {
    vtype: "program" as const,
    id: "playground",
    name: "Playground",
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
    planner: { vtype: "planner" as const, name: "Playground", weeks },
  };

  const evaluatedProgram = Program_evaluate(program, settings);

  let dayIndex: number | undefined;
  if (input.day != null) {
    const weekNum = input.week || 1;
    dayIndex = Program_getDayNumber(evaluatedProgram, weekNum, input.day);
  }

  let progress = Program_nextHistoryRecord(program, settings, stats, dayIndex);
  const commands = input.commands || [];
  let finishedWorkout = false;

  for (const cmd of commands) {
    const parsed = parseCommand(cmd);
    if (!parsed) {
      return { success: false, error: `Invalid command: ${cmd}` };
    }

    if (parsed.type === "finish_workout") {
      finishedWorkout = true;
      continue;
    }

    const result = applyCommand(progress, parsed, evaluatedProgram, settings, stats);
    if (!result.success) {
      return result;
    }
    progress = result.data;
  }

  const playgroundResult: IPlaygroundResult = {
    workout: LiftohistorySerializer_serialize(progress, settings),
  };

  if (finishedWorkout) {
    const { program: updatedProgram } = Program_runAllFinishDayScripts(program, progress, stats, settings);
    if (updatedProgram.planner) {
      playgroundResult.updatedProgramText = PlannerProgram_generateFullText(updatedProgram.planner.weeks);
    }
  }

  return { success: true, data: playgroundResult };
}

function checkEntryAndSetExist(progress: IHistoryRecord, exerciseIndex: number, setIndex: number): string | undefined {
  if (!progress.entries[exerciseIndex - 1]) {
    return `Exercise ${exerciseIndex} not found`;
  }
  if (!progress.entries[exerciseIndex - 1].sets[setIndex - 1]) {
    return `Set ${setIndex} not found for exercise ${exerciseIndex}`;
  }
  return undefined;
}

function applyCommand(
  progress: IHistoryRecord,
  parsed: IParsedCommand,
  evaluatedProgram: IEvaluatedProgram,
  settings: ISettings,
  stats: IStats
): IEither<IHistoryRecord, string> {
  const entryIndex = parsed.exerciseIndex - 1;
  const setIndex = parsed.setIndex - 1;

  if (parsed.type === "complete_set") {
    const err = checkEntryAndSetExist(progress, parsed.exerciseIndex, parsed.setIndex);
    if (err) {
      return { success: false, error: err };
    }
    const entry = progress.entries[entryIndex];
    const programExercise = Program_getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId);
    const newProgress = Progress_completeSetAction(
      settings,
      stats,
      progress,
      {
        type: "CompleteSetAction",
        entryIndex,
        setIndex,
        mode: "workout",
        programExercise,
        otherStates: evaluatedProgram.states,
        isPlayground: true,
        forceUpdateEntryIndex: false,
        isExternal: false,
      },
      undefined
    );
    return { success: true, data: newProgress };
  } else if (parsed.type === "change_weight") {
    const err = checkEntryAndSetExist(progress, parsed.exerciseIndex, parsed.setIndex);
    if (err) {
      return { success: false, error: err };
    }
    const newProgress = { ...progress, entries: [...progress.entries] };
    const entry = { ...newProgress.entries[entryIndex], sets: [...newProgress.entries[entryIndex].sets] };
    const set = { ...entry.sets[setIndex] };
    set.weight = parsed.weight!;
    if (set.isCompleted) {
      set.completedWeight = parsed.weight!;
    }
    entry.sets[setIndex] = set;
    newProgress.entries[entryIndex] = entry;
    return { success: true, data: newProgress };
  } else if (parsed.type === "change_reps") {
    const err = checkEntryAndSetExist(progress, parsed.exerciseIndex, parsed.setIndex);
    if (err) {
      return { success: false, error: err };
    }
    const newProgress = { ...progress, entries: [...progress.entries] };
    const entry = { ...newProgress.entries[entryIndex], sets: [...newProgress.entries[entryIndex].sets] };
    const set = { ...entry.sets[setIndex] };
    set.reps = parsed.reps!;
    if (set.isCompleted) {
      set.completedReps = parsed.reps!;
    }
    entry.sets[setIndex] = set;
    newProgress.entries[entryIndex] = entry;
    return { success: true, data: newProgress };
  } else if (parsed.type === "change_rpe") {
    const err = checkEntryAndSetExist(progress, parsed.exerciseIndex, parsed.setIndex);
    if (err) {
      return { success: false, error: err };
    }
    const newProgress = { ...progress, entries: [...progress.entries] };
    const entry = { ...newProgress.entries[entryIndex], sets: [...newProgress.entries[entryIndex].sets] };
    const set = { ...entry.sets[setIndex] };
    set.completedRpe = parsed.rpe!;
    entry.sets[setIndex] = set;
    newProgress.entries[entryIndex] = entry;
    return { success: true, data: newProgress };
  } else if (parsed.type === "set_state_variable") {
    const entry = progress.entries[entryIndex];
    if (!entry) {
      return { success: false, error: `Exercise ${parsed.exerciseIndex} not found` };
    }
    const newProgress = { ...progress, entries: [...progress.entries] };
    const newEntry = { ...entry, state: { ...(entry.state || {}) } };
    newEntry.state[parsed.varName!] = parseStateValue(parsed.varValue!);
    newProgress.entries[entryIndex] = newEntry;
    return { success: true, data: newProgress };
  }

  return { success: true, data: progress };
}
