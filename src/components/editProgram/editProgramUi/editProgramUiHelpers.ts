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
    const result = PlannerEvaluator.evaluatedProgramToText(program, evaluatedWeeks, settings);
    if (result.success) {
      return result.data;
    } else {
      alert(result.error.message);
      return program;
    }
  }

  private static getWeek(
    evaluatedWeeks: IPlannerEvalResult[][],
    dayData: Required<IDayData>,
    fullName: string
  ): number {
    const day = evaluatedWeeks[dayData.week - 1][dayData.dayInWeek - 1];
    let week = dayData.week;
    if (day.success) {
      const exercise = day.data.find((e) => e.fullName === fullName);
      if (exercise?.isRepeat) {
        week = exercise.repeating[0];
      }
    }
    return week;
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
      console.log(evaluatedWeeks);
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

    const week = this.getWeek(evaluatedWeeks, dayData, fullName);
    const targetDay = evaluatedWeeks[week - 1][dayData.dayInWeek - 1];

    let index = 0;
    let newFullName: string | undefined;
    if (targetDay.success) {
      index = targetDay.data.findIndex((e) => e.fullName === fullName);
      const previousExercise = targetDay.data[index];
      if (index !== -1 && previousExercise) {
        const exercise = Exercise.get(newExerciseType, settings.exercises);
        newFullName = `${exercise.name}${
          newExerciseType.equipment === exercise.defaultEquipment ? "" : `, ${equipmentName(newExerciseType.equipment)}`
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

    if (index !== -1 && newFullName != null) {
      return this.validateAndReturnProgram(program, evaluatedWeeks, settings, {
        add: { dayData, fullName: newFullName, index: index + 1 },
      });
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

    const week = this.getWeek(evaluatedWeeks, dayData, fullName);
    const targetDay = evaluatedWeeks[week - 1][dayData.dayInWeek - 1];

    if (targetDay.success) {
      const index = targetDay.data.findIndex((e) => e.fullName === fullName);
      if (index !== -1) {
        targetDay.data.splice(index, 1);
      }
    }

    return this.validateAndReturnProgram(program, evaluatedWeeks, settings);
  }

  public static changeCurrentInstancePosition(
    program: IPlannerProgram,
    dayData: Required<IDayData>,
    fromIndex: number,
    toIndex: number,
    settings: ISettings
  ): IPlannerProgram {
    const { evaluatedWeeks } = ObjectUtils.clone(PlannerProgram.evaluate(program, settings));
    return this.validateAndReturnProgram(program, evaluatedWeeks, settings, {
      reorder: { dayData, fromIndex, toIndex },
    });
  }

  public static changeCurrentInstance(
    program: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    settings: ISettings,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const { evaluatedWeeks } = ObjectUtils.clone(PlannerProgram.evaluate(program, settings));
    const week = this.getWeek(evaluatedWeeks, dayData, fullName);

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
            if (newFullNameDays.some(([w, d]) => w === reuse.exerciseWeek && d === reuse.exerciseDayInWeek)) {
              reuse.fullName = newFullName;
            }
          }
        }
      });
    }

    return this.validateAndReturnProgram(program, evaluatedWeeks, settings);
  }
}
