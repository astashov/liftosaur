import { IPlannerProgram, ISettings, IDayData } from "../../types";
import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { IPlannerEvalResult, PlannerExerciseEvaluator, PlannerSyntaxError } from "./plannerExerciseEvaluator";
import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseDescription,
  IPlannerProgramProperty,
  IPlannerProgramExerciseWarmupSet,
} from "./models/types";
import { PlannerKey } from "./plannerKey";
import { ObjectUtils } from "../../utils/object";
import { Weight } from "../../models/weight";

type IByExercise<T> = Record<string, T>;
type IByExerciseWeekDay<T> = Record<string, Record<number, Record<number, T>>>;
type IByWeekDayExercise<T> = Record<number, Record<number, Record<string, T>>>;

interface IPlannerEvalMetadata {
  byExerciseWeekDay: IByExerciseWeekDay<IPlannerProgramExercise>;
  byWeekDayExercise: IByWeekDayExercise<IPlannerProgramExercise>;
  fullNames: Set<string>;
  notused: Set<string>;
  skipProgresses: IByExercise<IPlannerProgramExercise["skipProgress"]>;
  properties: {
    progress: IByExercise<{ property: IPlannerProgramProperty; dayData: Required<IDayData> }>;
    update: IByExercise<{ property: IPlannerProgramProperty; dayData: Required<IDayData> }>;
    warmup: IByExercise<{ warmupSets: IPlannerProgramExerciseWarmupSet[]; dayData: Required<IDayData> }>;
  };
}

export class PlannerEvaluator {
  private static getEvaluatedWeeks(
    plannerProgram: IPlannerProgram,
    settings: ISettings
  ): {
    evaluatedWeeks: IPlannerEvalResult[][];
    metadata: IPlannerEvalMetadata;
  } {
    let dayIndex = 0;
    const fullNames: Set<string> = new Set();
    const byExerciseWeekDay: IByExerciseWeekDay<IPlannerProgramExercise> = {};
    const byWeekDayExercise: IByWeekDayExercise<IPlannerProgramExercise> = {};
    const properties: {
      progress: IByExercise<{ property: IPlannerProgramProperty; dayData: Required<IDayData> }>;
      update: IByExercise<{ property: IPlannerProgramProperty; dayData: Required<IDayData> }>;
      warmup: IByExercise<{ warmupSets: IPlannerProgramExerciseWarmupSet[]; dayData: Required<IDayData> }>;
    } = { progress: {}, update: {}, warmup: {} };
    const skipProgresses: IByExercise<IPlannerProgramExercise["skipProgress"]> = {};
    const notused: Set<string> = new Set();
    const metadata: IPlannerEvalMetadata = {
      byExerciseWeekDay,
      byWeekDayExercise,
      fullNames,
      notused,
      skipProgresses,
      properties,
    };
    const evaluatedWeeks: IPlannerEvalResult[][] = plannerProgram.weeks.map((week, weekIndex) => {
      return week.days.map((day, dayInWeekIndex) => {
        const tree = plannerExerciseParser.parse(day.exerciseText);
        const evaluator = new PlannerExerciseEvaluator(day.exerciseText, settings, "perday", {
          day: dayIndex + 1,
          dayInWeek: dayInWeekIndex + 1,
          week: weekIndex + 1,
        });
        const result = evaluator.evaluate(tree.topNode);
        dayIndex += 1;
        if (result.success) {
          const exercises = result.data[0]?.days[0]?.exercises || [];
          for (const e of exercises) {
            if (byWeekDayExercise[weekIndex]?.[dayInWeekIndex]?.[e.key] != null) {
              return {
                success: false,
                error: PlannerSyntaxError.fromPoint(
                  `Exercise ${e.key} is already used in this day. Combine them together, or add a label to separate out.`,
                  e.points.fullName
                ),
              };
            }
            for (const propertyName of ["progress", "update"] as const) {
              const property = e.properties.find((p) => p.name === propertyName);
              if (property != null) {
                const existingProperty = properties[propertyName][e.key];
                if (
                  existingProperty != null &&
                  property.fnName !== "none" &&
                  !PlannerExerciseEvaluator.isEqualProperty(property, existingProperty.property)
                ) {
                  return {
                    success: false,
                    error: PlannerSyntaxError.fromPoint(
                      `Same property '${propertyName}' is specified with different arguments in multiple weeks/days for exercise '${e.name}': both in ` +
                        `week ${existingProperty.dayData.week + 1}, day ${existingProperty.dayData.dayInWeek + 1} ` +
                        `and week ${weekIndex + 1}, day ${dayInWeekIndex + 1}`,
                      (propertyName === "progress" ? e.points.progressPoint : e.points.updatePoint) || e.points.fullName
                    ),
                  };
                }
                if (propertyName === "progress" && property.fnName === "none") {
                  skipProgresses[e.key] = skipProgresses[e.key] || [];
                  skipProgresses[e.key].push({ week: weekIndex + 1, day: dayInWeekIndex + 1 });
                } else {
                  properties[propertyName][e.key] = {
                    property: property,
                    dayData: { week: weekIndex, dayInWeek: dayInWeekIndex, day: dayIndex },
                  };
                }
              }
            }
            if (e.notused) {
              notused.add(e.key);
            }
            if (e.warmupSets != null) {
              const scheme = JSON.stringify(e.warmupSets);
              const ws = properties.warmup[e.key];
              if (ws != null && JSON.stringify(ws.warmupSets) !== scheme) {
                return {
                  success: false,
                  error: PlannerSyntaxError.fromPoint(
                    `Different warmup sets are specified in multiple weeks/days for exercise '${e.name}': both in ` +
                      `week ${ws.dayData.week + 1}, day ${ws.dayData.dayInWeek + 1} ` +
                      `and week ${weekIndex + 1}, day ${dayInWeekIndex + 1}`,
                    e.points.warmupPoint || e.points.fullName
                  ),
                };
              }
              properties.warmup[e.key] = {
                warmupSets: e.warmupSets,
                dayData: { week: weekIndex, dayInWeek: dayInWeekIndex, day: dayIndex },
              };
            }
            this.setByWeekDayExercise(byWeekDayExercise, e.key, weekIndex, dayInWeekIndex, e);
            this.setByExerciseWeekDay(byExerciseWeekDay, e.key, weekIndex, dayInWeekIndex, e);
            fullNames.add(e.fullName);
          }
          return { success: true, data: exercises };
        } else {
          return result;
        }
      });
    });
    return { evaluatedWeeks, metadata };
  }

