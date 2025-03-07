import { PP } from "../../../models/pp";
import { PlannerProgram } from "../../../pages/planner/models/plannerProgram";
import { IPlannerProgramExercise } from "../../../pages/planner/models/types";
import { PlannerEvaluator } from "../../../pages/planner/plannerEvaluator";
import { PlannerKey } from "../../../pages/planner/plannerKey";
import { IPlannerProgram, ISettings, IDayData, IExerciseType } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { IPlannerEvalResult } from "../../../pages/planner/plannerExerciseEvaluator";
import { equipmentName, Exercise } from "../../../models/exercise";
import { IPlannerEvaluatedProgramToTextOpts } from "../../../pages/planner/plannerEvaluatedProgramToText";

export class EditProgramUiHelpers {
  public static changeFirstInstance(
    program: IPlannerProgram,
    plannerExercise: IPlannerProgramExercise,
    settings: ISettings,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const key = PlannerKey.fromFullName(plannerExercise.fullName, settings);
    const { evaluatedWeeks } = ObjectUtils.clone(PlannerProgram.evaluate(program, settings));
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
    return this.validateAndReturnProgram(program, evaluatedWeeks, settings);
  }

  private static getWeeks(
    evaluatedWeeks: IPlannerEvalResult[][],
    dayData: Required<IDayData>,
    fullName: string
  ): number[] {
    const day = evaluatedWeeks[dayData.week - 1][dayData.dayInWeek - 1];
    const weeks: Set<number> = new Set();
    weeks.add(dayData.week);
    if (day.success) {
      const exercise = day.data.find((e) => e.fullName === fullName);
      if (exercise != null) {
        for (const repeating of exercise.repeating) {
          weeks.add(repeating);
        }
      }
    }
    return Array.from(weeks);
  }

  private static validateAndReturnProgram(
    program: IPlannerProgram,
    evaluatedWeeks: IPlannerEvalResult[][],
    settings: ISettings,
    opts: IPlannerEvaluatedProgramToTextOpts = {}
  ): IPlannerProgram {
    const result = PlannerEvaluator.evaluatedProgramToText(program, evaluatedWeeks, settings, opts);
    if (result.success) {
      const text = PlannerProgram.generateFullText(result.data.weeks);
      console.log(text);
      return result.data;
    } else {
      alert(result.error.message);
      return program;
    }
  }

  public static duplicateCurrentInstance(
    program: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    newExerciseType: IExerciseType,
    settings: ISettings
  ): IPlannerProgram {
    const { evaluatedWeeks } = ObjectUtils.clone(PlannerProgram.evaluate(program, settings));

    const weeks = this.getWeeks(evaluatedWeeks, dayData, fullName);
    const adds = [];
    for (const week of weeks) {
      const targetDay = evaluatedWeeks[week - 1][dayData.dayInWeek - 1];

      let newFullName: string | undefined;
      let index = 0;
      if (targetDay.success) {
        index = targetDay.data.findIndex((e) => e.fullName === fullName);
        const previousExercise = targetDay.data[index];
        if (index !== -1 && previousExercise) {
          const exercise = Exercise.get(newExerciseType, settings.exercises);
          newFullName = `${exercise.name}${
            newExerciseType.equipment != null && newExerciseType.equipment !== exercise.defaultEquipment
              ? `, ${equipmentName(newExerciseType.equipment)}`
              : ""
          }`;
          const newExercise = {
            ...ObjectUtils.clone(previousExercise),
            fullName: newFullName,
            shortName: newFullName,
            key: PlannerKey.fromFullName(newFullName, settings),
            name: exercise.name,
          };
          targetDay.data.splice(index + 1, 0, newExercise);
        }
      }
      if (newFullName != null && index !== -1) {
        adds.push({ dayData: { ...dayData, week }, fullName: newFullName, index: index + 1 });
      }
    }
    if (adds.length > 0) {
      return this.validateAndReturnProgram(program, evaluatedWeeks, settings, { add: adds });
    } else {
      return program;
    }
  }

  public static deleteCurrentInstance(
    program: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    settings: ISettings
  ): IPlannerProgram {
    const { evaluatedWeeks } = ObjectUtils.clone(PlannerProgram.evaluate(program, settings));

    const weeks = this.getWeeks(evaluatedWeeks, dayData, fullName);
    for (const week of weeks) {
      const targetDay = evaluatedWeeks[week - 1][dayData.dayInWeek - 1];

      if (targetDay.success) {
        const index = targetDay.data.findIndex((e) => e.fullName === fullName);
        if (index !== -1) {
          targetDay.data.splice(index, 1);
        }
      }
    }

    return this.validateAndReturnProgram(program, evaluatedWeeks, settings);
  }

  public static changeCurrentInstancePosition(
    program: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    fromIndex: number,
    toIndex: number,
    settings: ISettings
  ): IPlannerProgram {
    const { evaluatedWeeks } = ObjectUtils.clone(PlannerProgram.evaluate(program, settings));
    const weeks = this.getWeeks(evaluatedWeeks, dayData, fullName);
    const reorders = weeks.map((week) => ({ dayData: { ...dayData, week }, fromIndex, toIndex }));
    return this.validateAndReturnProgram(program, evaluatedWeeks, settings, { reorder: reorders });
  }

  public static changeCurrentInstance(
    program: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    settings: ISettings,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const { evaluatedWeeks } = ObjectUtils.clone(PlannerProgram.evaluate(program, settings));
    const weeks = this.getWeeks(evaluatedWeeks, dayData, fullName);

    for (const week of weeks) {
      let newFullName: string | undefined;
      const newFullNameDays: [number, number][] = [];
      PP.iterate(evaluatedWeeks, (e, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
        const current = week === weekIndex + 1 && dayData.dayInWeek === dayInWeekIndex + 1 && e.fullName === fullName;
        if (current) {
          const prevExercise = ObjectUtils.clone(e);
          cb(e);
          if (prevExercise.fullName !== e.fullName) {
            newFullName = e.fullName;
            newFullNameDays.push([weekIndex + 1, dayInWeekIndex + 1]);
          }
        }
      });
      if (newFullName != null) {
        PP.iterate(evaluatedWeeks, (e) => {
          const reuse = e.reuse;
          if (reuse) {
            if (reuse.fullName === fullName && newFullName != null) {
              if (
                newFullNameDays.some(
                  ([w, d]) => w === reuse.exercise?.dayData.week && d === reuse.exercise?.dayData.dayInWeek
                )
              ) {
                reuse.fullName = newFullName;
              }
            }
          }
        });
      }
    }

    return this.validateAndReturnProgram(program, evaluatedWeeks, settings);
  }
}
