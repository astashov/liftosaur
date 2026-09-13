import { IDayData, IPlannerProgram, IProgram, ISettings } from "../types";
import { IEvaluatedProgram, Program_create, Program_evaluate, Program_evaluateCachedPlanner } from "./program";
import { ProgramToPlanner } from "./programToPlanner";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import {
  PlannerEvaluator_evaluateDay,
  PlannerEvaluator_fillEvaluatedSetVariations,
} from "../pages/planner/plannerEvaluator";
import {
  PlannerProgramExercise_getProgressScript,
  PlannerProgramExercise_getState,
  PlannerProgramExercise_getUpdateScript,
  PlannerProgramExercise_warmups,
} from "../pages/planner/models/plannerProgramExercise";
import { PP_iterate2 } from "./pp";
import { ProgramRewrite_instances, ProgramRewrite_repeatWeeks } from "./programRewrite";
import {
  IProgramExerciseTextError,
  ProgramExerciseText_blurb,
  ProgramExerciseText_cleanErrorMessage,
  ProgramExerciseText_findDeclaration,
} from "./programExerciseText";
import { ObjectUtils_isEqual } from "../utils/object";

// What an exercise line actually means, for a reader who can't hold the program in their head:
// the same declaration with its `...reuse` resolved and the properties declared on other weeks
// folded in. Built from the planner the sheet would save, not from the stored program, so it
// follows unsaved edits.
export function ProgramExercisePreview_materialize(
  program: IProgram,
  planner: IPlannerProgram,
  dayData: Required<IDayData>,
  key: string,
  settings: ISettings
): string | undefined {
  // The evaluator throws on some drafts (a reuse pointing at a week that doesn't exist), and a
  // preview is never worth taking the sheet down for.
  try {
    // Cached rather than forced: the caller has just spliced and validated this exact planner, and
    // the planner evaluation is memoized on content — so this reuses that work instead of
    // evaluating the whole program a second time per keystroke. Read-only, as that cache is shared.
    const evaluatedProgram = Program_evaluateCachedPlanner({ ...program, planner }, settings);
    // The selected instance, not the declaration: `...t3` means a different exercise in each
    // week, so a later week resolves to different sets than the line's own week does.
    const day = evaluatedProgram.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1];
    const exercise = day?.exercises.find((e) => e.key === key);
    return exercise != null
      ? new ProgramToPlanner(evaluatedProgram, settings).materializeExercise(exercise)
      : undefined;
  } catch (e) {
    return undefined;
  }
}

export interface IProgramExercisePreviewTarget {
  key: string;
  // Where the declaration is written.
  dayData: Required<IDayData>;
  // Which week's resolution the panel shows.
  tappedDayData: Required<IDayData>;
}

export function ProgramExercisePreview_target(
  declaration: IPlannerProgramExercise,
  programExercise: IPlannerProgramExercise | undefined,
  selectedDayData: Required<IDayData> | undefined,
  key: string = declaration.key
): IProgramExercisePreviewTarget {
  const isTappedRepeat =
    selectedDayData == null &&
    programExercise?.isRepeat === true &&
    declaration.repeating.includes(programExercise.dayData.week);
  return {
    key,
    dayData: declaration.dayData,
    tappedDayData: isTappedRepeat && programExercise != null ? programExercise.dayData : declaration.dayData,
  };
}

export interface IProgramExercisePreviewApplied {
  planner: IPlannerProgram;
  blurb: string;
  // Where the tapped week's declaration is in the written program. The same as the target's
  // dayData unless the writer split a repeat bracket at the tapped week.
  declarationDayData: Required<IDayData>;
}

function sameValue<T>(a: T | undefined, b: T | undefined): boolean {
  if (a == null || b == null) {
    return a == null && b == null;
  }
  return ObjectUtils_isEqual(a, b);
}

interface ISharedChanges {
  warmups: boolean;
  progress: boolean;
  update: boolean;
  usedCleared: boolean;
}

// The materialized line spells every inherited value out, so the parsed line carries the reuse
// target's warmups, script and state as its own. Only a value that differs from what the tapped
// instance resolves to is an edit. Judged against the tapped instance alone: another week may
// resolve differently on its own (`progress: none`, a different `...t1`), and that is not the
// user's edit.
function sharedChanges(tapped: IPlannerProgramExercise, own: IPlannerProgramExercise): ISharedChanges {
  const resolvedProgress = tapped.progress ?? tapped.reuse?.exercise?.progress;
  const progressUnchanged =
    own.progress?.type === resolvedProgress?.type &&
    own.progress?.script === PlannerProgramExercise_getProgressScript(tapped) &&
    (own.progress == null || sameValue(own.progress.state, PlannerProgramExercise_getState(tapped)));
  const resolvedUpdate = tapped.update ?? tapped.reuse?.exercise?.update;
  const updateUnchanged =
    own.update?.type === resolvedUpdate?.type && own.update?.script === PlannerProgramExercise_getUpdateScript(tapped);
  return {
    warmups: !sameValue(own.warmupSets, PlannerProgramExercise_warmups(tapped)),
    progress: !progressUnchanged,
    update: !updateUnchanged,
    usedCleared: tapped.notused === true && !own.notused,
  };
}

