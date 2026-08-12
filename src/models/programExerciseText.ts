import { IPlannerProgram, ISettings } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgram_evaluate, PlannerProgram_thrownErrorMessage } from "../pages/planner/models/plannerProgram";
import type { IPlannerEvalResult } from "../pages/planner/plannerExerciseEvaluator";
import { IEvaluatedProgram, Program_getAllProgramExercises } from "./program";
import {
  IProgramExerciseSwap,
  IProgramExerciseSwapScope,
  ProgramExerciseSwap_apply,
  ProgramExerciseSwap_rebaseRange,
  ProgramExerciseSwap_revertedText,
} from "./programExerciseSwap";

// Errors inside the edited exercise carry blurb-local from/to so the editor can tint the
// offending span; errors elsewhere in the program are message-only.
export interface IProgramExerciseTextError {
  message: string;
  from?: number;
  to?: number;
}

// Where the exercise's source text physically lives: repeat instances carry the
// declaration's text/line but their own dayData, so anchor edits to the non-repeat
// declaration that repeats into the opened week.
export function ProgramExerciseText_findDeclaration(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise {
  if (!programExercise.isRepeat) {
    return programExercise;
  }
  return (
    Program_getAllProgramExercises(evaluatedProgram).find(
      (e) => e.key === programExercise.key && !e.isRepeat && e.repeating.includes(programExercise.dayData.week)
    ) ?? programExercise
  );
}

// Identical exercise lines commonly appear in several weeks (repeated weeks written out),
// so the replacement must target the declaration's exact day and line, not the first
// occurrence anywhere in the planner.
export function ProgramExerciseText_replaceInPlanner(
  planner: IPlannerProgram,
  declaration: IPlannerProgramExercise,
  oldText: string,
  newText: string
): { planner: IPlannerProgram; dayTextOffset: number } | undefined {
  const weekIndex = declaration.dayData.week - 1;
  const dayIndex = declaration.dayData.dayInWeek - 1;
  const day = planner.weeks[weekIndex]?.days[dayIndex];
  if (day == null) {
    return undefined;
  }
  const lineStart = day.exerciseText
    .split("\n")
    .slice(0, declaration.line - 1)
    .reduce((sum, l) => sum + l.length + 1, 0);
  const at = day.exerciseText.indexOf(oldText, lineStart);
  if (at === -1) {
    return undefined;
  }
  const newExerciseText = day.exerciseText.slice(0, at) + newText + day.exerciseText.slice(at + oldText.length);
  const newWeeks = planner.weeks.map((w, wi) =>
    wi === weekIndex
      ? { ...w, days: w.days.map((d, di) => (di === dayIndex ? { ...d, exerciseText: newExerciseText } : d)) }
      : w
  );
  return { planner: { ...planner, weeks: newWeeks }, dayTextOffset: at };
}

export function ProgramExerciseText_cleanErrorMessage(message: string): string {
  return message.replace(/\s*\(\d+:\d+\)$/, "");
}

function findEvalError(
  evaluatedWeeks: IPlannerEvalResult[][],
  edited: { weekIndex: number; dayIndex: number; from: number; to: number }
): IProgramExerciseTextError | undefined {
  let firstOutside: IProgramExerciseTextError | undefined;
  for (let wi = 0; wi < evaluatedWeeks.length; wi += 1) {
    for (let di = 0; di < evaluatedWeeks[wi].length; di += 1) {
      const result = evaluatedWeeks[wi][di];
      if (!result.success) {
        const error = result.error;
        const isInEdited =
          wi === edited.weekIndex && di === edited.dayIndex && error.from >= edited.from && error.to <= edited.to;
        if (isInEdited) {
          return {
            message: ProgramExerciseText_cleanErrorMessage(error.message),
            from: error.from - edited.from,
            to: error.to - edited.from,
          };
        }
        firstOutside = firstOutside ?? {
          message: `Week ${wi + 1}, Day ${di + 1}: ${ProgramExerciseText_cleanErrorMessage(error.message)}`,
        };
      }
    }
  }
  return firstOutside;
}

// The evaluator can throw outright on drafts it never sees from saved programs (e.g. a
// reuse pointing at a week that doesn't exist) — and live validation feeds it every
// keystroke, so a throw must become an error result, not a crash.
function evaluatePlannerSafely(
  planner: IPlannerProgram,
  settings: ISettings,
  edited: { weekIndex: number; dayIndex: number; from: number; to: number }
): IProgramExerciseTextError | undefined {
  try {
    const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
    return findEvalError(evaluatedWeeks, edited);
  } catch (e) {
    return { message: ProgramExerciseText_cleanErrorMessage(PlannerProgram_thrownErrorMessage(e)) };
  }
}

// Turning one exercise's edited text into a new program, used both to save and to validate.
// Ordinary edits are a splice; an edit that changes *which exercise this is* gets spliced with
// the old name still in place — keeping the program valid, in particular every `...reuse`
// aimed at it — and then swapped at the program level, which is what rewrites those
// references, keeps ladders identical across instances and de-conflicts a colliding name.
export function ProgramExerciseText_apply(
  planner: IPlannerProgram,
  declaration: IPlannerProgramExercise,
  trimmed: string,
  swap: IProgramExerciseSwap | undefined,
  scope: IProgramExerciseSwapScope,
  settings: ISettings
): { planner: IPlannerProgram } | { error: IProgramExerciseTextError; notFound?: boolean } {
  const splicedText = swap != null ? ProgramExerciseSwap_revertedText(trimmed, swap) : trimmed;
  const replaced = ProgramExerciseText_replaceInPlanner(planner, declaration, declaration.text, splicedText);
  if (replaced == null) {
    return {
      error: { message: "Couldn't find this exercise in the program anymore, so the changes weren't saved." },
      notFound: true,
    };
  }
  const spliceError = evaluatePlannerSafely(replaced.planner, settings, {
    weekIndex: declaration.dayData.week - 1,
    dayIndex: declaration.dayData.dayInWeek - 1,
    from: replaced.dayTextOffset,
    to: replaced.dayTextOffset + splicedText.length,
  });
  if (spliceError != null) {
    // The user sees the new name; the evaluator saw the old one, so in-blurb ranges are off
    // by the difference in length.
    return {
      error:
        swap != null && spliceError.from != null && spliceError.to != null
          ? { ...spliceError, ...ProgramExerciseSwap_rebaseRange({ from: spliceError.from, to: spliceError.to }, swap) }
          : spliceError,
    };
  }
  if (swap == null) {
    return { planner: replaced.planner };
  }
  const applied = ProgramExerciseSwap_apply(replaced.planner, swap, scope, declaration.dayData, settings);
  if ("error" in applied) {
    return { error: { message: ProgramExerciseText_cleanErrorMessage(applied.error) } };
  }
  // The swap rewrites the whole program, so anything it broke is reported without a range —
  // there is nothing in this blurb to point at.
  const evalError = evaluatePlannerSafely(applied.planner, settings, {
    weekIndex: -1,
    dayIndex: -1,
    from: 0,
    to: 0,
  });
  return evalError != null ? { error: evalError } : { planner: applied.planner };
}
