import { PP } from "../../../models/pp";
import { PlannerProgram } from "../../../pages/planner/models/plannerProgram";
import {
  IModalExerciseUi,
  IPlannerExerciseState,
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
  IPlannerState,
  IPlannerUi,
} from "../../../pages/planner/models/types";
import { PlannerEvaluator } from "../../../pages/planner/plannerEvaluator";
import { PlannerKey } from "../../../pages/planner/plannerKey";
import { IPlannerProgram, ISettings, IDayData, IExerciseType, IDaySetData, IPlannerProgramDay } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { PlannerExerciseEvaluator } from "../../../pages/planner/plannerExerciseEvaluator";
import { Exercise, IExercise } from "../../../models/exercise";
import { IEvaluatedProgram, Program } from "../../../models/program";
import { ProgramToPlanner } from "../../../models/programToPlanner";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { UidFactory } from "../../../utils/generator";
import { Weight } from "../../../models/weight";

export class EditProgramUiHelpers {
  public static changeFirstInstance(
    planner: IPlannerProgram,
    plannerExercise: IPlannerProgramExercise,
    settings: ISettings,
    shouldValidate: boolean,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const key = PlannerKey.fromFullName(plannerExercise.fullName, settings.exercises);
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));
    PP.iterate2(evaluatedProgram.weeks, (e) => {
      const aKey = PlannerKey.fromFullName(e.fullName, settings.exercises);
      if (key === aKey) {
        cb(e);
        return true;
      }
      return false;
    });
    return this.validate(
      shouldValidate,
      planner,
      new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner(),
      settings
    );
  }

  public static changeLabel(
    planner: IPlannerProgram,
    modalExerciseUi: IModalExerciseUi,
    onProgramChange: (program: IPlannerProgram) => void,
    onUiChange: (modalExerciseUi?: IModalExerciseUi) => void,
    fullName: string,
    value: string | undefined,
    settings: ISettings,
    dayData: Required<IDayData>,
    change?: "all" | "one" | "duplicate"
  ): void {
    const { name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, settings.exercises);
    const newKey = PlannerKey.fromLabelNameAndEquipment(value, name, equipment, settings.exercises);

    if (change === "all") {
      onProgramChange(
        EditProgramUiHelpers.changeAllInstances(planner, fullName, settings, true, (e) => {
          e.label = value;
        })
      );
    } else {
      onProgramChange(
        EditProgramUiHelpers.changeCurrentInstance3(planner, fullName, dayData, false, settings, true, (e) => {
          e.label = value;
        })
      );
    }

    const exercise = Exercise.findByNameEquipment(settings.exercises, name, equipment);
    let newModalExercise = modalExerciseUi;
    if (exercise && modalExerciseUi && modalExerciseUi.fullName === fullName) {
      const newFullName = Exercise.fullName(exercise, settings, value);
      newModalExercise = { ...modalExerciseUi, exerciseKey: newKey, fullName: newFullName };
      onUiChange(newModalExercise);
    }
  }

  public static changeCurrentInstanceExercise(
    dispatch: ILensDispatch<IPlannerExerciseState>,
    plannerExercise: IPlannerProgramExercise,
    settings: ISettings,
    cb: (exercise: IPlannerProgramExercise) => void
  ): void {
    const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
    dispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeCurrentInstance2(program, plannerExercise, settings, true, cb);
      }),
      "Change current exercise instance"
    );
  }

  public static onDaysChange(
    plannerDispatch: ILensDispatch<IPlannerState>,
    ui: IPlannerUi,
    weekIndex: number,
    days: IPlannerProgramDay[],
    cb: (order: boolean[]) => void
  ): void {
    const lbUi = lb<IPlannerState>().p("ui");
    const collapsedOrder = days.map((d, i) => {
      return ui.dayUi.collapsed.has(`${weekIndex}-${i}`);
    });
    cb(collapsedOrder);
    plannerDispatch([
      lbUi
        .p("dayUi")
        .p("collapsed")
        .recordModify((collapsed) => {
          const newCollapsed = new Set<string>(collapsed);
          for (let i = 0; i < collapsedOrder.length; i++) {
            if (collapsedOrder[i]) {
              newCollapsed.add(`${weekIndex}-${i}`);
            } else {
              newCollapsed.delete(`${weekIndex}-${i}`);
            }
          }
          return newCollapsed;
        }),
    ], "Toggle week collapse state");
  }

  public static changeSets(
    planner: IPlannerProgram,
    key: string,
    daySets: IDaySetData[],
    settings: ISettings,
    cb: (set: IPlannerProgramExerciseEvaluatedSet) => void
  ): IPlannerProgram {
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));

    PP.iterate2(evaluatedProgram.weeks, (e, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
      if (e.key !== key) {
        return;
      }
      for (const daySet of daySets) {
        if (daySet.week === weekIndex + 1 && daySet.dayInWeek === dayInWeekIndex + 1) {
          for (let setVariationIndex = 0; setVariationIndex < e.evaluatedSetVariations.length; setVariationIndex++) {
            if (daySet.setVariation === setVariationIndex + 1) {
              const sets = e.evaluatedSetVariations[setVariationIndex].sets;
              for (let setIndex = 0; setIndex < sets.length; setIndex++) {
                if (daySet.set === setIndex + 1) {
                  cb(sets[setIndex]);
                }
              }
            }
          }
        }
      }
    });

    return this.validate(true, planner, new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner(), settings);
  }

  public static changeCurrentInstance2(
    planner: IPlannerProgram,
    plannerExercise: IPlannerProgramExercise,
    settings: ISettings,
    shouldValidate: boolean,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const fullName = plannerExercise.fullName;
    const dayData = plannerExercise.dayData;
    const isRepeat = !!plannerExercise.isRepeat;
    return this.changeCurrentInstance3(planner, fullName, dayData, isRepeat, settings, shouldValidate, cb);
  }

  public static changeCurrentInstance3(
    planner: IPlannerProgram,
    fullName: string,
    dayData: Required<IDayData>,
    isRepeat: boolean,
    settings: ISettings,
    shouldValidate: boolean,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));

    const weeks = this.getWeeks2(evaluatedProgram, dayData, fullName, isRepeat);
    for (const week of weeks) {
      PP.iterate2(evaluatedProgram.weeks, (e, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
        const current = week === weekIndex + 1 && dayData.dayInWeek === dayInWeekIndex + 1 && e.fullName === fullName;
        if (current) {
          cb(e);
        }
      });
    }

    return this.validate(
      shouldValidate,
      planner,
      new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner(),
      settings
    );
  }

  private static validate(
    shouldValidate: boolean,
    oldPlanner: IPlannerProgram,
    newPlanner: IPlannerProgram,
    settings: ISettings
  ): IPlannerProgram {
    if (shouldValidate) {
      const { evaluatedWeeks } = PlannerEvaluator.evaluate(newPlanner, settings);
      const error = PlannerEvaluator.getFirstError(evaluatedWeeks);
      if (error) {
        if (typeof window !== "undefined") {
          alert(error.message);
        }
        return oldPlanner;
      } else {
        return newPlanner;
      }
    } else {
      return newPlanner;
    }
  }

  private static getWeeks2(
    evaluatedProgram: IEvaluatedProgram,
    dayData: Required<IDayData>,
    fullName: string,
    ignoreRepeats: boolean = false
  ): number[] {
    const day = evaluatedProgram.weeks[dayData.week - 1].days[dayData.dayInWeek - 1];
    const weeks: Set<number> = new Set();
    weeks.add(dayData.week);
    const exercise = day.exercises.find((e) => e.fullName === fullName);
    if (!ignoreRepeats && exercise != null) {
      for (const repeating of exercise.repeating) {
        weeks.add(repeating);
      }
    }
    return Array.from(weeks);
  }

  public static duplicateCurrentInstance(
    planner: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    label: string | undefined,
    newExerciseType: IExerciseType | string,
    settings: ISettings
  ): IPlannerProgram {
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));
    const weeks = this.getWeeks2(evaluatedProgram, dayData, fullName);

    const add = [];
    for (const week of weeks) {
      const targetDay = evaluatedProgram.weeks[week - 1]?.days[dayData.dayInWeek - 1];

      let newFullName: string | undefined;
      let index = targetDay.exercises.findIndex((e) => e.fullName === fullName);
      const previousExercise = targetDay.exercises[index];
      if (index !== -1 && previousExercise) {
        let exercise: IExercise | undefined;
        if (typeof newExerciseType === "string") {
          newFullName = `${label ? `${label}: ` : ""}${newExerciseType}`;
        } else {
          exercise = Exercise.get(newExerciseType, settings.exercises);
          newFullName = Exercise.fullName(exercise, settings, label);
        }
        const newExercise: IPlannerProgramExercise = {
          ...ObjectUtils.clone(previousExercise),
          label: label ?? previousExercise.label,
          fullName: newFullName,
          shortName: newFullName,
          notused: typeof newExerciseType === "string" ? true : previousExercise.notused,
          key: PlannerKey.fromFullName(newFullName, settings.exercises),
          exerciseType: typeof newExerciseType === "string" ? undefined : newExerciseType,
          name: exercise ? exercise.name : typeof newExerciseType === "string" ? newExerciseType : "",
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

  public static changeRepeating(
    planner: IPlannerProgram,
    dayData: Required<IDayData>,
    repeatTo: number,
    fullName: string,
    settings: ISettings,
    shouldValidate: boolean
  ): IPlannerProgram {
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));

    let repeatingExercise: IPlannerProgramExercise | undefined;
    const newRepeating: number[] = [];
    for (let week = dayData.week; week <= repeatTo; week += 1) {
      newRepeating.push(week);
    }
    const add = [];
    for (let week = 1; week <= planner.weeks.length; week += 1) {
      const targetDay = evaluatedProgram.weeks[week - 1]?.days[dayData.dayInWeek - 1];
      if (targetDay) {
        const index = targetDay.exercises.findIndex((e) => e.fullName === fullName);
        let exercise = targetDay.exercises[index] as IPlannerProgramExercise | undefined;
        if (exercise && week >= dayData.week && !repeatingExercise) {
          exercise.repeat = newRepeating;
          exercise.repeating = newRepeating;
          repeatingExercise = exercise;
        }
        if (repeatingExercise && week > dayData.week) {
          if (week <= repeatTo && index === -1) {
            exercise = { ...repeatingExercise, isRepeat: true };
            targetDay.exercises.push(exercise);
            add.push({ dayData: { ...dayData, week }, fullName, index: targetDay.exercises.length - 1 });
          } else if (week > repeatTo) {
            targetDay.exercises.splice(index, 1);
          }
        }
        if (repeatingExercise && week > dayData.week && !exercise?.isRepeat) {
          break;
        }
      }
    }
    return this.validate(
      shouldValidate,
      planner,
      new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner({ add }),
      settings
    );
  }

  public static deleteCurrentInstance(
    planner: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    settings: ISettings,
    shouldValidate: boolean,
    allowDeleteEverywhere: boolean
  ): IPlannerProgram {
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));
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

    const newPlanner = this.validate(
      shouldValidate,
      planner,
      new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner(),
      settings
    );
    if (!allowDeleteEverywhere) {
      const newEvaluatedProgram = Program.evaluate({ ...Program.create("Temp"), planner: newPlanner }, settings);
      const firstExercise = Program.getFirstProgramExercise(newEvaluatedProgram, fullName);
      if (!firstExercise) {
        alert("You cannot delete this exercise from all days on the screen. Do it from the Program screen.");
        return planner;
      }
    }
    return newPlanner;
  }

  public static addInstance(
    planner: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    exerciseType: IExerciseType | undefined,
    settings: ISettings
  ): IPlannerProgram {
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));
    const { week, dayInWeek } = dayData;
    const targetDay = evaluatedProgram.weeks[week - 1]?.days[dayInWeek - 1];
    let { label, name } = PlannerExerciseEvaluator.extractNameParts(fullName, settings.exercises);

    const add = [];
    if (targetDay) {
      const newExercise: IPlannerProgramExercise = {
        fullName: fullName,
        shortName: fullName,
        label,
        key: PlannerKey.fromFullName(fullName, settings.exercises),
        exerciseType: exerciseType,
        name: name,
        id: UidFactory.generateUid(8),
        dayData: dayData,
        repeat: [],
        repeating: [],
        order: 0,
        text: "",
        tags: [],
        line: 0,
        evaluatedSetVariations: [
          {
            sets: [
              {
                maxrep: 5,
                weight: Weight.build(100, settings.units),
                logRpe: false,
                isAmrap: false,
                isQuickAddSet: false,
                askWeight: false,
              },
            ],
            isCurrent: true,
          },
        ],
        setVariations: [
          {
            sets: [
              {
                repRange: {
                  isQuickAddSet: false,
                  maxrep: 5,
                  isAmrap: false,
                  numberOfSets: 1,
                },
                weight: Weight.build(100, settings.units),
                logRpe: false,
                askWeight: false,
              },
            ],
            isCurrent: true,
          },
        ],
        descriptions: { values: [] },
        globals: {},
        points: {
          fullName: {
            line: 0,
            offset: 0,
            from: 0,
            to: 0,
          },
        },
      };
      targetDay.exercises.push(newExercise);
      add.push({ dayData, fullName, index: targetDay.exercises.length });
    }

    return this.validate(
      true,
      planner,
      new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner({ add }),
      settings
    );
  }

  public static changeCurrentInstancePosition(
    planner: IPlannerProgram,
    dayData: Required<IDayData>,
    fullName: string,
    fromIndex: number,
    toIndex: number,
    settings: ISettings
  ): IPlannerProgram {
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));
    const weeks = this.getWeeks2(evaluatedProgram, dayData, fullName);
    const reorder = weeks.map((week) => ({ dayData: { ...dayData, week }, fromIndex, toIndex }));
    return new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner({ reorder });
  }

  public static changeAllInstances(
    planner: IPlannerProgram,
    fullName: string,
    settings: ISettings,
    shouldValidate: boolean,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));
    PP.iterate2(evaluatedProgram.weeks, (e) => {
      if (e.fullName === fullName) {
        cb(e);
      }
    });
    return this.validate(
      shouldValidate,
      planner,
      new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner(),
      settings
    );
  }

  public static getChangedKeys(
    oldPlanner: IPlannerProgram,
    newPlanner: IPlannerProgram,
    settings: ISettings
  ): Partial<Record<string, string>> {
    const { evaluatedWeeks: oldEvaluatedWeeks } = ObjectUtils.clone(PlannerProgram.evaluate(oldPlanner, settings));
    const { evaluatedWeeks: newEvaluatedWeeks } = ObjectUtils.clone(PlannerProgram.evaluate(newPlanner, settings));
    const changedKeys: Partial<Record<string, string>> = {};
    for (let weekIndex = 0; weekIndex < oldEvaluatedWeeks.length; weekIndex++) {
      const oldWeek = oldEvaluatedWeeks[weekIndex];
      const newWeek = newEvaluatedWeeks[weekIndex];
      if (oldWeek && newWeek) {
        for (let dayInWeekIndex = 0; dayInWeekIndex < oldWeek.length; dayInWeekIndex++) {
          const oldDay = oldWeek[dayInWeekIndex];
          const newDay = newWeek[dayInWeekIndex];
          if (oldDay && newDay) {
            if (oldDay.success && newDay.success) {
              for (let exerciseIndex = 0; exerciseIndex < oldDay.data.length; exerciseIndex++) {
                const oldExercise = oldDay.data[exerciseIndex];
                const newExercise = newDay.data[exerciseIndex];
                if (oldExercise && newExercise && oldExercise.key !== newExercise.key) {
                  changedKeys[oldExercise.key] = newExercise.key;
                }
              }
            }
          }
        }
      }
    }
    return changedKeys;
  }
}
