import { IPlannerProgram, ISettings, IDayData, IPlannerProgramDay } from "../../types";
import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import memoize from "micro-memoize";
import {
  IPlannerEvalFullResult,
  IPlannerEvalResult,
  PlannerExerciseEvaluator,
  PlannerSyntaxError,
} from "./plannerExerciseEvaluator";
import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseWarmupSet,
  IProgramExerciseProgress,
  IProgramExerciseUpdate,
  IProgramExerciseDescriptions,
} from "./models/types";
import { PlannerKey } from "./plannerKey";
import { ObjectUtils } from "../../utils/object";
import { Weight } from "../../models/weight";
import { PlannerProgram } from "./models/plannerProgram";
import { PP } from "../../models/pp";
import { ScriptRunner } from "../../parser";
import { Progress } from "../../models/progress";
import { LiftoscriptSyntaxError } from "../../liftoscriptEvaluator";
import { IPlannerEvaluatedProgramToTextOpts, PlannerEvaluatedProgramToText } from "./plannerEvaluatedProgramToText";
import { IEither } from "../../utils/types";
import { PlannerProgramExercise } from "./models/plannerProgramExercise";

export type IByTag<T> = Record<number, T>;
export type IByExercise<T> = Record<string, T>;
export type IByExerciseWeekDay<T> = Record<string, Record<number, Record<number, T>>>;
export type IByWeekDayExercise<T> = Record<number, Record<number, Record<string, T>>>;

interface IPlannerEvalMetadata {
  byExerciseWeekDay: IByExerciseWeekDay<IPlannerProgramExercise>;
  byWeekDayExercise: IByWeekDayExercise<IPlannerProgramExercise>;
  fullNames: Set<string>;
  notused: Set<string>;
  properties: {
    id: IByExercise<{ property: number[]; dayData: Required<IDayData> }>;
    progress: IByExercise<{ property: IProgramExerciseProgress; dayData: Required<IDayData> }>;
    update: IByExercise<{ property: IProgramExerciseUpdate; dayData: Required<IDayData> }>;
    warmup: IByExercise<{ warmupSets: IPlannerProgramExerciseWarmupSet[]; dayData: Required<IDayData> }>;
  };
}

export class PlannerEvaluator {
  private static fillInMetadata(
    exercise: IPlannerProgramExercise,
    metadata: IPlannerEvalMetadata,
    dayData: Required<IDayData>
  ): void {
    if (metadata.byWeekDayExercise[dayData.week - 1]?.[dayData.dayInWeek - 1]?.[exercise.key] != null) {
      throw PlannerSyntaxError.fromPoint(
        exercise.fullName,
        `Exercise ${exercise.key} is already used in this day. Combine them together, or add a label to separate out.`,
        exercise.points.fullName
      );
    }
    const tagsProp = exercise.tags;
    if (tagsProp != null && tagsProp.length > 0) {
      const existingTags = metadata.properties.id[exercise.key];
      if (existingTags != null && !ObjectUtils.isEqual(existingTags.property, tagsProp)) {
        const point = exercise.points.idPoint || exercise.points.fullName;
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `Same property 'id' is specified with different arguments in multiple weeks/days for exercise '${exercise.name}': both in ` +
            `week ${existingTags.dayData.week + 1}, day ${existingTags.dayData.dayInWeek + 1} ` +
            `and week ${dayData.week}, day ${dayData.dayInWeek}`,
          point
        );
      }
      metadata.properties.id[exercise.key] = {
        property: tagsProp,
        dayData,
      };
    }