  private static fillRepeats(
    exercise: IPlannerProgramExercise,
    evaluatedWeeks: IPlannerEvalResult[][],
    dayIndex: number,
    byExerciseWeekDay: IByExerciseWeekDay<IPlannerProgramExercise>
  ): void {
    for (const repeatWeek of exercise.repeat ?? []) {
      const repeatWeekIndex = repeatWeek - 1;
      if (byExerciseWeekDay[exercise.key]?.[repeatWeekIndex]?.[dayIndex] == null) {
        const repeatedExercise: IPlannerProgramExercise = {
          ...ObjectUtils.clone(exercise),
          repeat: [],
          isRepeat: true,
        };
        this.setByExerciseWeekDay(byExerciseWeekDay, exercise.key, repeatWeekIndex, dayIndex, repeatedExercise);
        const day = evaluatedWeeks[repeatWeekIndex]?.[dayIndex];
        if (day?.success) {
          day.data.push(repeatedExercise);
        }
      }
    }
  }

  private static fillSetReuses(
    exercise: IPlannerProgramExercise,
    evaluatedWeeks: IPlannerEvalResult[][],
    weekIndex: number,
    settings: ISettings
  ): void {
    if (exercise.reuse && exercise.points.reuseSetPoint) {
      const reuse = exercise.reuse;
      const originalExercises = this.findOriginalExercisesAtWeekDay(
        settings,
        reuse.exercise,
        evaluatedWeeks,
        reuse.week ?? weekIndex + 1 ?? 1,
        reuse.day
      );
      if (originalExercises.length > 1) {
        throw PlannerSyntaxError.fromPoint(
          `There're several exercises matching, please be more specific with [week:day] syntax`,
          exercise.points.reuseSetPoint
        );
      }
      const originalExercise = originalExercises[0];
      if (!originalExercise) {
        throw PlannerSyntaxError.fromPoint(
          `No such exercise ${reuse.exercise} at week: ${reuse.week ?? weekIndex + 1}${
            reuse.day != null ? `, day: ${reuse.day}` : ""
          }`,
          exercise.points.reuseSetPoint
        );
      }
      if (originalExercise.reuse?.exercise != null) {
        throw PlannerSyntaxError.fromPoint(
          `Original exercise cannot reuse another exercise's sets x reps`,
          exercise.points.reuseSetPoint
        );
      }
      if (originalExercise.setVariations.length > 1) {
        throw PlannerSyntaxError.fromPoint(
          `Original exercise cannot have mutliple set variations`,
          exercise.points.reuseSetPoint
        );
      }
      exercise.reuse.sets = originalExercise.setVariations[0].sets;
      exercise.reuse.globals = originalExercise.globals;
    }
  }

