import {
  IPlannerProgramExercise,
  IPlannerProgramProperty,
  IPlannerProgramExerciseWarmupSet,
} from "../pages/planner/models/types";
import { IPlannerEvalResult } from "../pages/planner/plannerExerciseEvaluator";
import {
  IDayData,
  IPlannerProgram,
  IProgram,
  IProgramDay,
  IProgramExercise,
  IProgramExerciseVariation,
  IProgramExerciseWarmupSet,
  IProgramSet,
  IProgramWeek,
  ISettings,
  IUnit,
  IWeight,
} from "../types";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { Exercise, IExercise } from "./exercise";
import { IProgramState } from "../types";
import { Progression } from "./progression";
import {
  IExerciseTypeToProperties,
  IExerciseTypeToWarmupSets,
  PlannerProgram,
} from "../pages/planner/models/plannerProgram";
import { CollectionUtils } from "../utils/collection";
import { StringUtils } from "../utils/string";
import { Weight } from "./weight";
import { MathUtils } from "../utils/math";

interface IPotentialWeeksAndDays {
  dayData: Required<IDayData>[];
  names: string[];
  exercises: {
    label?: string;
    name: string;
    equipment?: string;
  }[];
}

type IExerciseTypeToDayData = Record<string, Array<{ dayData: Required<IDayData>; exercise: IPlannerProgramExercise }>>;

type IExerciseTypeToPotentialVariations = Record<
  string,
  Record<
    string,
    {
      dayDatas: Required<IDayData>[];
      programSets: IProgramSet[];
      schema: string;
      exercise: IExercise;
      plannerExercise: IPlannerProgramExercise;
    }
  >
>;

export class PlannerToProgram {
  private _evaluatedWeeks?: IPlannerEvalResult[][];

  constructor(private readonly plannerProgram: IPlannerProgram, private readonly settings: ISettings) {}

