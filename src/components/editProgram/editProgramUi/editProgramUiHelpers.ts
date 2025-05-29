import { PP } from "../../../models/pp";
import { PlannerProgram } from "../../../pages/planner/models/plannerProgram";
import {
  IPlannerExerciseState,
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
} from "../../../pages/planner/models/types";
import { PlannerEvaluator } from "../../../pages/planner/plannerEvaluator";
import { PlannerKey } from "../../../pages/planner/plannerKey";
import { IPlannerProgram, ISettings, IDayData, IExerciseType, IDaySetData } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { IPlannerEvalResult, PlannerExerciseEvaluator } from "../../../pages/planner/plannerExerciseEvaluator";
import { equipmentName, Exercise } from "../../../models/exercise";
import { IPlannerEvaluatedProgramToTextOpts } from "../../../pages/planner/plannerEvaluatedProgramToText";
import { IEvaluatedProgram, Program } from "../../../models/program";
import { ProgramToPlanner } from "../../../models/programToPlanner";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { lb, LensBuilder } from "lens-shmens";
import { UidFactory } from "../../../utils/generator";
import { Weight } from "../../../models/weight";
import { IState, updateState } from "../../../models/state";
import { IDispatch } from "../../../ducks/types";

export class EditProgramUiHelpers {
  public static changeFirstInstance(
    planner: IPlannerProgram,
    plannerExercise: IPlannerProgramExercise,
    settings: ISettings,
    shouldValidate: boolean,
    cb: (exercise: IPlannerProgramExercise) => void
  ): IPlannerProgram {
    const key = PlannerKey.fromFullName(plannerExercise.fullName, settings);
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));
    PP.iterate2(evaluatedProgram.weeks, (e) => {
      const aKey = PlannerKey.fromFullName(e.fullName, settings);
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
    dispatch: IDispatch,
    plannerDispatch: ILensDispatch<IPlannerExerciseState>,
    fullName: string,
    value: string | undefined,
    settings: ISettings
  ): void {
    const { name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, settings);
    const newKey = PlannerKey.fromLabelNameAndEquipment(value, name, equipment, settings);
    const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
    plannerDispatch([
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeAllInstances(program, fullName, settings, true, (e) => {
          e.label = value;
        });
      }),
    ]);
    updateState(dispatch, [
      (
        lb<IState>().p("screenStack").findBy("name", "editProgramExercise").p("params") as LensBuilder<
          IState,
          { key: string },
          {}
        >
      )
        .pi("key")
        .record(newKey),
    ]);
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
      })
    );
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
    const evaluatedProgram = ObjectUtils.clone(Program.evaluate({ ...Program.create("Temp"), planner }, settings));

    const weeks = this.getWeeks2(evaluatedProgram, dayData, fullName, plannerExercise.isRepeat);
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

  public static changeRepeating(
    planner: IPlannerProgram,
    dayData: Required<IDayData>,
    repeatTo: number,
    fullName: string,
    settings: ISettings,
    shouldValidate: boolean
  ): IPlannerProgram {
    const evaluatedProgram = Program.evaluate({ ...Program.create("Temp"), planner }, settings);

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
    const evaluatedProgram = Program.evaluate({ ...Program.create("Temp"), planner }, settings);
    const { week, dayInWeek } = dayData;
    const targetDay = evaluatedProgram.weeks[week - 1]?.days[dayInWeek - 1];
    let { name } = PlannerExerciseEvaluator.extractNameParts(fullName, settings);

    const add = [];
    if (targetDay) {
      const newExercise: IPlannerProgramExercise = {
        fullName: fullName,
        shortName: fullName,
        key: PlannerKey.fromFullName(fullName, settings),
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
    const evaluatedProgram = Program.evaluate({ ...Program.create("Temp"), planner }, settings);
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
    const evaluatedProgram = Program.evaluate({ ...Program.create("Temp"), planner }, settings);
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
