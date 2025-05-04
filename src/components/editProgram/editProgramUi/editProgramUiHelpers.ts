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
import { IEvaluatedProgram, Program } from "../../../models/program";
import { ProgramToPlanner } from "../../../models/programToPlanner";

export class EditProgramUiHelpers {
  public static changeFirstInstance(
    planner: IPlannerProgram,
    plannerExercise: IPlannerProgramExercise,
    settings: ISettings,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const key = PlannerKey.fromFullName(plannerExercise.fullName, settings);
    const evaluatedProgram = Program.evaluate({ ...Program.create("Temp"), planner }, settings);
    PP.iterate2(evaluatedProgram.weeks, (e) => {
      const aKey = PlannerKey.fromFullName(e.fullName, settings);
      if (key === aKey) {
        cb(e);
        return true;
      }
      return false;
    });
    return new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
  }

  private static getWeeks2(
    evaluatedProgram: IEvaluatedProgram,
    dayData: Required<IDayData>,
    fullName: string
  ): number[] {
    const day = evaluatedProgram.weeks[dayData.week - 1].days[dayData.dayInWeek - 1];
    const weeks: Set<number> = new Set();
    weeks.add(dayData.week);
    const exercise = day.exercises.find((e) => e.fullName === fullName);
    if (exercise != null) {
      for (const repeating of exercise.repeating) {
        weeks.add(repeating);
      }
    }
    return Array.from(weeks);
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
    planner: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    newExerciseType: IExerciseType,
    settings: ISettings
  ): IPlannerProgram {
    const evaluatedProgram = Program.evaluate({ ...Program.create("Temp"), planner }, settings);
    const weeks = this.getWeeks2(evaluatedProgram, dayData, fullName);

    const add = [];
    for (const week of weeks) {
      const targetDay = evaluatedProgram.weeks[week - 1]?.days[dayData.dayInWeek - 1];

      let newFullName: string | undefined;
      let index = targetDay.exercises.findIndex((e) => e.fullName === fullName);
      const previousExercise = targetDay.exercises[index];
      if (index !== -1 && previousExercise) {
        const exercise = Exercise.get(newExerciseType, settings.exercises);
        newFullName = `${exercise.name}${
          newExerciseType.equipment != null && newExerciseType.equipment !== exercise.defaultEquipment
            ? `, ${equipmentName(newExerciseType.equipment)}`
            : ""
        }`;
        const newExercise: IPlannerProgramExercise = {
          ...ObjectUtils.clone(previousExercise),
          fullName: newFullName,
          shortName: newFullName,
          key: PlannerKey.fromFullName(newFullName, settings),
          exerciseType: newExerciseType,
          name: exercise.name,
        };
        targetDay.exercises.splice(index + 1, 0, newExercise);
      }
      if (newFullName != null && index !== -1) {
        add.push({ dayData: { ...dayData, week }, fullName: newFullName, index: index + 1 });
      }
    }
    if (add.length > 0) {
      return new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner({ add });
    } else {
      return planner;
    }
  }

  public static deleteCurrentInstance(
    planner: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    settings: ISettings
  ): IPlannerProgram {
    const evaluatedProgram = Program.evaluate({ ...Program.create("Temp"), planner }, settings);
    const weeks = this.getWeeks2(evaluatedProgram, dayData, fullName);

    for (const week of weeks) {
      const targetDay = evaluatedProgram.weeks[week - 1]?.days[dayData.dayInWeek - 1];

      if (targetDay) {
        const index = targetDay.exercises.findIndex((e) => e.fullName === fullName);
        if (index !== -1) {
          targetDay.exercises.splice(index, 1);
        }
      }
    }

    return new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
  }

  public static changeCurrentInstancePosition(
    planner: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    fromIndex: number,
    toIndex: number,
    settings: ISettings
  ): IPlannerProgram {
    const evaluatedProgram = Program.evaluate({ ...Program.create("Temp"), planner }, settings);
    const weeks = this.getWeeks2(evaluatedProgram, dayData, fullName);
    const reorder = weeks.map((week) => ({ dayData: { ...dayData, week }, fromIndex, toIndex }));
    return new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner({ reorder });
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