  private static fillDescriptions(
    exercise: IPlannerProgramExercise,
    evaluatedWeeks: IPlannerEvalResult[][],
    weekIndex: number,
    dayIndex: number
  ): void {
    if (exercise.descriptions == null || exercise.descriptions.length === 0) {
      const lastWeekExercise = this.findLastWeekExercise(
        evaluatedWeeks,
        weekIndex,
        dayIndex,
        exercise,
        (ex) => ex.descriptions != null
      );
      exercise.descriptions = lastWeekExercise?.descriptions || [];
    }
  }

  private static fillDescriptionReuses(
    exercise: IPlannerProgramExercise,
    weekIndex: number,
    byExerciseWeekDay: IByExerciseWeekDay<IPlannerProgramExercise>,
    settings: ISettings
  ): void {
    if (
      exercise.descriptions != null &&
      exercise.descriptions.length === 1 &&
      exercise.descriptions[0].value?.startsWith("...")
    ) {
      const reusingName = exercise.descriptions[0].value.slice(3).trim();
      const descriptions = this.findReusedDescriptions(reusingName, weekIndex, byExerciseWeekDay, settings);
      if (descriptions != null) {
        exercise.descriptions = descriptions;
      }
    }
  }

  private static fillSingleProperties(exercise: IPlannerProgramExercise, metadata: IPlannerEvalMetadata): void {
    if (metadata.notused.has(exercise.key)) {
      exercise.notused = true;
    }

    if (metadata.skipProgresses[exercise.key] != null) {
      exercise.skipProgress = metadata.skipProgresses[exercise.key];
    }

    if (metadata.properties.progress[exercise.key] != null && exercise.properties.every((p) => p.name !== "progress")) {
      exercise.properties.push(metadata.properties.progress[exercise.key].property);
    }

    if (metadata.properties.update[exercise.key] != null && exercise.properties.every((p) => p.name !== "update")) {
      exercise.properties.push(metadata.properties.update[exercise.key].property);
    }

    if (metadata.properties.warmup[exercise.key] != null) {
      exercise.warmupSets = metadata.properties.warmup[exercise.key].warmupSets;
    }
  }

  private static fillProgressReuses(
    exercise: IPlannerProgramExercise,
    settings: ISettings,
    metadata: IPlannerEvalMetadata
  ): void {
    const progress = exercise.properties.find((p) => p.name === "progress");
    if (progress?.fnName === "custom") {
      if (progress.body) {
        const key = PlannerKey.fromFullName(progress.body, settings);
        const point = exercise.points.progressPoint || exercise.points.fullName;
        if (!metadata.byExerciseWeekDay[key] == null) {
          throw PlannerSyntaxError.fromPoint(`No such exercise ${progress.body}`, point);
        }
        const originalProgress = metadata.properties.progress[key]?.property;
        if (!originalProgress) {
          throw PlannerSyntaxError.fromPoint("Original exercise should specify progress", point);
        }
        if (originalProgress.body != null) {
          throw PlannerSyntaxError.fromPoint(`Original exercise cannot reuse another progress`, point);
        }
        if (originalProgress.fnName !== "custom") {
          throw PlannerSyntaxError.fromPoint("Original exercise should specify custom progress", point);
        }
        const fnArgs = originalProgress.fnArgs;
        const originalState = PlannerExerciseEvaluator.fnArgsToStateVars(originalProgress.fnArgs);
        const state = PlannerExerciseEvaluator.fnArgsToStateVars(fnArgs);
        for (const stateKey of ObjectUtils.keys(originalState)) {
          const value = originalState[stateKey];
          if (state[stateKey] == null) {
            throw PlannerSyntaxError.fromPoint(`Missing state variable ${stateKey}`, point);
          }
          if (Weight.type(value) !== Weight.type(state[stateKey])) {
            throw PlannerSyntaxError.fromPoint(`Wrong type of state variable ${stateKey}`, point);
          }
        }
        progress.reuse = originalProgress;
      }
    }
  }

