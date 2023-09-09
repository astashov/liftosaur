import { IPlannerProgram, IPlannerProgramExercise } from "../pages/planner/models/types";
import { IPlannerEvalResult, PlannerExerciseEvaluator } from "../pages/planner/plannerExerciseEvaluator";
import { parser as plannerExerciseParser } from "../pages/planner/plannerExerciseParser";
import {
  IAllCustomExercises,
  IDayData,
  IProgram,
  IProgramDay,
  IProgramExercise,
  IProgramExerciseVariation,
  IProgramSet,
  IProgramWeek,
} from "../types";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { Exercise, IExercise } from "./exercise";
import { Settings } from "./settings";
import { Weight } from "./weight";

interface IPotentialWeeksAndDays {
  dayData: Required<IDayData>[];
  exercises: string[];
}

type IExerciseTypeToDayData = Record<string, Array<{ dayData: Required<IDayData>; exercise: IPlannerProgramExercise }>>;

type IExerciseTypeToPotentialVariations = Record<
  string,
  Record<string, { dayDatas: Required<IDayData>[]; programSets: IProgramSet[]; schema: string; exercise: IExercise }>
>;

export class PlannerToProgram {
  private _evaluatedWeeks?: IPlannerEvalResult[][];

  constructor(
    private readonly plannerProgram: IPlannerProgram,
    private readonly customExercises: IAllCustomExercises
  ) {}

  private getEvaluatedWeeks(): IPlannerEvalResult[][] {
    if (this._evaluatedWeeks == null) {
      this._evaluatedWeeks = this.plannerProgram.weeks.map((week) => {
        return week.days.map((day) => {
          const tree = plannerExerciseParser.parse(day.exerciseText);
          const evaluator = new PlannerExerciseEvaluator(day.exerciseText, this.customExercises);
          return evaluator.evaluate(tree.topNode);
        });
      });
    }
    return this._evaluatedWeeks;
  }

  private getPotentialWeeksAndDays(): IPotentialWeeksAndDays[] {
    const exercisesToWeeksDays: Record<string, IPotentialWeeksAndDays> = {};
    const evaluatedWeeks = this.getEvaluatedWeeks();
    let day = 0;
    for (let week = 0; week < evaluatedWeeks.length; week += 1) {
      for (let dayInWeek = 0; dayInWeek < evaluatedWeeks[week].length; dayInWeek += 1) {
        const result = evaluatedWeeks[week][dayInWeek];
        if (result.success) {
          const exs = result.data;
          const names = exs.map((e) => e.name);
          const key = names.join("|");
          exercisesToWeeksDays[key] = exercisesToWeeksDays[key] || {};
          exercisesToWeeksDays[key].dayData = exercisesToWeeksDays[key].dayData || [];
          exercisesToWeeksDays[key].exercises = exercisesToWeeksDays[key].exercises || [];
          exercisesToWeeksDays[key].dayData.push({ week, dayInWeek, day });
          exercisesToWeeksDays[key].exercises = names;
        }
        day += 1;
      }
    }
    return ObjectUtils.values(exercisesToWeeksDays);
  }

