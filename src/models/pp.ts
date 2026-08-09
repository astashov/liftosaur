import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IPlannerEvalResult, IPlannerTopLineItem } from "../pages/planner/plannerExerciseEvaluator";
import { IEvaluatedProgramWeek } from "./program";
export function PP_iterate2(
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

// Walks the exercise lines of a program's source text rather than its evaluated exercises. The
// week/day/dayIndex it yields line up with PP_iterate2, since both the top line map and the
// evaluated weeks are built one-to-one from planner.weeks.
export function PP_iterateTopLineExercises(
  groupedTopLines: IPlannerTopLineItem[][][][],
  cb: (line: IPlannerTopLineItem, weekIndex: number, dayInWeekIndex: number, dayIndex: number) => boolean | void
): void {
  let dayIndex = 0;
  for (let weekIndex = 0; weekIndex < groupedTopLines.length; weekIndex++) {
    const week = groupedTopLines[weekIndex];
    for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex++) {
      for (const group of week[dayInWeekIndex]) {
        for (const line of group) {
          if (line.type !== "exercise") {
            continue;
          }
          const shouldReturn = cb(line, weekIndex, dayInWeekIndex, dayIndex);
          if (!!shouldReturn) {
            return;
          }
        }
      }
      dayIndex += 1;
    }
  }
}

export function PP_iterate(
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