  private static fillUpdateReuses(
    exercise: IPlannerProgramExercise,
    settings: ISettings,
    metadata: IPlannerEvalMetadata
  ): void {
    const update = exercise.properties.find((p) => p.name === "update");
    if (update?.fnName === "custom") {
      if (update.body) {
        const key = PlannerKey.fromFullName(update.body, settings);
        const point = exercise.points.updatePoint || exercise.points.fullName;

        if (!metadata.byExerciseWeekDay[key] == null) {
          throw PlannerSyntaxError.fromPoint(`No such exercise ${update.body}`, point);
        }
        const originalUpdate = metadata.properties.update[key]?.property;
        if (!originalUpdate) {
          throw PlannerSyntaxError.fromPoint("Original exercise should specify update", point);
        }
        if (originalUpdate.body != null) {
          throw PlannerSyntaxError.fromPoint(`Original exercise cannot reuse another update`, point);
        }
        if (originalUpdate.fnName !== "custom") {
          throw PlannerSyntaxError.fromPoint("Original exercise should specify custom update", point);
        }
        update.reuse = originalUpdate;
      }
    }
  }

  public static postProcess(
    evaluatedWeeks: IPlannerEvalResult[][],
    settings: ISettings,
    metadata: IPlannerEvalMetadata
  ): void {
    this.iterateOverExercises(evaluatedWeeks, (weekIndex, dayIndex, exerciseIndex, exercise) => {
      this.fillDescriptions(exercise, evaluatedWeeks, weekIndex, dayIndex);
      this.fillRepeats(exercise, evaluatedWeeks, dayIndex, metadata.byExerciseWeekDay);
      this.fillSingleProperties(exercise, metadata);
    });

    this.iterateOverExercises(evaluatedWeeks, (weekIndex, dayIndex, exerciseIndex, exercise) => {
      this.fillSetReuses(exercise, evaluatedWeeks, weekIndex, settings);
      this.fillDescriptionReuses(exercise, weekIndex, metadata.byExerciseWeekDay, settings);
      this.fillProgressReuses(exercise, settings, metadata);
      this.fillUpdateReuses(exercise, settings, metadata);
    });
  }

  public static findReusedDescriptions(
    reusingName: string,
    currentWeekIndex: number,
    byExerciseWeekDay: IByExerciseWeekDay<IPlannerProgramExercise>,
    settings: ISettings
  ): IPlannerProgramExerciseDescription[] | undefined {
    const weekDayMatch = reusingName.match(/\[([^]+)\]/);
    let weekIndex: number | undefined;
    let dayIndex: number | undefined;
    if (weekDayMatch != null) {
      const [dayOrWeekStr, dayStr] = weekDayMatch[1].split(":");
      if (dayStr != null) {
        weekIndex = parseInt(dayOrWeekStr, 10);
        weekIndex = isNaN(weekIndex) ? undefined : weekIndex - 1;
        dayIndex = parseInt(dayStr, 10);
        dayIndex = isNaN(dayIndex) ? undefined : dayIndex - 1;
      } else {
        dayIndex = parseInt(dayOrWeekStr, 10);
        dayIndex = isNaN(dayIndex) ? undefined : dayIndex - 1;
      }
    }
    reusingName = reusingName.replace(/\[([^]+)\]/, "").trim();
    const key = PlannerKey.fromFullName(reusingName, settings);
    const weekExercises = ObjectUtils.values(byExerciseWeekDay[key]?.[weekIndex ?? currentWeekIndex] || []);
    const weekDescriptions = weekExercises.map((d) => d.descriptions);
    if (dayIndex != null) {
      return weekDescriptions[dayIndex];
    } else {
      return weekDescriptions[0];
    }
  }