  public getExerciseTypeToDayData(): IExerciseTypeToDayData {
    const evaluatedWeeks = this.getEvaluatedWeeks();
    const plannerExercises: IExerciseTypeToDayData = {};
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
            const liftosaurExercise = Exercise.findByName(exercise.name, Settings.build().exercises);
            if (!liftosaurExercise) {
              continue;
            }
            const name = `${liftosaurExercise.id}_${exercise.equipment || liftosaurExercise.defaultEquipment}`;
            plannerExercises[name] = plannerExercises[name] || [];
            plannerExercises[name].push({
              dayData: {
                week: weekIndex,
                day: dayIndex,
                dayInWeek: dayInWeekIndex,
              },
              exercise,
            });
          }
        }
        dayIndex += 1;
      }
    }

    return plannerExercises;
  }

  public getExerciseTypeToPotentialVariations(): IExerciseTypeToPotentialVariations {
    const settings = Settings.build();
    const exerciseTypeToDayData = this.getExerciseTypeToDayData();
    const potentialVariations: IExerciseTypeToPotentialVariations = {};
    for (const dayDatas of ObjectUtils.values(exerciseTypeToDayData)) {
      const exercise = Exercise.findByName(dayDatas[0].exercise.name, settings.exercises);
      if (!exercise) {
        continue;
      }

      for (const dayData of dayDatas) {
        const programSets: IProgramSet[] = [];
        const ex = dayData.exercise;

        for (const set of ex.sets) {
          if (set.repRange) {
            for (let i = 0; i < set.repRange.numberOfSets; i += 1) {
              let weightExpr;
              if (set.weight) {
                weightExpr = `${set.weight.value}${set.weight.unit}`;
              } else if (set.percentage) {
                weightExpr = `state.weight * ${set.percentage / 100}`;
              } else {
                const multiplier = Weight.rpeMultiplier(set.repRange.maxrep, set.rpe || 10);
                weightExpr = `state.weight * ${multiplier}`;
              }

              const minrep = set.repRange.minrep !== set.repRange.maxrep ? set.repRange.minrep : undefined;
              const programSet: IProgramSet = {
                minRepsExpr: minrep ? `${minrep}` : undefined,
                repsExpr: `${set.repRange.maxrep}`,
                weightExpr: weightExpr,
                isAmrap: !!set.repRange?.isAmrap,
                rpeExpr: set.rpe ? `${set.rpe}` : undefined,
              };
              programSets.push(programSet);
            }
          }
        }
        const schema = programSets
          .reduce<string[]>((memo, programSet) => {
            let set = `${
              programSet.minRepsExpr ? `${programSet.minRepsExpr}-${programSet.repsExpr}` : programSet.repsExpr
            }`;
            set += `:${programSet.weightExpr}`;
            if (programSet.isAmrap) {
              set += `+`;
            }
            return [...memo, set];
          }, [])
          .join("/");

        const exid = `${exercise.id}_${dayDatas[0].exercise.equipment || exercise.defaultEquipment}`;
        potentialVariations[exid] = potentialVariations[exid] || {};
        potentialVariations[exid][schema] = potentialVariations[exid][schema] || {
          dayDatas: [],
          programSets: [],
          schema,
          exercise,
        };
        potentialVariations[exid][schema].dayDatas.push({
          day: dayData.dayData.day,
          week: dayData.dayData.week,
          dayInWeek: dayData.dayData.dayInWeek,
        });
        potentialVariations[exid][schema].schema = schema;
        potentialVariations[exid][schema].programSets = programSets;
      }
    }
    return potentialVariations;
  }

  private buildProgramExerciseTimers(): Record<
    string,
    Record<string, Array<Required<IDayData> & { setIndex?: number }>>
  > {
    const evaluatedWeeks = this.getEvaluatedWeeks();
    const timers: Record<string, Record<string, Array<Required<IDayData> & { setIndex?: number }>>> = {};
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
            const liftosaurExercise = Exercise.findByName(exercise.name, Settings.build().exercises);
            if (liftosaurExercise) {
              const name = `${liftosaurExercise.id}_${exercise.equipment || liftosaurExercise.defaultEquipment}`;
              timers[name] = timers[name] || {};
              const globalTimer = exercise.sets.find((s) => s.repRange == null && s.timer != null)?.timer;
              let globalSetIndex = 0;
              for (let setIndex = 0; setIndex < exercise.sets.length; setIndex += 1) {
                const numberOfSets = exercise.sets[setIndex].repRange?.numberOfSets || 0;
                const timer = (exercise.sets[setIndex].timer ?? globalTimer)?.toString();
                if (timer != null) {
                  const sameTimerForAllSets = exercise.sets.every(
                    (s) => s.timer != null && s.timer.toString() === timer
                  );
                  timers[name][timer] = timers[name][timer] || [];
                  if (sameTimerForAllSets) {
                    timers[name][timer].push({
                      day: dayIndex,
                      week: weekIndex,
                      dayInWeek: dayInWeekIndex,
                    });
                  } else {
                    for (let setSubindex = 0; setSubindex < numberOfSets; setSubindex += 1) {
                      timers[name][timer].push({
                        day: dayIndex,
                        week: weekIndex,
                        dayInWeek: dayInWeekIndex,
                        setIndex: globalSetIndex + setSubindex,
                      });
                    }
                  }
                }
                globalSetIndex += numberOfSets;
              }
            }
          }
        }
        dayIndex += 1;
      }
    }
    return timers;
  }

  private buildProgramExercises(): {
    programExercises: IProgramExercise[];
    exerciseNamesToIds: Record<string, string>;
  } {
    const exerciseTypeToPotentialVariations = this.getExerciseTypeToPotentialVariations();
    const exerciseNamesToIds: Record<string, string> = {};
    const exerciseTypeToTimers = this.buildProgramExerciseTimers();
    const programExercises = Object.keys(exerciseTypeToPotentialVariations).map((exerciseType) => {
      const potentialVariations = ObjectUtils.values(exerciseTypeToPotentialVariations[exerciseType]);
      const exercise = potentialVariations[0].exercise;
      const variationIndexToDayDatas: Record<number, Required<IDayData>[]> = {};
      const timersForExercise = exerciseTypeToTimers[exerciseType];
      const variations: IProgramExerciseVariation[] = potentialVariations.map((v, i) => {
        variationIndexToDayDatas[i] = v.dayDatas;
        return {
          sets: v.programSets,
        };
      });
      const weekToDayInWeeks = ObjectUtils.values(variationIndexToDayDatas).reduce<Record<number, number[]>>(
        (memo, v) => {
          for (const dayData of v) {
            memo[dayData.week] = memo[dayData.week] || [];
            memo[dayData.week].push(dayData.dayInWeek);
          }
          return memo;
        },
        {}
      );
      let variationExpr = ObjectUtils.keys(variationIndexToDayDatas).reduce((acc, index) => {
        const dayDatas = variationIndexToDayDatas[index];
        const groupByWeek = dayDatas.reduce<Record<number, number[]>>((memo, dayData) => {
          memo[dayData.week] = memo[dayData.week] || [];
          memo[dayData.week].push(dayData.dayInWeek);
          return memo;
        }, {});
        const expr = ObjectUtils.keys(groupByWeek).reduce<string[]>((memo, week) => {
          const days = groupByWeek[week];
          const daysInWeek = weekToDayInWeeks[week];
          const useDayInWeek = daysInWeek.length > 1;
          if (days.length === 1) {
            if (useDayInWeek) {
              memo.push(`(week == ${Number(week) + 1} && dayInWeek == ${Number(days[0]) + 1})`);
            } else {
              memo.push(`(week == ${Number(week) + 1})`);
            }
          } else {
            memo.push(
              `(week == ${Number(week) + 1} && (${days.map((d) => `dayInWeek == ${Number(d) + 1}`).join(" || ")}))`
            );
          }
          return memo;
        }, []);
        return acc + `${expr.join(" || ")} ? ${Number(index) + 1} :\n`;
      }, "");
      variationExpr += ` 1`;

      let timerExpr: string | undefined = undefined;
      if (timersForExercise && ObjectUtils.keys(timersForExercise).length > 0) {
        const weekToDayInWeeks2 = ObjectUtils.values(timersForExercise).reduce<Record<number, number[]>>((memo, v) => {
          for (const dayData of v) {
            memo[dayData.week] = memo[dayData.week] || [];
            if (memo[dayData.week].indexOf(dayData.dayInWeek) === -1) {
              memo[dayData.week].push(dayData.dayInWeek);
            }
          }
          return memo;
        }, {});
        timerExpr = ObjectUtils.keys(timersForExercise).reduce((acc, timer) => {
          const dayDatas = timersForExercise[timer];
          const groupByWeek = dayDatas.reduce<Record<number, Record<number, number[]>>>((memo, dayData) => {
            memo[dayData.week] = memo[dayData.week] || [];
            memo[dayData.week][dayData.dayInWeek] = memo[dayData.week][dayData.dayInWeek] || [];
            if (dayData.setIndex != null) {
              memo[dayData.week][dayData.dayInWeek].push(dayData.setIndex);
            }
            return memo;
          }, {});
          const expr = ObjectUtils.keys(groupByWeek)
            .map((week) => {
              const days = groupByWeek[week];
              const cond = [`week == ${Number(week) + 1}`];
              const daysInWeek = weekToDayInWeeks2[week];
              const useDayInWeek = daysInWeek.length > 1;
              const condDays = [];
              for (const dayInWeek of Object.keys(days)) {
                if (useDayInWeek) {
                  condDays.push(`dayInWeek == ${Number(dayInWeek) + 1}`);
                }
                const condSetIndexes = [];
                for (const setIndex of days[0]) {
                  condSetIndexes.push(`setIndex == ${setIndex + 1}`);
                }
                if (condSetIndexes.length > 0) {
                  condDays.push(`(${condSetIndexes.join(" || ")})`);
                }
              }
              if (condDays.length > 0) {
                cond.push(`(${condDays.join(" && ")})`);
              }
              return `(${cond.join(" && ")})`;
            })
            .join(" || ");
          acc += `${expr} ? ${timer} :\n`;
          return acc;
        }, "");
        timerExpr += "180";
      }

      const id = UidFactory.generateUid(8);
      exerciseNamesToIds[exercise.name] = id;

      const isWithRpe = variations.some((v) => v.sets.some((s) => !!s.rpeExpr));
      const iwWithRepRanges = variations.some((v) => v.sets.some((s) => !!s.minRepsExpr));

      const programExercise: IProgramExercise = {
        id,
        name: exercise.name,
        variationExpr,
        variations,
        finishDayExpr: "",
        exerciseType: exercise,
        state: { weight: exercise.startingWeightLb },
        descriptions: [],
        enableRpe: isWithRpe,
        enableRepRanges: iwWithRepRanges,
        timerExpr,
      };
      return programExercise;
    });
    return { programExercises, exerciseNamesToIds };
  }

  public convert(): IProgram {
    const potentialWeeksAndDays = this.getPotentialWeeksAndDays();
    const { programExercises, exerciseNamesToIds } = this.buildProgramExercises();

    const weeks: IProgramWeek[] = [];
    const days: IProgramDay[] = [];
    for (const value of potentialWeeksAndDays) {
      const id = UidFactory.generateUid(8);
      const dayInWeeks = Array.from(new Set(value.dayData.map((d) => d.dayInWeek)));
      const day: IProgramDay = {
        id,
        name: `Day ${dayInWeeks.map((d) => d + 1).join("/")}`,
        exercises: value.exercises.map((e) => ({ id: exerciseNamesToIds[e] })),
      };
      days.push(day);
      for (const dayData of value.dayData) {
        let week: IProgramWeek | undefined = weeks[dayData.week];
        if (week == null) {
          week = {
            id: UidFactory.generateUid(8),
            name: `Week ${dayData.week + 1}`,
            days: [],
          };
          weeks[dayData.week] = week;
        }
        week.days[dayData.dayInWeek] = { id: day.id };
      }
    }
    const isMultiweek = weeks.length > 1;

    const program: IProgram = {
      id: UidFactory.generateUid(8),
      name: "My Program",
      description: "Generated from a Workout Planner",
      url: "",
      author: "",
      nextDay: 1,
      exercises: programExercises,
      days: days,
      weeks: isMultiweek ? weeks : [],
      isMultiweek,
      tags: [],
    };

    console.log("program", program);
    return program;
  }
}