  private getEvaluatedWeeks(): IPlannerEvalResult[][] {
    if (this._evaluatedWeeks == null) {
      this._evaluatedWeeks = PlannerProgram.evaluate(this.plannerProgram, this.settings);
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
          const names = exs.map((e) => CollectionUtils.compact([e.label, e.name, e.equipment]).join("_"));
          const key = names.join("|").toLowerCase();
          exercisesToWeeksDays[key] = exercisesToWeeksDays[key] || {};
          exercisesToWeeksDays[key].dayData = exercisesToWeeksDays[key].dayData || [];
          exercisesToWeeksDays[key].exercises =
            exercisesToWeeksDays[key].exercises ||
            exs.map((e) => ({
              label: e.label,
              name: e.name,
              equipment: e.equipment,
            }));
          exercisesToWeeksDays[key].dayData.push({ week, dayInWeek, day });
          exercisesToWeeksDays[key].names = names;
        }
        day += 1;
      }
    }
    return ObjectUtils.values(exercisesToWeeksDays);
  }

  private generateEquipmentTypeAndDayData(
    cb: (exercise: IPlannerProgramExercise, name: string, dayData: Required<IDayData>) => void
  ): void {
    const evaluatedWeeks = this.getEvaluatedWeeks();
    PlannerProgram.generateExerciseTypeAndDayData(evaluatedWeeks, this.settings.exercises, cb);
  }

  private getExerciseTypeToProperties(): IExerciseTypeToProperties {
    return PlannerProgram.getExerciseTypeToProperties(this.getEvaluatedWeeks(), this.settings.exercises);
  }

  private getExerciseTypeToWarmupSets(): IExerciseTypeToWarmupSets {
    return PlannerProgram.getExerciseTypeToWarmupSets(this.getEvaluatedWeeks(), this.settings.exercises);
  }

  public getExerciseTypeToDayData(): IExerciseTypeToDayData {
    const plannerExercises: IExerciseTypeToDayData = {};
    this.generateEquipmentTypeAndDayData((exercise, name, dayData) => {
      plannerExercises[name] = plannerExercises[name] || [];
      plannerExercises[name].push({ dayData: dayData, exercise });
    });
    return plannerExercises;
  }

  public getExerciseTypeToPotentialVariations(): IExerciseTypeToPotentialVariations {
    const exerciseTypeToDayData = this.getExerciseTypeToDayData();
    const potentialVariations: IExerciseTypeToPotentialVariations = {};
    for (const dayDatas of ObjectUtils.values(exerciseTypeToDayData)) {
      const exercise = Exercise.findByName(dayDatas[0].exercise.name, this.settings.exercises);
      if (!exercise) {
        continue;
      }
      exercise.equipment = dayDatas[0].exercise.equipment ?? exercise.defaultEquipment;

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
                weightExpr = `state.weight${set.percentage !== 100 ? ` * ${set.percentage / 100}` : ""}`;
              } else {
                const rpe = set.rpe || 10;
                weightExpr = `state.weight * rpeMultiplier(${set.repRange.maxrep}${rpe < 10 ? `, ${rpe}` : ""})`;
              }

              const minrep = set.repRange.minrep !== set.repRange.maxrep ? set.repRange.minrep : undefined;
              const progression = ex.properties.find((p) => p.name === "progress");
              const programSet: IProgramSet = {
                minRepsExpr: minrep ? `${minrep}${progression?.fnName === "dp" ? " + state.addreps" : ""}` : undefined,
                repsExpr: `${set.repRange.maxrep}${progression?.fnName === "dp" ? " + state.addreps" : ""}`,
                weightExpr: weightExpr,
                isAmrap: !!set.repRange?.isAmrap,
                rpeExpr: set.rpe ? `${set.rpe}` : undefined,
                logRpe: !!set.logRpe,
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
            if (programSet.rpeExpr) {
              set += `@${programSet.rpeExpr}`;
            }
            return [...memo, set];
          }, [])
          .join("/");

        const exid = PlannerProgram.generateExerciseTypeKey(dayDatas[0].exercise, exercise);
        potentialVariations[exid] = potentialVariations[exid] || {};
        potentialVariations[exid][schema] = potentialVariations[exid][schema] || {
          dayDatas: [],
          programSets: [],
          schema,
          exercise,
          plannerExercise: dayData.exercise,
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
    const timers: Record<string, Record<string, Array<Required<IDayData> & { setIndex?: number }>>> = {};
    this.generateEquipmentTypeAndDayData((exercise, name, dayData) => {
      timers[name] = timers[name] || {};
      let globalSetIndex = 0;
      for (let setIndex = 0; setIndex < exercise.sets.length; setIndex += 1) {
        const numberOfSets = exercise.sets[setIndex].repRange?.numberOfSets || 0;
        const timer = exercise.sets[setIndex].timer;
        if (timer != null) {
          const sameTimerForAllSets = exercise.sets.every((s) => s.timer != null && s.timer === timer);
          timers[name][timer] = timers[name][timer] || [];
          if (sameTimerForAllSets) {
            timers[name][timer].push(dayData);
          } else {
            for (let setSubindex = 0; setSubindex < numberOfSets; setSubindex += 1) {
              timers[name][timer].push({
                ...dayData,
                setIndex: globalSetIndex + setSubindex,
              });
            }
          }
        }
        globalSetIndex += numberOfSets;
      }
    });
    return timers;
  }

  private buildProgramExerciseDescriptions(): Record<string, Record<string, Array<Required<IDayData>>>> {
    const descriptions: Record<string, Record<string, Array<Required<IDayData>>>> = {};
    this.generateEquipmentTypeAndDayData((exercise, name, dayData) => {
      const description = exercise.description || "";
      if (description) {
        descriptions[name] = descriptions[name] || {};
        descriptions[name][description] = descriptions[name][description] || [];
        descriptions[name][description].push(dayData);
      }
    });
    return descriptions;
  }

  private getIncrementAndUnit(raw: string): [number, "%" | IUnit] | undefined {
    const match = raw.match(/lb|kg/);
    const unit = (match ? match[0] : "%") as "%" | IUnit;
    const increment = parseFloat(raw);
    return increment != null && !isNaN(increment) ? [increment, unit] : undefined;
  }

  private addProgression(
    properties: IPlannerProgramProperty[]
  ):
    | {
        additionalState: IProgramState;
        finishDayExpr: string;
      }
    | undefined {
    const progress = properties.find((p) => p.name === "progress");
    if (progress) {
      const defaultIncrement = this.settings.units === "kg" ? "2.5kg" : "5lb";
      const { fnName, fnArgs } = progress;
      if (fnName === "lp") {
        const [increment, unitIncrement] = this.getIncrementAndUnit(fnArgs[0] || defaultIncrement) || [5, "lb"];
        const incrementAttempts = parseInt(fnArgs[1] ?? 1, 10);
        const progression = {
          attempts: incrementAttempts,
          increment: increment,
          unit: unitIncrement,
        };

        let deload: { decrement: number; unit: IUnit | "%"; attempts: number } | undefined = undefined;
        const rawDecrement = fnArgs[2];
        if (rawDecrement != null) {
          const result = this.getIncrementAndUnit(fnArgs[2] || defaultIncrement);
          if (result != null) {
            const [decrement, unitDecrement] = result;
            const decrementAttempts = parseInt(fnArgs[3] ?? 1, 10);
            deload = {
              attempts: decrementAttempts,
              decrement: decrement,
              unit: unitDecrement,
            };
          }
        }
        const finishDayExpr = Progression.setLinearProgression(progression, deload);
        return {
          additionalState: {
            successes: 0,
            failures: 0,
          },
          finishDayExpr,
        };
      } else if (fnName === "sum") {
        const reps = parseInt(fnArgs[0], 10);
        const result = this.getIncrementAndUnit(fnArgs[1] || defaultIncrement);
        if (!isNaN(reps) && result != null) {
          const [increment, unit] = result;
          const finishDayExpr = Progression.setSumRepsProgression(reps, increment, unit);
          return {
            additionalState: {},
            finishDayExpr,
          };
        }
      } else if (fnName === "dp") {
        const range = parseInt(fnArgs[0], 10);
        const result = this.getIncrementAndUnit(fnArgs[1] || defaultIncrement);
        if (!isNaN(range) && result != null) {
          const [increment, unit] = result;
          const finishDayExpr = Progression.setDoubleProgression(range, increment, unit);
          return {
            additionalState: {
              addreps: 0,
            },
            finishDayExpr,
          };
        }
      }
    }
    return undefined;
  }

  private buildProgramExercises(): {
    programExercises: IProgramExercise[];
    exerciseNamesToIds: Record<string, Record<string, string>>;
  } {
    const exerciseTypeToPotentialVariations = this.getExerciseTypeToPotentialVariations();
    const exerciseNamesToIds: Record<string, Record<string, string>> = {};
    const exerciseTypeToTimers = this.buildProgramExerciseTimers();
    const exerciseTypeToDescriptions = this.buildProgramExerciseDescriptions();
    const exerciseTypeToProperties = this.getExerciseTypeToProperties();
    const exerciseTypeToWarmupSets = this.getExerciseTypeToWarmupSets();
    const programExercises = Object.keys(exerciseTypeToPotentialVariations).map((exerciseType) => {
      const potentialVariations = ObjectUtils.values(exerciseTypeToPotentialVariations[exerciseType]);
      const exercise = potentialVariations[0].exercise;
      const variationIndexToDayDatas: Record<number, Required<IDayData>[]> = {};
      const timersForExercise = exerciseTypeToTimers[exerciseType];
      const descriptionsForExercise = exerciseTypeToDescriptions[exerciseType];
      const variations: IProgramExerciseVariation[] = potentialVariations.map((v, i) => {
        variationIndexToDayDatas[i] = v.dayDatas;
        return {
          sets: v.programSets,
        };
      });
      let descriptions: string[] = [""];
      if (descriptionsForExercise) {
        descriptions = descriptions.concat(ObjectUtils.keys(descriptionsForExercise));
      }
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
            memo[dayData.week] = memo[dayData.week] || {};
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
              for (const dayInWeekStr of Object.keys(days)) {
                const dayInWeek = Number(dayInWeekStr);
                if (isNaN(dayInWeek)) {
                  continue;
                }
                if (useDayInWeek) {
                  condDays.push(`dayInWeek == ${dayInWeek + 1}`);
                }
                const condSetIndexes = [];
                for (const setIndex of days[dayInWeek]) {
                  condSetIndexes.push(`setIndex == ${setIndex + 1}`);
                }
                if (condSetIndexes.length > 0) {
                  condDays.push(`(${condSetIndexes.join(" || ")})`);
                }
              }
              if (condDays.length > 0) {
                cond.push(`(${condDays.join(" || ")})`);
              }
              return `(${cond.join(" && ")})`;
            })
            .join(" || ");
          acc += `${expr} ? ${timer} :\n`;
          return acc;
        }, "");
        timerExpr += this.settings.timers.workout;
      }

      let descriptionExpr: string = "1";
      if (descriptionsForExercise && ObjectUtils.keys(descriptionsForExercise).length > 0) {
        const weekToDayInWeeks2 = ObjectUtils.values(descriptionsForExercise).reduce<Record<number, number[]>>(
          (memo, v) => {
            for (const dayData of v) {
              memo[dayData.week] = memo[dayData.week] || [];
              if (memo[dayData.week].indexOf(dayData.dayInWeek) === -1) {
                memo[dayData.week].push(dayData.dayInWeek);
              }
            }
            return memo;
          },
          {}
        );
        descriptionExpr = ObjectUtils.keys(descriptionsForExercise).reduce((acc, desc, i) => {
          const dayDatas = descriptionsForExercise[desc];
          const groupByWeek = dayDatas.reduce<Record<number, number[]>>((memo, dayData) => {
            memo[dayData.week] = memo[dayData.week] || [];
            memo[dayData.week].push(dayData.dayInWeek);
            return memo;
          }, {});
          const expr = ObjectUtils.keys(groupByWeek)
            .map((week) => {
              const days = groupByWeek[week];
              const cond = [`week == ${Number(week) + 1}`];
              const daysInWeek = weekToDayInWeeks2[week];
              const useDayInWeek = daysInWeek.length > 1;
              const condDays = [];
              for (const dayInWeekStr of Object.keys(days)) {
                const dayInWeek = Number(dayInWeekStr);
                if (isNaN(dayInWeek)) {
                  continue;
                }
                if (useDayInWeek) {
                  condDays.push(`dayInWeek == ${dayInWeek + 1}`);
                }
              }
              if (condDays.length > 0) {
                cond.push(`(${condDays.join(" || ")})`);
              }
              return `(${cond.join(" && ")})`;
            })
            .join(" || ");
          acc += `${expr} ? ${i + 2} :\n`;
          return acc;
        }, "");
        descriptionExpr += "1";
      }

      const id = UidFactory.generateUid(8);
      const plannerExercise = potentialVariations[0].plannerExercise;
      const name = CollectionUtils.compact([plannerExercise.label, plannerExercise.name]).join("_").toLowerCase();
      exerciseNamesToIds[name] = exerciseNamesToIds[name] || {};
      exerciseNamesToIds[name][plannerExercise.equipment || "default"] = id;

      const isWithRpe = variations.some((v) => v.sets.some((s) => !!s.rpeExpr));
      const iwWithRepRanges = variations.some((v) => v.sets.some((s) => !!s.minRepsExpr));

      const properties = exerciseTypeToProperties[exerciseType] || [];
      const progressionResult = this.addProgression(properties);
      let finishDayExpr = "";
      let state = {
        weight: this.settings.units === "kg" ? exercise.startingWeightKg : exercise.startingWeightLb,
      };
      if (progressionResult != null) {
        finishDayExpr = progressionResult.finishDayExpr;
        state = { ...state, ...progressionResult.additionalState };
      }

      const plannerWarmupSets = exerciseTypeToWarmupSets[exerciseType];
      const warmupSets = plannerWarmupSets ? this.plannerWarmupSetsToWarmupSets(plannerWarmupSets) : undefined;

      const programExercise: IProgramExercise = {
        id,
        name: exercise.name,
        variationExpr,
        variations,
        finishDayExpr,
        exerciseType: { id: exercise.id, equipment: exercise.equipment },
        descriptionExpr: descriptionExpr || "1",
        descriptions,
        warmupSets,
        state,
        enableRpe: isWithRpe,
        enableRepRanges: iwWithRepRanges,
        timerExpr,
      };
      return programExercise;
    });

    return { programExercises, exerciseNamesToIds };
  }

  private plannerWarmupSetsToWarmupSets(
    plannerWarmupSets: IPlannerProgramExerciseWarmupSet[]
  ): IProgramExerciseWarmupSet[] {
    const warmupSets: IProgramExerciseWarmupSet[] = [];
    for (const plannerWarmupSet of plannerWarmupSets) {
      for (let i = 0; i < plannerWarmupSet.numberOfSets; i += 1) {
        let value: IWeight | number | undefined = plannerWarmupSet.percentage
          ? plannerWarmupSet.percentage / 100
          : undefined;
        if (value == null) {
          value = plannerWarmupSet.weight;
        }
        if (value == null) {
          value = MathUtils.roundTo0005(Weight.rpeMultiplier(plannerWarmupSet.reps, 4));
        }
        warmupSets.push({
          reps: plannerWarmupSet.reps,
          value,
          threshold: Weight.build(0, this.settings.units),
        });
      }
    }
    return warmupSets;
  }

  public convert(): IProgram {
    const potentialWeeksAndDays = this.getPotentialWeeksAndDays();
    const { programExercises, exerciseNamesToIds } = this.buildProgramExercises();

    const weeks: IProgramWeek[] = [];
    const days: IProgramDay[] = [];
    console.log(potentialWeeksAndDays);
    for (const value of potentialWeeksAndDays) {
      const id = UidFactory.generateUid(8);
      const usedDayNames = new Set<string>();
      const dayInWeekNames = Array.from(
        new Set(
          value.dayData.map((d) => {
            const name = this.plannerProgram.weeks[d.week]?.days[d.dayInWeek]?.name ?? `Day ${d.dayInWeek + 1}`;
            usedDayNames.add(name);
            return name;
          })
        )
      );
      let dayName = dayInWeekNames.join(" / ");
      while (days.some((d) => d.name === dayName)) {
        dayName = StringUtils.nextName(dayName);
      }

      const day: IProgramDay = {
        id,
        name: dayName,
        exercises: value.exercises.map((e) => {
          const key = `${e.label ? `${e.label}_` : ""}${e.name}`.toLowerCase();
          return {
            id: exerciseNamesToIds[key][e.equipment || "default"],
          };
        }),
      };
      days.push(day);
      for (const dayData of value.dayData) {
        let week: IProgramWeek | undefined = weeks[dayData.week];
        if (week == null) {
          week = {
            id: UidFactory.generateUid(8),
            name: this.plannerProgram.weeks[dayData.week]?.name ?? `Week ${dayData.week + 1}`,
            days: [],
          };
          weeks[dayData.week] = week;
        }
        week.days[dayData.dayInWeek] = { id: day.id };
      }
    }

    const program: IProgram = {
      id: UidFactory.generateUid(8),
      name: this.plannerProgram.name,
      description: "Generated from a Workout Planner",
      url: "",
      author: "",
      nextDay: 1,
      exercises: programExercises,
      days: days,
      weeks: weeks,
      isMultiweek: true,
      tags: [],
    };

    return program;
  }
}
