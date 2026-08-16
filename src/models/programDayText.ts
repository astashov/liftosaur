import {
  PlannerProgram_evaluate,
  PlannerProgram_replaceExercise,
  PlannerProgram_thrownErrorMessage,
} from "../pages/planner/models/plannerProgram";
import { PlannerEvaluator_changeExerciseName } from "../pages/planner/plannerEvaluator";
import type { IPlannerEvalResult } from "../pages/planner/plannerExerciseEvaluator";
import type { IPlannerProgramExercise } from "../pages/planner/models/types";
import type { IDayData, IExerciseType, IPlannerProgram, ISettings } from "../types";
import type { IProgramExerciseSwapScope } from "./programExerciseSwap";
import { ProgramExerciseText_cleanErrorMessage, type IProgramExerciseTextError } from "./programExerciseText";

export interface IProgramDayTextRename {
  oldKey: string;
  newKey: string;
  // Set when the new name collided with another exercise in the program and was labelled apart,
  // which is worth telling the user — a label they didn't type appearing in their program is
  // otherwise unexplainable.
  label?: string;
}

export interface IProgramDayTextIdentityChange {
  oldName: string;
  newName: string;
  // How many days declare the exercise being changed. Above one, "this day" and "everywhere"
  // are different edits and only the caller can say which was meant.
  declarations: number;
  // A ladder's rungs live in the text and are applied as written, so scope doesn't reach it —
  // asking which days to apply it to would be asking a question whose answer is then ignored.
  isLadder: boolean;
}

export interface IProgramDayTextApplied {
  planner: IPlannerProgram;
  // Declarations whose identity changed, so a caller holding an in-progress workout can carry
  // logged sets across. Only ever populated for an unambiguous change — see detectIdentityChange.
  renames: IProgramDayTextRename[];
}

interface IDayLocation {
  weekIndex: number;
  dayIndex: number;
}

// The mechanical half of an apply, on its own for the live view: a sheet showing what the draft
// currently evaluates to wants the splice without the renames and program-wide rewrites, which
// only make sense once the user commits.
export function ProgramDayText_replace(
  planner: IPlannerProgram,
  dayData: Required<IDayData>,
  exerciseText: string
): IPlannerProgram {
  return withDayText(planner, { weekIndex: dayData.week - 1, dayIndex: dayData.dayInWeek - 1 }, exerciseText);
}

function withDayText(planner: IPlannerProgram, location: IDayLocation, exerciseText: string): IPlannerProgram {
  return {
    ...planner,
    weeks: planner.weeks.map((week, weekIndex) =>
      weekIndex !== location.weekIndex
        ? week
        : {
            ...week,
            days: week.days.map((day, dayIndex) => (dayIndex !== location.dayIndex ? day : { ...day, exerciseText })),
          }
    ),
  };
}

// The evaluator throws on some malformed programs rather than returning a result, and a program
// that was already broken before this edit is not something the edit has to answer for — so a
// failure to evaluate is an absent baseline, not an error.
function evaluateWeeks(planner: IPlannerProgram, settings: ISettings): IPlannerEvalResult[][] | undefined {
  try {
    return PlannerProgram_evaluate(planner, settings).evaluatedWeeks;
  } catch (e) {
    return undefined;
  }
}

function errorAt(weeks: IPlannerEvalResult[][], location: IDayLocation): IProgramExerciseTextError | undefined {
  const result = weeks[location.weekIndex]?.[location.dayIndex];
  return result != null && !result.success
    ? {
        message: ProgramExerciseText_cleanErrorMessage(result.error.message),
        from: result.error.from,
        to: result.error.to,
      }
    : undefined;
}

function exercisesAt(weeks: IPlannerEvalResult[][] | undefined, location: IDayLocation): IPlannerProgramExercise[] {
  const result = weeks?.[location.weekIndex]?.[location.dayIndex];
  return result != null && result.success ? result.data : [];
}