    const progressProp = exercise.progress;
    if (progressProp != null && progressProp.type !== "none") {
      const existingProgress = metadata.properties.progress[exercise.key];
      if (
        existingProgress != null &&
        !PlannerExerciseEvaluator.isEqualProgress(progressProp, existingProgress.property)
      ) {
        const point = exercise.points.progressPoint || exercise.points.fullName;
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `Same property 'progress' is specified with different arguments in multiple weeks/days for exercise '${exercise.name}': both in ` +
            `week ${existingProgress.dayData.week + 1}, day ${existingProgress.dayData.dayInWeek + 1} ` +
            `and week ${dayData.week}, day ${dayData.dayInWeek}`,
          point
        );
      }
      metadata.properties.progress[exercise.key] = {
        property: progressProp,
        dayData,
      };
    }

    const updateProp = exercise.update;
    if (updateProp != null) {
      const existingUpdate = metadata.properties.update[exercise.key];
      if (existingUpdate != null && !PlannerExerciseEvaluator.isEqualUpdate(updateProp, existingUpdate.property)) {
        const point = exercise.points.updatePoint || exercise.points.fullName;
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `Same property 'update' is specified with different arguments in multiple weeks/days for exercise '${exercise.name}': both in ` +
            `week ${existingUpdate.dayData.week + 1}, day ${existingUpdate.dayData.dayInWeek + 1} ` +
            `and week ${dayData.week}, day ${dayData.dayInWeek}`,
          point
        );
      }
      metadata.properties.update[exercise.key] = {
        property: updateProp,
        dayData,
      };
    }
    if (exercise.notused) {
      metadata.notused.add(exercise.key);
    }
    if (exercise.warmupSets != null) {
      const scheme = JSON.stringify(exercise.warmupSets);
      const ws = metadata.properties.warmup[exercise.key];
      if (ws != null && JSON.stringify(ws.warmupSets) !== scheme) {
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `Different warmup sets are specified in multiple weeks/days for exercise '${exercise.name}': both in ` +
            `week ${ws.dayData.week + 1}, day ${ws.dayData.dayInWeek + 1} ` +
            `and week ${dayData.week}, day ${dayData.dayInWeek}`,
          exercise.points.warmupPoint || exercise.points.fullName
        );
      }
      metadata.properties.warmup[exercise.key] = {
        warmupSets: exercise.warmupSets,
        dayData,
      };
    }
    this.setByWeekDayExercise(
      metadata.byWeekDayExercise,
      exercise.key,
      dayData.week - 1,
      dayData.dayInWeek - 1,
      exercise
    );
    this.setByExerciseWeekDay(
      metadata.byExerciseWeekDay,
      exercise.key,
      dayData.week - 1,
      dayData.dayInWeek - 1,
      exercise
    );
    metadata.fullNames.add(exercise.fullName);
  }

  public static evaluateDay(
    day: IPlannerProgramDay,
    dayData: Required<IDayData>,
    settings: ISettings
  ): IPlannerEvalResult {
    const tree = plannerExerciseParser.parse(day.exerciseText);
    const evaluator = new PlannerExerciseEvaluator(day.exerciseText, settings, "perday", dayData);
    const result = evaluator.evaluate(tree.topNode);
    if (result.success) {
      const exercises = result.data[0]?.days[0]?.exercises || [];
      return { success: true, data: exercises };
    } else {
      return result;
    }
  }

  public static getPerDayEvaluatedWeeks(
    plannerProgram: IPlannerProgram,
    settings: ISettings
  ): {
    evaluatedWeeks: IPlannerEvalResult[][];
    metadata: IPlannerEvalMetadata;
  } {
    let dayIndex = 0;
    const metadata: IPlannerEvalMetadata = {
      byExerciseWeekDay: {},
      byWeekDayExercise: {},
      fullNames: new Set(),
      notused: new Set(),
      properties: { progress: {}, update: {}, warmup: {}, id: {} },
    };
    const evaluatedWeeks: IPlannerEvalResult[][] = plannerProgram.weeks.map((week, weekIndex) => {
      return week.days.map((day, dayInWeekIndex) => {
        const dayData = {
          week: weekIndex + 1,
          dayInWeek: dayInWeekIndex + 1,
          day: dayIndex + 1,
        };
        const result = this.evaluateDay(
          day,
          { week: weekIndex + 1, dayInWeek: dayInWeekIndex + 1, day: dayIndex + 1 },
          settings
        );
        dayIndex += 1;
        if (result.success) {
          const exercises = result.data;
          for (const exercise of exercises) {
            try {
              this.fillInMetadata(exercise, metadata, dayData);
            } catch (e) {
              if (e instanceof PlannerSyntaxError) {
                return { success: false, error: e };
              } else {
                throw e;
              }
            }
          }
          return { success: true, data: exercises };
        } else {
          return result;
        }
      });
    });
    return { evaluatedWeeks, metadata };
  }

  public static changeExerciseName(text: string, from: string, to: string, settings: ISettings): string {
    const evaluator = new PlannerExerciseEvaluator(text, settings, "perday");
    const tree = plannerExerciseParser.parse(text);
    const result = evaluator.changeExerciseName(tree.topNode, from, to);
    return result;
  }

  private static getFullEvaluatedWeeks(
    fullProgramText: string,
    settings: ISettings
  ): {
    evaluatedWeeks: IPlannerEvalFullResult;
    metadata: IPlannerEvalMetadata;
  } {
    let dayIndex = 0;
    const metadata: IPlannerEvalMetadata = {
      byExerciseWeekDay: {},
      byWeekDayExercise: {},
      fullNames: new Set(),
      notused: new Set(),
      properties: { progress: {}, update: {}, warmup: {}, id: {} },
    };
    const evaluator = new PlannerExerciseEvaluator(fullProgramText, settings, "full");
    const tree = plannerExerciseParser.parse(fullProgramText);
    const result = evaluator.evaluate(tree.topNode);
    if (result.success) {
      try {
        for (let weekIndex = 0; weekIndex < result.data.length; weekIndex += 1) {
          const week = result.data[weekIndex];
          for (let dayInWeekIndex = 0; dayInWeekIndex < week.days.length; dayInWeekIndex += 1) {
            const day = week.days[dayInWeekIndex];
            const exercises = day.exercises;
            for (const exercise of exercises) {
              const dayData = { week: weekIndex + 1, dayInWeek: dayInWeekIndex + 1, day: dayIndex + 1 };
              this.fillInMetadata(exercise, metadata, dayData);
            }
            dayIndex += 1;
          }
        }
      } catch (e) {
        if (e instanceof PlannerSyntaxError) {
          return { evaluatedWeeks: { success: false, error: e }, metadata };
        } else {
          throw e;
        }
      }
      return { evaluatedWeeks: result, metadata };
    } else {
      return { evaluatedWeeks: result, metadata };
    }
  }

  private static getDayIndexFromWeekAndDayInWeekIndex(
    evaluatedWeeks: IPlannerEvalResult[][],
    weekIndex: number,
    dayInWeekIndex: number
  ): number | undefined {
    let dayIndex = 0;
    for (let i = 0; i < evaluatedWeeks.length; i += 1) {
      const week = evaluatedWeeks[i];
      for (let j = 0; j < week.length; j += 1) {
        if (i === weekIndex && j === dayInWeekIndex) {
          return dayIndex;
        }
        dayIndex += 1;
      }
    }
    return undefined;
  }

  private static fillRepeats(
    exercise: IPlannerProgramExercise,
    evaluatedWeeks: IPlannerEvalResult[][],
    dayInWeekIndex: number,
    byExerciseWeekDay: IByExerciseWeekDay<IPlannerProgramExercise>
  ): void {
    for (const repeatWeek of exercise.repeat ?? []) {
      const repeatWeekIndex = repeatWeek - 1;
      if (byExerciseWeekDay[exercise.key]?.[repeatWeekIndex]?.[dayInWeekIndex] == null) {
        const dayData = {
          week: repeatWeek,
          dayInWeek: dayInWeekIndex + 1,
          day: (this.getDayIndexFromWeekAndDayInWeekIndex(evaluatedWeeks, repeatWeekIndex, dayInWeekIndex) ?? 0) + 1,
        };
        const repeatedExercise: IPlannerProgramExercise = {
          ...ObjectUtils.clone(exercise),
          repeat: [],
          dayData,
          isRepeat: true,
        };
        this.setByExerciseWeekDay(byExerciseWeekDay, exercise.key, repeatWeekIndex, dayInWeekIndex, repeatedExercise);
        const day = evaluatedWeeks[repeatWeekIndex]?.[dayInWeekIndex];
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
        reuse.fullName,
        evaluatedWeeks,
        reuse.week ?? weekIndex + 1 ?? 1,
        reuse.day
      );
      if (originalExercises.length > 1) {
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `There're several exercises matching, please be more specific with [week:day] syntax`,
          exercise.points.reuseSetPoint
        );
      }
      const originalExercise = originalExercises[0];
      if (!originalExercise) {
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `No such exercise ${reuse.fullName} at week: ${reuse.week ?? weekIndex + 1}${
            reuse.day != null ? `, day: ${reuse.day}` : ""
          }`,
          exercise.points.reuseSetPoint
        );
      }
      if (originalExercise.exercise.reuse?.fullName != null) {
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `Original exercise cannot reuse another exercise's sets x reps`,
          exercise.points.reuseSetPoint
        );
      }
      if (originalExercise.exercise.progress?.reuse != null && exercise.progress == null) {
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `This exercise doesn't specify progress - so the original exercise's progress cannot reuse another exercise's progress`,
          exercise.points.reuseSetPoint
        );
      }
      if (originalExercise.exercise.update?.reuse != null && exercise.update == null) {
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `This exercise doesn't specify 'update' - so the original exercise's 'update' cannot reuse another exercise's 'update'`,
          exercise.points.reuseSetPoint
        );
      }
      if (originalExercise.exercise.progress != null && exercise.progress == null) {
        exercise.progress = {
          type: originalExercise.exercise.progress.type,
          state: ObjectUtils.clone(originalExercise.exercise.progress.state),
          stateMetadata: ObjectUtils.clone(originalExercise.exercise.progress.stateMetadata),
          reuse: { fullName: originalExercise.exercise.fullName },
        };
      }

      exercise.reuse.exercise = originalExercise.exercise;
    }
  }

  private static fillEvaluatedSetVariations(exercise: IPlannerProgramExercise): void {
    const setVariations = PlannerProgramExercise.setVariations(exercise);
    const evaluatedSetVariations = PlannerProgramExercise.evaluateSetVariations(exercise, setVariations);
    exercise.evaluatedSetVariations = evaluatedSetVariations;
  }

  private static fillDescriptions(
    exercise: IPlannerProgramExercise,
    evaluatedWeeks: IPlannerEvalResult[][],
    weekIndex: number,
    dayIndex: number
  ): void {
    if (exercise.descriptions == null || exercise.descriptions.values.length === 0) {
      const lastWeekExercise = this.findLastWeekExercise(
        evaluatedWeeks,
        weekIndex,
        dayIndex,
        exercise,
        (ex) => ex.descriptions != null
      );
      if (lastWeekExercise && lastWeekExercise.descriptions) {
        exercise.descriptions = ObjectUtils.clone(lastWeekExercise.descriptions);
      }
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
      exercise.descriptions.values.length === 1 &&
      exercise.descriptions.values[0].value?.startsWith("...")
    ) {
      const reusingName = exercise.descriptions.values[0].value.slice(3).trim();
      const result = this.findReusedDescriptions(reusingName, weekIndex, byExerciseWeekDay, settings);
      if (result != null) {
        const { descriptions, exercise: originalExercise } = result;
        exercise.descriptions = {
          values: [...ObjectUtils.clone(descriptions.values)],
          reuse: { fullName: originalExercise.fullName, exercise: originalExercise },
        };
      }
    }
  }

  private static fillSingleProperties(exercise: IPlannerProgramExercise, metadata: IPlannerEvalMetadata): void {
    if (metadata.notused.has(exercise.key)) {
      exercise.notused = true;
    }

    if (metadata.properties.progress[exercise.key] != null) {
      const existingProgress = exercise.progress;
      if (!existingProgress) {
        exercise.progress = metadata.properties.progress[exercise.key].property;
      }
    }

    if (metadata.properties.update[exercise.key] != null && !exercise.update) {
      exercise.update = metadata.properties.update[exercise.key].property;
    }

    if (metadata.properties.warmup[exercise.key] != null) {
      exercise.warmupSets = metadata.properties.warmup[exercise.key].warmupSets;
    }
  }

  private static fillProgressReuses(
    evaluatedWeeks: IPlannerEvalResult[][],
    exercise: IPlannerProgramExercise,
    settings: ISettings,
    metadata: IPlannerEvalMetadata
  ): void {
    const progress = exercise.progress;
    if (progress?.type === "custom") {
      const fullName = progress.reuse?.fullName;
      if (progress.reuse && fullName) {
        const key = PlannerKey.fromFullName(fullName, settings);
        const point = exercise.points.progressPoint || exercise.points.fullName;
        if (metadata.byExerciseWeekDay[key] == null) {
          throw PlannerSyntaxError.fromPoint(exercise.fullName, `No such exercise ${fullName}`, point);
        }
        const originalProperty = metadata.properties.progress[key];
        const dayData = originalProperty?.dayData;
        const originalProgress = originalProperty?.property;
        if (!originalProgress || !dayData) {
          throw PlannerSyntaxError.fromPoint(exercise.fullName, "Original exercise should specify progress", point);
        }
        if (originalProgress.reuse?.fullName != null) {
          throw PlannerSyntaxError.fromPoint(
            exercise.fullName,
            `Original exercise cannot reuse another progress`,
            point
          );
        }
        if (originalProgress.type !== "custom") {
          throw PlannerSyntaxError.fromPoint(
            exercise.fullName,
            "Original exercise should specify custom progress",
            point
          );
        }
        const originalState = originalProgress.state;
        const state = progress.state;
        for (const stateKey of ObjectUtils.keys(originalState)) {
          const value = originalState[stateKey];
          if (state[key] != null && Weight.type(value) !== Weight.type(state[stateKey])) {
            throw PlannerSyntaxError.fromPoint(exercise.fullName, `Wrong type of state variable ${stateKey}`, point);
          }
        }
        const originalExercises = this.findOriginalExercisesAtWeekDay(
          settings,
          fullName,
          evaluatedWeeks,
          dayData.week,
          dayData.dayInWeek
        );
        const originalExercise = originalExercises[0]?.exercise;
        if (
          originalExercise?.reuse != null &&
          (originalExercise.progress == null || originalExercise.progress.reuse != null)
        ) {
          throw PlannerSyntaxError.fromPoint(
            exercise.fullName,
            `Original exercise '${originalExercise.fullName}' should not reuse other exercise`,
            point
          );
        }
        progress.reuse.exercise = originalExercise;
      }
    }
  }

  private static checkUpdateScript(exercise: IPlannerProgramExercise, settings: ISettings, dayData: IDayData): void {
    const update = exercise.update;
    if (update?.type === "custom") {
      const { script, liftoscriptNode } = update;
      if (script && liftoscriptNode) {
        const exerciseType = PlannerProgramExercise.getExercise(exercise, settings);
        const state = PlannerProgramExercise.getState(exercise);
        const liftoscriptEvaluator = new ScriptRunner(
          script,
          state,
          {},
          Progress.createEmptyScriptBindings(dayData, settings),
          Progress.createScriptFunctions(settings),
          settings.units,
          { exerciseType, unit: settings.units, prints: [] },
          "update"
        );
        try {
          liftoscriptEvaluator.parse();
        } catch (e) {
          if (e instanceof LiftoscriptSyntaxError && liftoscriptNode) {
            const [line] = PlannerExerciseEvaluator.getLineAndOffset(script, liftoscriptNode);
            throw new PlannerSyntaxError(
              e.message,
              line + e.line,
              e.offset,
              liftoscriptNode.from + e.from,
              liftoscriptNode.from + e.to
            );
          } else {
            throw e;
          }
        }
      }
    }
  }

  private static fillUpdateReuses(
    evaluatedWeeks: IPlannerEvalResult[][],
    exercise: IPlannerProgramExercise,
    settings: ISettings,
    metadata: IPlannerEvalMetadata
  ): void {
    const update = exercise.update;
    if (update?.type === "custom") {
      const fullName = update.reuse?.fullName;
      if (update.reuse && fullName) {
        const key = PlannerKey.fromFullName(fullName, settings);
        const point = exercise.points.updatePoint || exercise.points.fullName;

        if (metadata.byExerciseWeekDay[key] == null) {
          throw PlannerSyntaxError.fromPoint(exercise.fullName, `No such exercise ${fullName}`, point);
        }
        const originalProperty = metadata.properties.update[key];
        const originalUpdate = originalProperty?.property;
        const dayData = originalProperty?.dayData;
        if (!originalUpdate || !dayData) {
          throw PlannerSyntaxError.fromPoint(exercise.fullName, "Original exercise should specify update", point);
        }
        if (originalUpdate.reuse?.fullName != null) {
          throw PlannerSyntaxError.fromPoint(exercise.fullName, `Original exercise cannot reuse another update`, point);
        }
        if (originalUpdate.type !== "custom") {
          throw PlannerSyntaxError.fromPoint(
            exercise.fullName,
            "Original exercise should specify custom update",
            point
          );
        }
        const stateKeys = originalUpdate.meta?.stateKeys || new Set();
        if (stateKeys.size !== 0) {
          const progress = exercise.progress;
          if (progress == null) {
            throw PlannerSyntaxError.fromPoint(
              exercise.fullName,
              "If 'update' block uses state variables, exercise should define them in 'progress' block",
              point
            );
          }
          const state = PlannerProgramExercise.getState(exercise);
          for (const stateKey of stateKeys) {
            if (state[stateKey] == null) {
              throw PlannerSyntaxError.fromPoint(
                exercise.fullName,
                `Missing state variable ${stateKey} that's used in the original update block`,
                point
              );
            }
          }
        }
        const originalExercises = this.findOriginalExercisesAtWeekDay(
          settings,
          fullName,
          evaluatedWeeks,
          dayData.week,
          dayData.dayInWeek
        );
        const originalExercise = originalExercises[0]?.exercise;
        if (
          originalExercise?.reuse != null &&
          (originalExercise.update == null || originalExercise.update.reuse != null)
        ) {
          throw PlannerSyntaxError.fromPoint(
            exercise.fullName,
            `Original exercise '${originalExercise.fullName}' should not reuse other exercise`,
            point
          );
        }
        update.reuse.exercise = originalExercise;
      }
    }
  }

  private static getFirstErrorFromEvaluatedWeeks(
    evaluatedWeeks: IPlannerEvalResult[][]
  ): PlannerSyntaxError | undefined {
    for (const week of evaluatedWeeks) {
      for (const day of week) {
        if (!day.success) {
          return day.error;
        }
      }
    }
    return undefined;
  }

  public static evaluatedProgramToText(
    oldPlannerProgram: IPlannerProgram,
    evaluatedWeeks: IPlannerEvalResult[][],
    settings: ISettings,
    opts: IPlannerEvaluatedProgramToTextOpts = {}
  ): IEither<IPlannerProgram, PlannerSyntaxError> {
    const result = new PlannerEvaluatedProgramToText(oldPlannerProgram, evaluatedWeeks, settings).run(opts);
    console.log(PlannerProgram.generateFullText(result.weeks));
    const { evaluatedWeeks: newEvaluatedWeeks } = this.evaluate(result, settings);
    const error = this.getFirstErrorFromEvaluatedWeeks(newEvaluatedWeeks);
    if (error) {
      return { success: false, error: error };
    } else {
      return { success: true, data: result };
    }
  }

  public static postProcess(
    evaluatedWeeks: IPlannerEvalResult[][],
    settings: ISettings,
    metadata: IPlannerEvalMetadata
  ): void {
    this.iterateOverExercises(evaluatedWeeks, (weekIndex, dayInWeekIndex, dayIndex, exerciseIndex, exercise) => {
      this.fillDescriptions(exercise, evaluatedWeeks, weekIndex, dayInWeekIndex);
      this.fillRepeats(exercise, evaluatedWeeks, dayInWeekIndex, metadata.byExerciseWeekDay);
      this.fillSingleProperties(exercise, metadata);
      this.checkUnknownExercises(exercise, metadata);
    });

    this.iterateOverExercises(evaluatedWeeks, (weekIndex, dayInWeekIndex, dayIndex, exerciseIndex, exercise) => {
      this.fillSetReuses(exercise, evaluatedWeeks, weekIndex, settings);
      this.fillDescriptionReuses(exercise, weekIndex, metadata.byExerciseWeekDay, settings);
      this.fillProgressReuses(evaluatedWeeks, exercise, settings, metadata);
      this.fillUpdateReuses(evaluatedWeeks, exercise, settings, metadata);
      this.checkUpdateScript(exercise, settings, {
        week: weekIndex + 1,
        dayInWeek: dayInWeekIndex + 1,
        day: dayInWeekIndex + 1,
      });
    });
    this.iterateOverExercises(evaluatedWeeks, (weekIndex, dayInWeekIndex, dayIndex, exerciseIndex, exercise) => {
      this.fillEvaluatedSetVariations(exercise);
    });
  }

  public static checkUnknownExercises(exercise: IPlannerProgramExercise, metadata: IPlannerEvalMetadata): void {
    if (exercise.exerciseType == null && !metadata.notused.has(exercise.key)) {
      throw PlannerSyntaxError.fromPoint(
        exercise.fullName,
        `Unknown exercise ${exercise.name}`,
        exercise.points.fullName
      );
    }
  }

  public static findReusedDescriptions(
    reusingName: string,
    currentWeekIndex: number,
    byExerciseWeekDay: IByExerciseWeekDay<IPlannerProgramExercise>,
    settings: ISettings
  ): { descriptions: IProgramExerciseDescriptions; exercise: IPlannerProgramExercise } | undefined {
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
    const index = dayIndex ?? 0;
    if (weekDescriptions[index]) {
      return { descriptions: weekDescriptions[index], exercise: weekExercises[index] };
    } else {
      return undefined;
    }
  }

  public static findOriginalExercisesAtWeekDay(
    settings: ISettings,
    fullName: string,
    program: IPlannerEvalResult[][],
    atWeek: number,
    atDay?: number
  ): { exercise: IPlannerProgramExercise; dayData: Required<IDayData> }[] {
    const originalExercises: { exercise: IPlannerProgramExercise; dayData: Required<IDayData> }[] = [];
    PP.iterate(program, (exercise, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
      if (weekIndex === atWeek - 1 && (atDay == null || atDay === dayInWeekIndex + 1)) {
        const reusingKey = PlannerKey.fromPlannerExercise(exercise, settings);
        const originalKey = PlannerKey.fromFullName(fullName, settings);
        if (reusingKey === originalKey) {
          originalExercises.push({
            exercise,
            dayData: {
              week: atWeek,
              dayInWeek: dayInWeekIndex + 1,
              day: dayIndex + 1,
            },
          });
        }
      }
    });
    return originalExercises;
  }

  public static evaluate = memoize(
    (
      plannerProgram: IPlannerProgram,
      settings: ISettings
    ): {
      evaluatedWeeks: IPlannerEvalResult[][];
      exerciseFullNames: string[];
    } => {
      const { evaluatedWeeks, metadata } = PlannerEvaluator.getPerDayEvaluatedWeeks(plannerProgram, settings);
      PlannerEvaluator.postProcess(evaluatedWeeks, settings, metadata);
      return { evaluatedWeeks, exerciseFullNames: Array.from(metadata.fullNames) };
    },
    { maxSize: 10 }
  );

  public static evaluateFull(
    fullProgramText: string,
    settings: ISettings
  ): { evaluatedWeeks: IPlannerEvalFullResult; exerciseFullNames: string[] } {
    const { evaluatedWeeks, metadata } = this.getFullEvaluatedWeeks(fullProgramText, settings);
    if (evaluatedWeeks.success) {
      const perDayEvaluatedWeeks = PlannerProgram.fullToWeekEvalResult(evaluatedWeeks);
      this.postProcess(perDayEvaluatedWeeks, settings, metadata);
      for (const week of perDayEvaluatedWeeks) {
        for (const day of week) {
          if (!day.success) {
            return {
              evaluatedWeeks: { success: false, error: day.error },
              exerciseFullNames: Array.from(metadata.fullNames),
            };
          }
        }
      }
    }
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
    cb: (
      weekIndex: number,
      dayInWeekIndex: number,
      dayIndex: number,
      exerciseIndex: number,
      exercise: IPlannerProgramExercise
    ) => void
  ): void {
    let dayIndex = 0;
    for (let weekIndex = 0; weekIndex < program.length; weekIndex += 1) {
      const week = program[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        try {
          if (day?.success) {
            const exercises = day.data;
            for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
              cb(weekIndex, dayInWeekIndex, dayIndex, exerciseIndex, exercises[exerciseIndex]);
            }
          }
        } catch (e) {
          if (e instanceof PlannerSyntaxError) {
            week[dayInWeekIndex] = { success: false, error: e };
          } else {
            throw e;
          }
        }
        dayIndex += 1;
      }
    }
  }
}
