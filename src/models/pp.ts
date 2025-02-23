import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IPlannerEvalResult } from "../pages/planner/plannerExerciseEvaluator";
import { IEvaluatedProgramWeek } from "./program";
export class PP {
  public static iterate2(
    evaluatedWeeks: IEvaluatedProgramWeek[],
    cb: (
      exercise: IPlannerProgramExercise,
      weekIndex: number,
      dayInWeekIndex: number,
      dayIndex: number,
      exerciseIndex: number
    ) => boolean | void
  ): void {
    let dayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex++) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.days.length; dayInWeekIndex++) {
        const day = week.days[dayInWeekIndex];
        for (let exerciseIndex = 0; exerciseIndex < day.exercises.length; exerciseIndex++) {
          const exercise = day.exercises[exerciseIndex];
          const shouldReturn = cb(exercise, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex);
          if (!!shouldReturn) {
            return;
          }
        }
        dayIndex += 1;
      }
    }
  }

  public static iterate(
    evaluatedWeeks: IPlannerEvalResult[][],
    cb: (
      exercise: IPlannerProgramExercise,
      weekIndex: number,
      dayInWeekIndex: number,
      dayIndex: number,
      exerciseIndex: number
    ) => boolean | void
  ): void {
    let dayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex++) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex++) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          for (let exerciseIndex = 0; exerciseIndex < day.data.length; exerciseIndex++) {
            const exercise = day.data[exerciseIndex];
            const shouldReturn = cb(exercise, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex);
            if (!!shouldReturn) {
              return;
            }
          }
        }
        dayIndex += 1;
      }
    }
  }
}