// An error this edit is responsible for: one on a day that evaluated cleanly beforehand. A day
// that was already failing stays the user's problem to fix where they made it, not a reason to
// refuse an unrelated edit somewhere else. Day text edits can't add or remove days, so the two
// evaluations are index-comparable.
function introducedError(
  before: IPlannerEvalResult[][] | undefined,
  after: IPlannerEvalResult[][]
): IProgramExerciseTextError | undefined {
  if (before == null) {
    return undefined;
  }
  for (let weekIndex = 0; weekIndex < after.length; weekIndex += 1) {
    for (let dayIndex = 0; dayIndex < after[weekIndex].length; dayIndex += 1) {
      const now = after[weekIndex][dayIndex];
      const was = before[weekIndex]?.[dayIndex];
      if (now != null && !now.success && was != null && was.success) {
        return { message: ProgramExerciseText_cleanErrorMessage(now.error.message) };
      }
    }
  }
  return undefined;
}

// Which declaration became which. Derived from the day's key sets rather than tracked as the
// user types, so it can only answer where the answer is unambiguous: exactly one key gone and
// exactly one arrived. Any richer edit — two exercises swapped at once, one replaced while
// another is added — has several readings, and guessing wrong would migrate a workout's logged
// sets onto the wrong exercise. There the edit still goes through; nothing is carried over.
function detectIdentityChange(
  before: IPlannerProgramExercise[],
  after: IPlannerProgramExercise[]
): { removed: IPlannerProgramExercise; added: IPlannerProgramExercise } | undefined {
  const beforeKeys = new Set(before.map((e) => e.key));
  const afterKeys = new Set(after.map((e) => e.key));
  const removed = before.filter((e) => !afterKeys.has(e.key));
  const added = after.filter((e) => !beforeKeys.has(e.key));
  return removed.length === 1 && added.length === 1 ? { removed: removed[0], added: added[0] } : undefined;
}

// What the caller has to know before it can call apply: whether this edit changes which
// exercise a line is, and — because that is the only case where the answer matters — on how
// many days that exercise is declared. One declaration and the two scopes are the same edit.
export function ProgramDayText_identityChange(
  planner: IPlannerProgram,
  dayData: Required<IDayData>,
  newText: string,
  settings: ISettings
): IProgramDayTextIdentityChange | undefined {
  const location = { weekIndex: dayData.week - 1, dayIndex: dayData.dayInWeek - 1 };
  const before = evaluateWeeks(planner, settings);
  const after = evaluateWeeks(withDayText(planner, location, newText), settings);
  const detected = detectIdentityChange(exercisesAt(before, location), exercisesAt(after, location));
  if (detected == null || before == null) {
    return undefined;
  }
  let declarations = 0;
  for (const week of before) {
    for (const day of week) {
      if (day.success && day.data.some((e) => e.key === detected.removed.key && !e.isRepeat)) {
        declarations += 1;
      }
    }
  }
  return {
    oldName: detected.removed.fullName,
    newName: detected.added.fullName,
    declarations,
    isLadder:
      (detected.removed.exerciseVariations?.length ?? 0) > 1 || (detected.added.exerciseVariations?.length ?? 0) > 1,
  };
}

