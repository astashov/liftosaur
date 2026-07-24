import { IHistoryRecord, IHistoryEntry, ISet, ISettings, IProgram } from "../types";
import { Exercise_get, Exercise_fullName } from "../models/exercise";
import { Weight_print } from "../models/weight";
import { emptyProgramId, Program_evaluate, Program_isEmpty } from "../models/program";
import { n } from "../utils/math";
import { Reps_groupConsecutive, Reps_completedSetKey, Reps_targetSetKey } from "../models/set";
import { History_workoutTime } from "../models/history";

export function LiftohistorySerializer_serialize(
  historyRecord: IHistoryRecord,
  settings: ISettings,
  program?: IProgram
): string {
  return serializeWorkoutRecord(historyRecord, settings, program);
}

function formatNotes(notes: string, indent: string): string {
  return notes
    .split("\n")
    .map((line) => `${indent}// ${line}`)
    .join("\n");
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absOff = Math.abs(offset);
  const hh = String(Math.floor(absOff / 60)).padStart(2, "0");
  const mm = String(absOff % 60).padStart(2, "0");
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${mins}:${secs} ${sign}${hh}:${mm}`;
}

function serializeWorkoutRecord(record: IHistoryRecord, settings: ISettings, program?: IProgram): string {
  const lines: string[] = [];
  if (record.notes) {
    lines.push(formatNotes(record.notes, ""));
  }

  const isAdhoc = program ? Program_isEmpty(program) : record.programId === emptyProgramId;
  let isMultiWeek = true;
  if (program && !isAdhoc) {
    const evaluatedProgram = program && !isAdhoc ? Program_evaluate(program, settings) : undefined;
    if (evaluatedProgram) {
      isMultiWeek = evaluatedProgram.weeks.length > 1;
    }
  }

  let header = formatDate(record.date);
  if (!isAdhoc) {
    header += ` / program: "${record.programName}"`;
    if (isMultiWeek) {
      header += ` / dayName: "${record.dayName}"`;
      header += ` / week: ${record.week}`;
      header += ` / dayInWeek: ${record.dayInWeek}`;
    } else {
      header += ` / day: ${record.day}`;
    }
  }
  if (record.endTime) {
    const durationMs = History_workoutTime(record);
    header += ` / duration: ${Math.round(durationMs / 1000)}s`;
  }
  header += ` / exercises: {`;
  lines.push(header);

  for (const entry of record.entries) {
    const hasCompletedSets = entry.sets.some((s) => s.completedReps != null);
    if (!hasCompletedSets) {
      continue;
    }
    if (entry.notes) {
      lines.push(formatNotes(entry.notes, "  "));
    }
    lines.push(`  ${serializeEntry(entry, settings)}`);
  }

  lines.push("}");
  return lines.join("\n");
}

function serializeEntry(entry: IHistoryEntry, settings: ISettings): string {
  const exercise = Exercise_get(entry.exercise, settings.exercises);
  let line = Exercise_fullName(exercise, settings);

  const completedStr = serializeCompletedSets(entry.sets);
  if (completedStr) {
    line += ` / ${completedStr}`;
  }

  const warmupStr = serializeCompletedSets(entry.warmupSets);
  if (warmupStr) {
    line += ` / warmup: ${warmupStr}`;
  }

  const targetStr = serializeTargetSets(entry.sets);
  if (targetStr) {
    line += ` / target: ${targetStr}`;
  }

  return line;
}

function serializeCompletedSets(sets: ISet[]): string {
  const completed = sets.filter((s) => s.completedReps != null);
  if (completed.length === 0) {
    return "";
  }
  const groups = Reps_groupConsecutive(completed, Reps_completedSetKey);
  return groups.map(([set, count]) => formatCompletedSet(set, count)).join(", ");
}

function formatCompletedSet(set: ISet, count: number): string {
  const reps = set.completedReps ?? 0;
  let str = `${count}x`;
  if (set.isUnilateral && set.completedRepsLeft != null) {
    str += `${reps}|${set.completedRepsLeft}`;
  } else {
    str += `${reps}`;
  }
  if (set.completedWeight) {
    str += ` ${Weight_print(set.completedWeight)}`;
  }
  if (set.completedRpe != null) {
    str += ` @${n(set.completedRpe)}`;
  }
  if (set.label) {
    str += ` (${set.label})`;
  }
  return str;
}

function serializeTargetSets(sets: ISet[]): string {
  const withTargets = sets.filter((s) => s.reps != null || s.weight != null);
  if (withTargets.length === 0) {
    return "";
  }
  const groups = Reps_groupConsecutive(withTargets, Reps_targetSetKey);
  return groups.map(([set, count]) => formatTargetSet(set, count)).join(", ");
}

function formatTargetSet(set: ISet, count: number): string {
  const reps = set.reps ?? 0;
  let str = `${count}x`;
  if (set.minReps != null) {
    str += `${set.minReps}-`;
  }
  str += `${reps}`;
  if (set.isAmrap) {
    str += "+";
  }
  if (set.weight) {
    str += ` ${Weight_print(set.weight)}`;
    if (set.askWeight) {
      str += "+";
    }
  }
  if (set.rpe != null) {
    str += ` @${n(set.rpe)}`;
    if (set.logRpe) {
      str += "+";
    }
  }
  if (set.timer != null) {
    str += ` ${set.timer}s`;
  }
  if (set.label) {
    str += ` (${set.label})`;
  }
  return str;
}
