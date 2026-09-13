import { IPlannerProgram, ISettings, IShortDayData } from "../types";
import { IEvaluatedProgram, Program_create, Program_evaluateCachedPlanner } from "./program";
import { ProgramToPlanner } from "./programToPlanner";
import { PlannerEvaluator_evaluate, PlannerEvaluator_getFirstError } from "../pages/planner/plannerEvaluator";
import { PlannerProgram_thrownErrorMessage } from "../pages/planner/models/plannerProgram";
import { ObjectUtils_clone } from "../utils/object";

export interface IProgramRewriteError {
  message: string;
}

export type IProgramRewriteResult = { planner: IPlannerProgram } | { error: IProgramRewriteError };

// One program edit made on the evaluated model: `mutate` changes the instances it wants on a
// clone, ProgramToPlanner prints the whole program, and the result is evaluated once more so a
// rewrite that the evaluator rejects never reaches the caller as a planner.
export function ProgramRewrite_instances(
  planner: IPlannerProgram,
  settings: ISettings,
  mutate: (evaluated: IEvaluatedProgram) => void,
  options: { validate?: boolean } = {}
): IProgramRewriteResult {
  let evaluated: IEvaluatedProgram;
  try {
    evaluated = ObjectUtils_clone(Program_evaluateCachedPlanner({ ...Program_create("Temp"), planner }, settings));
  } catch (e) {
    return { error: { message: PlannerProgram_thrownErrorMessage(e) } };
  }
  mutate(evaluated);
  let rewritten: IPlannerProgram;
  try {
    rewritten = new ProgramToPlanner(evaluated, settings).convertToPlanner();
  } catch (e) {
    return { error: { message: PlannerProgram_thrownErrorMessage(e) } };
  }
  if (options.validate === false) {
    return { planner: rewritten };
  }
  const error = ProgramRewrite_validate(rewritten, settings);
  return error != null ? { error } : { planner: rewritten };
}

export function ProgramRewrite_validate(
  planner: IPlannerProgram,
  settings: ISettings
): IProgramRewriteError | undefined {
  try {
    const error = PlannerEvaluator_getFirstError(PlannerEvaluator_evaluate(planner, settings).evaluatedWeeks);
    return error != null ? { message: error.message } : undefined;
  } catch (e) {
    return { message: PlannerProgram_thrownErrorMessage(e) };
  }
}

// The declaration's own week plus every week a `Squat[1-4]` bracket repeats it into.
export function ProgramRewrite_repeatWeeks(
  evaluated: IEvaluatedProgram,
  dayData: IShortDayData,
  fullName: string,
  ignoreRepeats: boolean = false
): number[] {
  const day = evaluated.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1];
  const weeks: Set<number> = new Set();
  weeks.add(dayData.week);
  const exercise = day?.exercises.find((e) => e.fullName === fullName);
  if (!ignoreRepeats && exercise != null) {
    for (const repeating of exercise.repeating) {
      weeks.add(repeating);
    }
  }
  return Array.from(weeks);
}
