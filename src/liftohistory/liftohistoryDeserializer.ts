import { SyntaxNode } from "@lezer/common";
import { parser as liftohistoryParser } from "./liftohistoryParser";
import {
  WorkoutRecord,
  Date as DateTerm,
  MetadataField,
  Keyword,
  MetadataValue,
  QuotedString,
  Duration,
  Int,
  ExerciseLine,
  ExerciseName,
  ExerciseSection,
  ExerciseProperty,
  CompletedSets,
  ExerciseSet,
  Rpe,
  PosNumber,
  AmrapMarker,
  SetPart,
  Rep,
  UnilateralReps,
  RepRange,
  Weight,
  SetLabel,
  LineComment,
  Float,
  NonSeparator,
} from "./liftohistoryParser.terms";
import { IHistoryRecord, IHistoryEntry, ISet, ISettings, ICustomExercise, IExerciseType } from "../types";
import { Exercise_findByNameAndEquipment, Exercise_createCustomExercise } from "../models/exercise";
import { Weight_parse } from "../models/weight";
import { UidFactory_generateUid } from "../utils/generator";
import { StringUtils_dashcase } from "../utils/string";
import { emptyProgramId } from "../models/program";
import { IEither } from "../utils/types";
import { Progress_getEntryId } from "../models/progress";
import { PlannerExerciseEvaluator } from "../pages/planner/plannerExerciseEvaluator";

export class LiftohistorySyntaxError extends SyntaxError {
  public readonly line: number;
  public readonly offset: number;
  public readonly from: number;
  public readonly to: number;

  constructor(message: string, line: number, offset: number, from: number, to: number) {
    super(message);
    this.line = line;
    this.offset = offset;
    this.from = from;
    this.to = to;
  }

  public toString(): string {
    return `${this.message}: (${this.line}:${this.offset})`;
  }
}

export type ILiftohistoryEvalResult = IEither<
  { historyRecords: IHistoryRecord[]; customExercises: Record<string, ICustomExercise> },
  LiftohistorySyntaxError[]
>;