  public static findOriginalExercisesAtWeekDay(
    settings: ISettings,
    fullName: string,
    program: IPlannerEvalResult[][],
    atWeek: number,
    atDay?: number
  ): IPlannerProgramExercise[] {
    const originalExercises: IPlannerProgramExercise[] = [];
    const week = program[atWeek - 1];
    if (week != null) {
      for (let dayIndex = 0; dayIndex < week.length; dayIndex++) {
        if (atDay == null || atDay === dayIndex + 1) {
          const day = week[dayIndex];
          if (day.success) {
            for (const e of day.data) {
              const reusingKey = PlannerKey.fromPlannerExercise(e, settings);
              const originalKey = PlannerKey.fromFullName(fullName, settings);
              if (reusingKey === originalKey) {
                originalExercises.push(e);
              }
            }
          }
        }
      }
    }
    return originalExercises;
  }

  public static evaluate(
    plannerProgram: IPlannerProgram,
    settings: ISettings
  ): { evaluatedWeeks: IPlannerEvalResult[][]; exerciseFullNames: string[] } {
    const { evaluatedWeeks, metadata } = this.getEvaluatedWeeks(plannerProgram, settings);
    this.postProcess(evaluatedWeeks, settings, metadata);
    return { evaluatedWeeks, exerciseFullNames: Array.from(metadata.fullNames) };
  }

  private static findLastWeekExercise(
    program: IPlannerEvalResult[][],
    weekIndex: number,
    dayIndex: number,
    exercise: IPlannerProgramExercise,
    cond?: (ex: IPlannerProgramExercise) => boolean
  ): IPlannerProgramExercise | undefined {
    for (
      let i = weekIndex - 1, lastWeekDay = program[i]?.[dayIndex];
      i >= 0 && lastWeekDay != null;
      i -= 1, lastWeekDay = program[i]?.[dayIndex]
    ) {
      if (lastWeekDay.success) {
        const lastWeekExercise = lastWeekDay.data.find((ex) => ex.key === exercise.key);
        if (lastWeekExercise != null && (cond == null || cond(lastWeekExercise))) {
          return lastWeekExercise;
        }
      }
    }
    return undefined;
  }

  private static setByExerciseWeekDay<T, U extends Record<string, Record<number, Record<number, T>>>>(
    coll: U,
    exercise: string,
    weekIndex: number,
    dayIndex: number,
    val: T
  ): void {
    coll[exercise as keyof U] = coll[exercise as keyof U] || {};
    coll[exercise as keyof U][weekIndex] = coll[exercise as keyof U][weekIndex] || {};
    coll[exercise as keyof U][weekIndex][dayIndex] = val;
  }

  private static setByWeekDayExercise<T, U extends Record<number, Record<number, Record<string, T>>>>(
    coll: U,
    exercise: string,
    weekIndex: number,
    dayIndex: number,
    val: T
  ): void {
    coll[weekIndex] = coll[weekIndex] || {};
    coll[weekIndex][dayIndex] = coll[weekIndex][dayIndex] || {};
    coll[weekIndex][dayIndex][exercise] = val;
  }

  private static iterateOverExercises(
    program: IPlannerEvalResult[][],
    cb: (weekIndex: number, dayIndex: number, exerciseIndex: number, exercise: IPlannerProgramExercise) => void
  ): void {
    for (let weekIndex = 0; weekIndex < program.length; weekIndex += 1) {
      const week = program[weekIndex];
      for (let dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
        const day = week[dayIndex];
        try {
          if (day?.success) {
            const exercises = day.data;
            for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
              cb(weekIndex, dayIndex, exerciseIndex, exercises[exerciseIndex]);
            }
          }
        } catch (e) {
          if (e instanceof PlannerSyntaxError) {
            week[dayIndex] = { success: false, error: e };
          } else {
            throw e;
          }
        }
      }
    }
  }
}
