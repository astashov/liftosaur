import { IDayData, IPlannerProgram, IProgram, ISettings } from "../types";
import { Program_evaluateCachedPlanner } from "./program";
import { ProgramToPlanner } from "./programToPlanner";

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
