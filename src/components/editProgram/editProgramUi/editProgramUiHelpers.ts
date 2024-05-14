import { PP } from "../../../models/pp";
import { PlannerProgram } from "../../../pages/planner/models/plannerProgram";
import { IPlannerProgramExercise } from "../../../pages/planner/models/types";
import { PlannerEvaluator } from "../../../pages/planner/plannerEvaluator";
import { PlannerKey } from "../../../pages/planner/plannerKey";
import { IPlannerProgram, ISettings, IDayData } from "../../../types";

export class EditProgramUiHelpers {
  public static changeFirstInstance(
    program: IPlannerProgram,
    plannerExercise: IPlannerProgramExercise,
    settings: ISettings,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const key = PlannerKey.fromFullName(plannerExercise.fullName, settings);
    const { evaluatedWeeks } = PlannerEvaluator.evaluate(program, settings);
    let applied = false;
    PP.iterate(evaluatedWeeks, (e) => {
      if (!applied) {
        const aKey = PlannerKey.fromFullName(e.fullName, settings);
        if (key === aKey) {
          cb(e);
          applied = true;
        }
      }
    });
    const result = PlannerEvaluator.evaluatedProgramToText(program, evaluatedWeeks, settings);
    if (result.success) {
      return result.data;
    } else {
      alert(result.error.message);
      return program;
    }
  }

  public static changeCurrentInstance(
    program: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    settings: ISettings,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const { evaluatedWeeks } = PlannerEvaluator.evaluate(program, settings);
    const day = evaluatedWeeks[dayData.week - 1][dayData.dayInWeek - 1];
    let week = dayData.week;
    if (day.success) {
      const exercise = day.data.find((e) => e.fullName === fullName);
      if (exercise?.isRepeat) {
        week = exercise.repeating[0];
      }
    }
    PP.iterate(evaluatedWeeks, (e, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
      const current = week === weekIndex + 1 && dayData.dayInWeek === dayInWeekIndex + 1 && e.fullName === fullName;
      if (current) {
        cb(e);
      }
    });
    const result = PlannerEvaluator.evaluatedProgramToText(program, evaluatedWeeks, settings);
    if (result.success) {
      const text = PlannerProgram.generateFullText(result.data.weeks);
      console.log(text);
      return result.data;
    } else {
      console.log(evaluatedWeeks);
      alert(result.error.message);
      return program;
    }
  }
}
