import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IPlannerEvalResult } from "../pages/planner/plannerExerciseEvaluator";
export class PP {
  public static iterate(
    evaluatedWeeks: IPlannerEvalResult[][],
    cb: (
      exercise: IPlannerProgramExercise,
      weekIndex: number,
      dayInWeekIndex: number,
      dayIndex: number,
      exerciseIndex: number
    ) => void
  ): void {
    let dayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex++) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex++) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          for (let exerciseIndex = 0; exerciseIndex < day.data.length; exerciseIndex++) {
            const exercise = day.data[exerciseIndex];
            cb(exercise, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex);
          }
        }
        dayIndex += 1;
      }
    }
  }
}