// Turning a day's edited text into a new program. The whole-day counterpart of
// ProgramExerciseText_apply, and it owes the same guarantees that one already makes: an exercise
// whose identity changes has every `...reuse` aimed at it rewritten to follow, a name that
// collides with another exercise in the program is labelled apart rather than quietly merged
// into it, and an edit that breaks a day it doesn't touch is refused rather than saved.
//
// A whole day is a looser edit than one declaration, so the identity change it can follow is
// narrower — see detectIdentityChange. What it will not do is guess.
export function ProgramDayText_apply(
  planner: IPlannerProgram,
  dayData: Required<IDayData>,
  newText: string,
  settings: ISettings,
  scope: IProgramExerciseSwapScope = "all"
): IProgramDayTextApplied | { error: IProgramExerciseTextError } {
  const location = { weekIndex: dayData.week - 1, dayIndex: dayData.dayInWeek - 1 };
  if (planner.weeks[location.weekIndex]?.days[location.dayIndex] == null) {
    return { error: { message: "Couldn't find this day in the program anymore, so the changes weren't saved." } };
  }

  const before = evaluateWeeks(planner, settings);
  const spliced = withDayText(planner, location, newText);
  let after: IPlannerEvalResult[][];
  try {
    after = PlannerProgram_evaluate(spliced, settings).evaluatedWeeks;
  } catch (e) {
    return { error: { message: ProgramExerciseText_cleanErrorMessage(PlannerProgram_thrownErrorMessage(e)) } };
  }
  // This day's own error first: it's the text the user is looking at, and its offsets point
  // into it.
  const ownError = errorAt(after, location);
  if (ownError != null) {
    return { error: ownError };
  }

  const detected = detectIdentityChange(exercisesAt(before, location), exercisesAt(after, location));
  // A ladder's rungs are its identity, and replaceExercise collapses a multi-variation exercise
  // onto a single current one — which would delete rungs the user can see in their own text. The
  // replace exists here to rewrite `...reuse` references, and a multi-variation exercise can't be
  // a reuse target in the first place, so for a ladder there's nothing it would buy. The text is
  // the source of truth; the identity change is still reported so logged sets follow it.
  const isLadder =
    (detected?.removed.exerciseVariations?.length ?? 0) > 1 || (detected?.added.exerciseVariations?.length ?? 0) > 1;
  let result = spliced;
  let renames: IProgramDayTextRename[] = [];
  if (detected != null && isLadder) {
    renames = [{ oldKey: detected.removed.key, newKey: detected.added.key }];
  } else if (detected != null) {
    // Same two steps, in the same order, as an exercise-sheet swap: the edit is spliced with the
    // old exercise still named — which keeps the program valid, in particular every `...reuse`
    // aimed at it — and only then replaced at the program level, which is what rewrites those
    // references, collapses a ladder onto the new target and de-conflicts a colliding name.
    //
    // Reverting by name over the day's whole text rather than by locating the line: it keeps
    // every other edit the user made in the same pass, and anything else they wrote naming the
    // new exercise is renamed straight back by the replace below.
    const reverted = PlannerEvaluator_changeExerciseName(newText, detected.added.name, detected.removed.name, settings);
    const withOldName = withDayText(planner, location, reverted);
    const target: IExerciseType | string = detected.added.exerciseType ?? detected.added.name;
    try {
      result = PlannerProgram_replaceExercise(
        withOldName,
        detected.removed.key,
        detected.added.label,
        target,
        settings,
        scope === "one" ? dayData : undefined
      );
    } catch (e) {
      // replaceExercise evaluates internally and throws syntax errors rather than returning them.
      return { error: { message: ProgramExerciseText_cleanErrorMessage(PlannerProgram_thrownErrorMessage(e)) } };
    }
    // The key it actually landed on, which is not always the one the user typed: a collision
    // gets a label suffix, and that changes the key the workout's logged sets have to follow.
    const settled = exercisesAt(evaluateWeeks(result, settings), location).find(
      (e) => !exercisesAt(before, location).some((old) => old.key === e.key)
    );
    renames = [{ oldKey: detected.removed.key, newKey: settled?.key ?? detected.added.key, label: settled?.label }];
  }

  let final: IPlannerEvalResult[][];
  try {
    final = result === spliced ? after : PlannerProgram_evaluate(result, settings).evaluatedWeeks;
  } catch (e) {
    return { error: { message: ProgramExerciseText_cleanErrorMessage(PlannerProgram_thrownErrorMessage(e)) } };
  }
  const brokeElsewhere = introducedError(before, final);
  if (brokeElsewhere != null) {
    return { error: brokeElsewhere };
  }
  return { planner: result, renames };
}