function applySharedChanges(
  instance: IPlannerProgramExercise,
  own: IPlannerProgramExercise,
  changes: ISharedChanges
): void {
  if (changes.warmups) {
    instance.warmupSets = own.warmupSets;
  }
  if (changes.progress) {
    instance.progress = own.progress;
  }
  if (changes.update) {
    instance.update = own.update;
  }
  // `used: none` is hoisted onto every instance, so one left standing hides the exercise again.
  if (changes.usedCleared) {
    instance.notused = false;
  }
}

function applyOwn(instance: IPlannerProgramExercise, own: IPlannerProgramExercise): void {
  instance.setVariations = own.setVariations;
  instance.globals = own.globals;
  instance.notused = own.notused;
  instance.superset = own.superset;
  instance.tags = own.tags;
  PlannerEvaluator_fillEvaluatedSetVariations(instance);
}

function instanceAt(
  evaluated: IEvaluatedProgram,
  dayData: Required<IDayData>,
  key: string
): IPlannerProgramExercise | undefined {
  return evaluated.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1]?.exercises.find((e) => e.key === key);
}

export function ProgramExercisePreview_apply(
  planner: IPlannerProgram,
  target: IProgramExercisePreviewTarget,
  panelText: string,
  settings: ISettings
): IProgramExercisePreviewApplied | { error: IProgramExerciseTextError } {
  const parsed = PlannerEvaluator_evaluateDay({ name: "", exerciseText: panelText }, target.dayData, settings);
  if (!parsed.success) {
    return {
      error: {
        message: ProgramExerciseText_cleanErrorMessage(parsed.error.message),
        from: parsed.error.from,
        to: parsed.error.to,
      },
    };
  }
  const own = parsed.data[0];
  if (own == null || parsed.data.length !== 1) {
    return { error: { message: "The preview holds one exercise." } };
  }
  if (own.key !== target.key) {
    return { error: { message: "Change the exercise on the line above. The preview keeps its name." } };
  }
  let missing: string | undefined;
  const result = ProgramRewrite_instances(planner, settings, (evaluated) => {
    const declaration = instanceAt(evaluated, target.dayData, target.key);
    const tapped = instanceAt(evaluated, target.tappedDayData, target.key);
    if (declaration == null || tapped == null) {
      missing = "Couldn't find this exercise in the program anymore.";
      return;
    }
    const weeks = new Set(ProgramRewrite_repeatWeeks(evaluated, declaration.dayData, declaration.fullName));
    // The panel shows one week's resolution of `...t1`. A repeat sibling that resolves to the same
    // sets gets the same own values; one that resolves differently keeps its line, and the writer
    // splits the repeat rather than pinning this week's sets onto it.
    const tappedResolution = tapped.evaluatedSetVariations;
    const changes = sharedChanges(tapped, own);
    PP_iterate2(evaluated.weeks, (instance, weekIndex, dayInWeekIndex) => {
      if (instance.key !== target.key) {
        return;
      }
      applySharedChanges(instance, own, changes);
      const isSibling = weeks.has(weekIndex + 1) && dayInWeekIndex + 1 === declaration.dayData.dayInWeek;
      if (isSibling && ObjectUtils_isEqual(instance.evaluatedSetVariations, tappedResolution)) {
        applyOwn(instance, own);
      }
    });
  });
  if (missing != null) {
    return { error: { message: missing } };
  }
  if ("error" in result) {
    return { error: { message: ProgramExerciseText_cleanErrorMessage(result.error.message) } };
  }
  // The tapped week's declaration, found again in the written program: a repeat that resolved
  // differently is its own declaration after the writer splits the bracket, and the sheet has to
  // follow it there rather than rebase onto the line the bracket left behind.
  const written = Program_evaluate({ ...Program_create("Temp"), planner: result.planner }, settings);
  const writtenTapped = instanceAt(written, target.tappedDayData, target.key);
  if (writtenTapped == null) {
    return { error: { message: "Couldn't find this exercise after writing the preview." } };
  }
  const writtenDeclaration = ProgramExerciseText_findDeclaration(written, writtenTapped);
  return {
    planner: result.planner,
    blurb: ProgramExerciseText_blurb(result.planner, writtenDeclaration),
    declarationDayData: writtenDeclaration.dayData,
  };
}
