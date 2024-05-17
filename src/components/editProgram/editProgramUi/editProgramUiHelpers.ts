import { Exercise, equipmentName } from "../../../models/exercise";
import { PP } from "../../../models/pp";
import { PlannerProgram } from "../../../pages/planner/models/plannerProgram";
import { IPlannerProgramExercise } from "../../../pages/planner/models/types";
import { PlannerEvaluator } from "../../../pages/planner/plannerEvaluator";
import { PlannerKey } from "../../../pages/planner/plannerKey";
import { IPlannerProgram, ISettings, IDayData, IExerciseType } from "../../../types";
import { ObjectUtils } from "../../../utils/object";

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
      PP.iterate(evaluatedWeeks, (e, weekIndex, dayInWeekIndex) => {
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

  public static replaceExerciseCurrentInstance(
    program: IPlannerProgram,
    dayData: Required<IDayData>,
    exerciseKey: string,
    settings: ISettings,
    newExerciseType: IExerciseType
  ): IPlannerProgram {
    const { evaluatedWeeks } = PlannerEvaluator.evaluate(program, settings);
    const day = evaluatedWeeks[dayData.week - 1][dayData.dayInWeek - 1];
    let week = dayData.week;
    if (day.success) {
      const exercise = day.data.find((e) => PlannerKey.fromFullName(e.fullName, settings) === exerciseKey);
      if (exercise?.isRepeat) {
        week = exercise.repeating[0];
      }
    }
    const exercise = Exercise.find(newExerciseType, settings.exercises);
    if (!exercise) {
      return program;
    }
    const newShortName = `${exercise.name}${
      newExerciseType.equipment != null && newExerciseType.equipment !== exercise?.defaultEquipment
        ? `, ${equipmentName(newExerciseType.equipment, settings.equipment)}`
        : ""
    }`;
    let newFullname: string;
    PP.iterate(evaluatedWeeks, (e, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
      const current =
        week === weekIndex + 1 &&
        dayData.dayInWeek === dayInWeekIndex + 1 &&
        PlannerKey.fromFullName(e.fullName, settings) === exerciseKey;
      if (current) {
        newFullname = `${e.label ? `${e.label}: ` : ""}${newShortName}`;
        e.fullName = newFullname;
        e.shortName = newShortName;
      }
    });
    PP.iterate(evaluatedWeeks, (e, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
      const reuse = e.reuse;
      if (reuse) {
        if (
          PlannerKey.fromFullName(reuse.fullName, settings) === exerciseKey &&
          reuse.exerciseWeek === weekIndex + 1 &&
          reuse.exerciseDayInWeek === dayInWeekIndex + 1
        ) {
          reuse.fullName = newFullname;
        }
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