export function LiftohistoryDeserializer_deserialize(text: string, settings: ISettings): ILiftohistoryEvalResult {
  const tree = liftohistoryParser.parse(text);
  const errors: LiftohistorySyntaxError[] = [];
  const customExercises: Record<string, ICustomExercise> = {};
  const historyRecords: IHistoryRecord[] = [];

  const topNode = tree.topNode;
  checkForErrors(topNode, text, errors);
  if (errors.length > 0) {
    return { success: false, error: errors };
  }

  for (const child of getChildren(topNode)) {
    if (child.type.id === WorkoutRecord) {
      const result = deserializeWorkoutRecord(child, text, settings, customExercises, errors);
      if (result) {
        historyRecords.push(result);
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors };
  }
  return { success: true, data: { historyRecords, customExercises } };
}

function getValue(node: SyntaxNode, text: string): string {
  return text.slice(node.from, node.to);
}

function getChildren(node: SyntaxNode): SyntaxNode[] {
  const cur = node.cursor();
  const result: SyntaxNode[] = [];
  if (!cur.firstChild()) {
    return result;
  }
  do {
    result.push(cur.node);
  } while (cur.nextSibling());
  return result;
}

function syntaxError(text: string, node: SyntaxNode, message: string): LiftohistorySyntaxError {
  const [line, offset] = PlannerExerciseEvaluator.getLineAndOffset(text, node);
  return new LiftohistorySyntaxError(`${message} (${line}:${offset})`, line, offset, node.from, node.to);
}

function checkForErrors(node: SyntaxNode, text: string, errors: LiftohistorySyntaxError[]): void {
  const cursor = node.cursor();
  do {
    if (cursor.node.type.isError) {
      errors.push(syntaxError(text, cursor.node, "Syntax error"));
    }
  } while (cursor.next());
}

function deserializeWorkoutRecord(
  node: SyntaxNode,
  text: string,
  settings: ISettings,
  customExercises: Record<string, ICustomExercise>,
  errors: LiftohistorySyntaxError[]
): IHistoryRecord | undefined {
  const children = getChildren(node);
  const dateNode = children.find((c) => c.type.id === DateTerm);
  if (!dateNode) {
    errors.push(syntaxError(text, node, "Missing date"));
    return undefined;
  }

  const dateStr = getValue(dateNode, text);
  const normalizedDate = dateStr.replace(/\s/g, "").replace(/^(\d{4}-\d{2}-\d{2})(\d{2})/, "$1T$2");
  const parsedDate = new Date(normalizedDate);
  if (isNaN(parsedDate.getTime())) {
    errors.push(syntaxError(text, dateNode, `Invalid date "${dateStr}"`));
    return undefined;
  }

  const metadata: Record<string, string> = {};
  for (const child of children) {
    if (child.type.id === MetadataField) {
      const kw = child.getChild(Keyword);
      const mv = child.getChild(MetadataValue);
      if (kw && mv) {
        const key = getValue(kw, text);
        const qs = mv.getChild(QuotedString);
        const val = qs ? getValue(qs, text).slice(1, -1) : getValue(mv, text);
        metadata[key] = val;
      }
    }
  }

  const programName = metadata.program || "";
  const isAdhoc = !programName;
  const programId = isAdhoc ? emptyProgramId : StringUtils_dashcase(programName);

  let day = 1;
  let dayName = "";
  let week: number | undefined;
  let dayInWeek: number | undefined;

  if (metadata.day != null) {
    day = parseInt(metadata.day, 10) || 1;
  }
  if (metadata.dayName != null) {
    dayName = metadata.dayName;
  }
  if (metadata.week != null) {
    week = parseInt(metadata.week, 10) || 1;
  }
  if (metadata.dayInWeek != null) {
    dayInWeek = parseInt(metadata.dayInWeek, 10) || 1;
  }

  let durationSec: number | undefined;
  if (metadata.duration) {
    durationSec = parseInt(metadata.duration.replace(/s$/, ""), 10);
  }

  const workoutNotes = collectWorkoutNotes(node, text);

  const entries: IHistoryEntry[] = [];
  const usedEntryIds = new Set<string>();
  const workoutBody = children.filter((c) => c.type.id === ExerciseLine || c.type.id === LineComment);
  let pendingComments: SyntaxNode[] = [];
  for (const child of workoutBody) {
    if (child.type.id === LineComment) {
      pendingComments.push(child);
    } else if (child.type.id === ExerciseLine) {
      const exerciseNotes = commentsToString(pendingComments, text);
      pendingComments = [];
      const entry = deserializeExerciseLine(child, text, settings, customExercises, entries.length, exerciseNotes);
      if (entry && entry.id) {
        if (usedEntryIds.has(entry.id)) {
          errors.push(syntaxError(text, child, `Duplicate exercise "${getValue(child, text).trim()}"`));
        } else {
          usedEntryIds.add(entry.id);
          entries.push(entry);
        }
      }
    }
  }

  const startTime = parsedDate.getTime();
  const endTime = durationSec != null ? startTime + durationSec * 1000 : undefined;

  return {
    vtype: "history_record",
    date: parsedDate.toISOString(),
    programId,
    programName: programName || "Adhoc",
    day,
    dayName: dayName || "Workout",
    entries,
    startTime,
    id: startTime,
    endTime,
    week,
    dayInWeek,
    notes: workoutNotes || undefined,
  };
}

function collectWorkoutNotes(workoutNode: SyntaxNode, text: string): string {
  let prev = workoutNode.prevSibling;
  const collected: SyntaxNode[] = [];
  while (prev && prev.type.id === LineComment) {
    collected.unshift(prev);
    prev = prev.prevSibling;
  }
  return commentsToString(collected, text);
}

function commentsToString(commentNodes: SyntaxNode[], text: string): string {
  const lines = commentNodes.map((c) => {
    let line = getValue(c, text).replace(/\r?\n$/, "");
    line = line.replace(/^\s*\/\//, "");
    return line;
  });
  const minIndent = lines.reduce<number | undefined>((memo, line) => {
    const match = line.match(/^(\s*)\S/);
    if (match != null) {
      const spaces = match[1].length;
      if (memo == null || spaces < memo) {
        return spaces;
      }
    }
    return memo;
  }, undefined);
  return lines.map((line) => (line.trim() === "" ? "" : line.slice(minIndent || 0))).join("\n");
}

function deserializeExerciseLine(
  node: SyntaxNode,
  text: string,
  settings: ISettings,
  customExercises: Record<string, ICustomExercise>,
  index: number,
  notes: string
): IHistoryEntry | undefined {
  const children = getChildren(node);
  const nameNode = children.find((c) => c.type.id === ExerciseName);
  if (!nameNode) {
    return undefined;
  }

  const exerciseName = getValue(nameNode, text).trim();

  const allCustomExercises = { ...settings.exercises, ...customExercises };
  const exercise = Exercise_findByNameAndEquipment(exerciseName, allCustomExercises);
  let exerciseType: IExerciseType;
  if (exercise) {
    exerciseType = { id: exercise.id, equipment: exercise.equipment };
  } else {
    const id = UidFactory_generateUid(8);
    customExercises[id] = Exercise_createCustomExercise(exerciseName, [], [], []);
    exerciseType = { id };
  }

  let completedSets: ISet[] = [];
  let warmupSets: ISet[] = [];
  let targetSets: ISet[] = [];

  const sections = children.filter((c) => c.type.id === ExerciseSection);
  for (const section of sections) {
    const sectionChildren = getChildren(section);
    const propNode = sectionChildren.find((c) => c.type.id === ExerciseProperty);
    if (propNode) {
      const kw = propNode.getChild(Keyword);
      const cs = propNode.getChild(CompletedSets);
      if (kw && cs) {
        const keyword = getValue(kw, text);
        if (keyword === "warmup") {
          warmupSets = deserializeSetsAsCompleted(cs, text);
        } else if (keyword === "target") {
          targetSets = deserializeSetsAsTarget(cs, text);
        }
      }
    } else {
      const csNode = sectionChildren.find((c) => c.type.id === CompletedSets);
      if (csNode) {
        completedSets = deserializeSetsAsCompleted(csNode, text);
      }
    }
  }

  const sets = mergeSets(completedSets, targetSets);

  return {
    vtype: "history_entry",
    id: Progress_getEntryId(exerciseType),
    exercise: exerciseType,
    index,
    sets,
    warmupSets,
    notes: notes || undefined,
  };
}

interface IParsedSet {
  count?: number;
  reps?: number;
  minReps?: number;
  repsLeft?: number;
  weight?: string;
  askWeight?: boolean;
  rpe?: number;
  logRpe?: boolean;
  isAmrap?: boolean;
  timer?: number;
  label?: string;
}

function parseExerciseSet(node: SyntaxNode, text: string): IParsedSet {
  const children = getChildren(node);
  const result: IParsedSet = {};

  for (const child of children) {
    switch (child.type.id) {
      case SetPart: {
        const setParts = getChildren(child);
        const repNodes = setParts.filter((c) => c.type.id === Rep);
        if (repNodes.length > 0) {
          result.count = parseInt(getValue(repNodes[0], text), 10);
        }
        const uniNode = setParts.find((c) => c.type.id === UnilateralReps);
        if (uniNode) {
          const uniReps = getChildren(uniNode).filter((c) => c.type.id === Rep);
          if (uniReps.length >= 2) {
            result.reps = parseInt(getValue(uniReps[0], text), 10);
            result.repsLeft = parseInt(getValue(uniReps[1], text), 10);
          }
        } else {
          const rangeNode = setParts.find((c) => c.type.id === RepRange);
          if (rangeNode) {
            const rangeReps = getChildren(rangeNode).filter((c) => c.type.id === Rep);
            if (rangeReps.length >= 2) {
              result.minReps = parseInt(getValue(rangeReps[0], text), 10);
              result.reps = parseInt(getValue(rangeReps[1], text), 10);
            }
          } else if (repNodes.length > 1) {
            result.reps = parseInt(getValue(repNodes[1], text), 10);
          }
        }
        if (setParts.find((c) => c.type.id === AmrapMarker)) {
          result.isAmrap = true;
        }
        break;
      }
      case Weight: {
        const weightStr = getValue(child, text);
        if (weightStr.endsWith("+")) {
          result.weight = weightStr.slice(0, -1);
          result.askWeight = true;
        } else {
          result.weight = weightStr;
        }
        break;
      }
      case Rpe: {
        const posNode = child.getChild(PosNumber);
        if (posNode) {
          const floatNode = posNode.getChild(Float);
          const intNode = posNode.getChild(Int);
          if (floatNode) {
            result.rpe = parseFloat(getValue(floatNode, text));
          } else if (intNode) {
            result.rpe = parseInt(getValue(intNode, text), 10);
          }
        }
        if (child.getChild(AmrapMarker)) {
          result.logRpe = true;
        }
        break;
      }
      case Duration: {
        result.timer = parseInt(getValue(child, text).replace(/s$/, ""), 10);
        break;
      }
      case SetLabel: {
        const labelParts = getChildren(child)
          .filter((c) => c.type.id === NonSeparator)
          .map((c) => getValue(c, text));
        result.label = labelParts.join(" ");
        break;
      }
    }
  }
  return result;
}

function deserializeSetsAsCompleted(node: SyntaxNode, text: string): ISet[] {
  const sets: ISet[] = [];
  const exerciseSets = getChildren(node).filter((c) => c.type.id === ExerciseSet);
  for (const esNode of exerciseSets) {
    const parsed = parseExerciseSet(esNode, text);
    const count = parsed.count || 1;
    for (let i = 0; i < count; i++) {
      sets.push({
        vtype: "set",
        id: UidFactory_generateUid(6),
        index: sets.length,
        completedReps: parsed.reps,
        completedWeight: parsed.weight ? Weight_parse(parsed.weight) : undefined,
        completedRpe: parsed.rpe,
        isAmrap: parsed.isAmrap,
        label: parsed.label,
        isUnilateral: parsed.repsLeft != null ? true : undefined,
        completedRepsLeft: parsed.repsLeft,
        isCompleted: true,
      });
    }
  }
  return sets;
}

function deserializeSetsAsTarget(node: SyntaxNode, text: string): ISet[] {
  const sets: ISet[] = [];
  const exerciseSets = getChildren(node).filter((c) => c.type.id === ExerciseSet);
  for (const esNode of exerciseSets) {
    const parsed = parseExerciseSet(esNode, text);
    const count = parsed.count || 1;
    for (let i = 0; i < count; i++) {
      sets.push({
        vtype: "set",
        id: UidFactory_generateUid(6),
        index: sets.length,
        reps: parsed.reps,
        minReps: parsed.minReps,
        weight: parsed.weight ? Weight_parse(parsed.weight) : undefined,
        askWeight: parsed.askWeight || undefined,
        rpe: parsed.rpe,
        logRpe: parsed.logRpe || undefined,
        isAmrap: parsed.isAmrap || undefined,
        timer: parsed.timer,
        label: parsed.label || undefined,
      });
    }
  }
  return sets;
}

function mergeSets(completedSets: ISet[], targetSets: ISet[]): ISet[] {
  if (targetSets.length === 0) {
    return completedSets;
  }
  if (completedSets.length === 0) {
    return targetSets;
  }
  const result: ISet[] = [];
  const maxLen = Math.max(completedSets.length, targetSets.length);
  for (let i = 0; i < maxLen; i++) {
    const completed = i < completedSets.length ? completedSets[i] : undefined;
    const target = i < targetSets.length ? targetSets[i] : undefined;
    if (completed && target) {
      result.push({
        ...completed,
        reps: target.reps,
        minReps: target.minReps,
        weight: target.weight,
        askWeight: target.askWeight,
        rpe: target.rpe,
        logRpe: target.logRpe,
        isAmrap: target.isAmrap || completed.isAmrap,
        timer: target.timer,
        label: target.label || completed.label,
      });
    } else if (completed) {
      result.push(completed);
    } else if (target) {
      result.push(target);
    }
  }
  return result;
}
