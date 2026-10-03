import { IPlannerProgramWeek } from "../../../types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";

export interface IPlannerWeekTab {
  name: string;
  isInvalid: boolean;
}

export function PlannerWeekSelection_index(weekCount: number, weekIndex: number): number {
  return Math.max(0, Math.min(weekIndex, weekCount - 1));
}

export function PlannerWeekSelection_tabs(
  weeks: IPlannerProgramWeek[],
  evaluatedWeeks: IPlannerEvalResult[][]
): IPlannerWeekTab[] {
  return weeks.map((week, i) => ({
    name: week.name,
    isInvalid: (evaluatedWeeks[i] ?? []).some((day) => !day.success),
  }));
}
