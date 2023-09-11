import { IPlannerProgram, IPlannerProgramExercise, IPlannerProgramProperty } from "./types";
import { parser as plannerExerciseParser } from "../plannerExerciseParser";
import { IPlannerEvalResult, PlannerExerciseEvaluator, PlannerSyntaxError } from "../plannerExerciseEvaluator";
import { IAllCustomExercises, IDayData } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { Exercise, IExercise } from "../../../models/exercise";

export class PlannerProgram {
  public static isValid(program: IPlannerProgram, customExercises: IAllCustomExercises): boolean {
    const evaluatedWeeks = PlannerProgram.evaluate(program, customExercises);
    return evaluatedWeeks.every((week) => week.every((day) => day.success));
  }

  public static evaluate(
    plannerProgram: IPlannerProgram,
    customExercises: IAllCustomExercises
  ): IPlannerEvalResult[][] {
    const evaluatedWeeks = plannerProgram.weeks.map((week) => {
      return week.days.map((day) => {
        const tree = plannerExerciseParser.parse(day.exerciseText);
        const evaluator = new PlannerExerciseEvaluator(day.exerciseText, customExercises);
        return evaluator.evaluate(tree.topNode);
      });
    });
    const errors: { error: string; dayData: Required<IDayData> }[] = [];
    const exerciseTypeToProperties: Record<string, (IPlannerProgramProperty & { dayData: Required<IDayData> })[]> = {};
    PlannerProgram.generateExerciseTypeAndDayData(evaluatedWeeks, customExercises, (exercise, name, dayData) => {
      exerciseTypeToProperties[name] = exerciseTypeToProperties[name] || [];
      const properties = exerciseTypeToProperties[name];
      for (const property of exercise.properties) {
        const existingProperty = properties.find((p) => p.name === property.name);
        if (
          existingProperty != null &&
          (existingProperty.fnName !== property.fnName ||
            existingProperty.fnArgs.some((a, i) => property.fnArgs[i] !== a))
        ) {
          errors.push({
            dayData,
            error:
              `Same property '${property.name}' is specified with different arguments in multiple weeks/days for exercise '${exercise.name}': both in ` +
              `week ${existingProperty.dayData.week + 1}, day ${existingProperty.dayData.dayInWeek + 1} ` +
              `and week ${dayData.week + 1}, day ${dayData.dayInWeek + 1}`,
          });
        }
        properties.push({ ...property, dayData });
      }
    });
    for (const error of errors) {
      evaluatedWeeks[error.dayData.week][error.dayData.dayInWeek] = {
        success: false,
        error: new PlannerSyntaxError(error.error, 0, 0),
      };
    }
    return evaluatedWeeks;
  }

  public static generateExerciseTypeAndDayData(
    evaluatedWeeks: IPlannerEvalResult[][],
    customExercises: IAllCustomExercises,
    cb: (exercise: IPlannerProgramExercise, name: string, dayData: Required<IDayData>) => void
  ): void {
    let dayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          const excrs = day.data;
          const exercisesByName: Record<string, IPlannerProgramExercise[]> = {};
          for (const exercise of excrs) {
            exercisesByName[exercise.name] = exercisesByName[exercise.name] || [];
            exercisesByName[exercise.name].push(exercise);
          }
          for (const groupedExercises of ObjectUtils.values(exercisesByName)) {
            const exercise = groupedExercises.reduce((memo, ex) => {
              memo.sets.push(...ex.sets);
              return memo;
            });
            const liftosaurExercise = Exercise.findByName(exercise.name, customExercises);
            if (!liftosaurExercise) {
              continue;
            }
            const name = PlannerProgram.generateExerciseTypeKey(exercise, liftosaurExercise);
            const dayData = {
              week: weekIndex,
              day: dayIndex,
              dayInWeek: dayInWeekIndex,
            };
            cb(exercise, name, dayData);
          }
        }
        dayIndex += 1;
      }
    }
  }

  public static generateExerciseTypeKey(plannerExercise: IPlannerProgramExercise, exercise: IExercise): string {
    const equipment = plannerExercise.equipment ?? exercise.defaultEquipment;
    return `${plannerExercise.label ? `${plannerExercise.label}_` : ""}${exercise.id}_${equipment}`;
  }
}
