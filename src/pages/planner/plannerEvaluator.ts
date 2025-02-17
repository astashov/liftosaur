import { IPlannerProgram, ISettings, IDayData, IPlannerProgramDay, IWeekAndDay } from "../../types";
import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import memoize from "micro-memoize";
import {
  IPlannerEvalFullResult,
  IPlannerEvalResult,
  IPlannerSyntaxPointer,
  PlannerExerciseEvaluator,
  PlannerSyntaxError,
} from "./plannerExerciseEvaluator";
import { IPlannerProgramExercise, IPlannerProgramExerciseDescription, IPlannerProgramReuse } from "./models/types";
import { PlannerKey } from "./plannerKey";
import { ObjectUtils } from "../../utils/object";
import { Weight } from "../../models/weight";
import { PlannerProgram } from "./models/plannerProgram";
import { ScriptRunner } from "../../parser";
import { Progress } from "../../models/progress";
import { LiftoscriptSyntaxError } from "../../liftoscriptEvaluator";
import { IPlannerEvaluatedProgramToTextOpts, PlannerEvaluatedProgramToText } from "./plannerEvaluatedProgramToText";
import { IEither } from "../../utils/types";
import { PlannerProgramExercise } from "./models/plannerProgramExercise";
import { CollectionUtils } from "../../utils/collection";

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
  };
}

export class PlannerEvaluator {
  private static fillInMetadata(
    exercise: IPlannerProgramExercise,
    metadata: IPlannerEvalMetadata,
    weekIndex: number,
    dayIndex: number,
    dayInWeekIndex: number
  ): void {
    if (metadata.byWeekDayExercise[weekIndex]?.[dayInWeekIndex]?.[exercise.key] != null) {
      throw PlannerSyntaxError.fromPoint(
        exercise.fullName,
        `Exercise ${exercise.key} is already used in this day. Combine them together, or add a label to separate out.`,
        exercise.points.fullName
      );
    }

    const existingTags = metadata.properties.id[exercise.key];
    if (exercise.tags != null && existingTags != null && !ObjectUtils.isEqual(exercise.tags, existingTags.property)) {
      const point = exercise.points.idPoint || exercise.points.fullName;
      throw PlannerSyntaxError.fromPoint(
        exercise.fullName,
        `Same 'group: id' is specified with different arguments in multiple weeks/days for exercise '${exercise.name}': both in ` +
          `week ${existingTags.dayData.week + 1}, day ${existingTags.dayData.dayInWeek + 1} ` +
          `and week ${weekIndex + 1}, day ${dayInWeekIndex + 1}`,
        point
      );
    }

    if (exercise.notused) {
      metadata.notused.add(exercise.key);
    }
    const dayData = { week: weekIndex, dayInWeek: dayInWeekIndex, day: dayIndex };
    if (exercise.tags) {
      metadata.properties.id[exercise.key] = { property: exercise.tags, dayData: dayData };
    }

    this.setByWeekDayExercise(metadata.byWeekDayExercise, exercise.key, weekIndex, dayInWeekIndex, exercise);
    this.setByExerciseWeekDay(metadata.byExerciseWeekDay, exercise.key, weekIndex, dayInWeekIndex, exercise);
    metadata.fullNames.add(exercise.fullName);
  }

  public static evaluateDay(day: IPlannerProgramDay, dayData: IDayData, settings: ISettings): IPlannerEvalResult {
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
      properties: { id: {} },
    };
    const evaluatedWeeks: IPlannerEvalResult[][] = plannerProgram.weeks.map((week, weekIndex) => {
      return week.days.map((day, dayInWeekIndex) => {
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
              this.fillInMetadata(exercise, metadata, weekIndex, dayIndex, dayInWeekIndex);
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
      properties: { id: {} },
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
              this.fillInMetadata(exercise, metadata, weekIndex, dayIndex, dayInWeekIndex);
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

  private static fillExpandedSets(exercise: IPlannerProgramExercise): void {
    for (let i = 0; i < exercise.setVariations.length; i += 1) {
      const setVariation = exercise.setVariations[i];
      setVariation.expandedSets = PlannerProgramExercise.getExpandedSets(exercise, i);
    }
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
    metadata: IPlannerEvalMetadata,
    week: number,
    settings: ISettings
  ): void {
    if (exercise.reuse && exercise.points.reuseSetPoint) {
      const reuse = exercise.reuse;
      const { exercise: originalExercise, weekAndDay } = this.findOriginalExerciseAtWeekDay(
        settings,
        exercise.points.reuseSetPoint,
        reuse,
        metadata,
        week,
        ["set"]
      );
      if (originalExercise.reuse?.fullName != null) {
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `Original exercise cannot reuse another exercise`,
          exercise.points.reuseSetPoint
        );
      }
      if (originalExercise.setVariations.length > 1) {
        throw PlannerSyntaxError.fromPoint(
          exercise.fullName,
          `Original exercise cannot have mutliple set variations`,
          exercise.points.reuseSetPoint
        );
      }
      exercise.reuse.exercise = originalExercise;
      exercise.reuse.exerciseWeek = weekAndDay.week;
      exercise.reuse.exerciseDayInWeek = weekAndDay.dayInWeek;
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

  private static fillProperties(
    exercise: IPlannerProgramExercise,
    evaluatedWeeks: IPlannerEvalResult[][],
    weekIndex: number,
    dayIndex: number
  ): void {
    if (exercise.progress == null) {
      const lastWeekExercise = this.findLastWeekExercise(
        evaluatedWeeks,
        weekIndex,
        dayIndex,
        exercise,
        (ex) => ex.progress != null
      );
      exercise.progress = lastWeekExercise?.progress;
    }

    if (exercise.update == null) {
      const lastWeekExercise = this.findLastWeekExercise(
        evaluatedWeeks,
        weekIndex,
        dayIndex,
        exercise,
        (ex) => ex.update != null
      );
      exercise.update = lastWeekExercise?.update;
    }

    if (exercise.warmupSets == null) {
      const lastWeekExercise = this.findLastWeekExercise(
        evaluatedWeeks,
        weekIndex,
        dayIndex,
        exercise,
        (ex) => ex.warmupSets != null
      );
      exercise.warmupSets = lastWeekExercise?.warmupSets;
    }
  }

  private static fillSingleProperties(exercise: IPlannerProgramExercise, metadata: IPlannerEvalMetadata): void {
    if (metadata.notused.has(exercise.key)) {
      exercise.notused = true;
    }

    if (metadata.properties.id[exercise.key] != null) {
      exercise.tags = metadata.properties.id[exercise.key].property;
    }
  }

  private static fillProgressReuses(
    exercise: IPlannerProgramExercise,
    settings: ISettings,
    metadata: IPlannerEvalMetadata,
    week: number
  ): void {
    const progress = exercise.progress;
    if (progress?.type === "custom") {
      if (progress.reuse) {
        const point = exercise.points.progressPoint || exercise.points.fullName;
        const { exercise: originalExercise } = PlannerEvaluator.findOriginalExerciseAtWeekDay(
          settings,
          point,
          progress.reuse,
          metadata,
          week,
          ["progress"]
        );

        const originalProgress = originalExercise.progress;
        if (!originalProgress) {
          throw PlannerSyntaxError.fromPoint(exercise.fullName, "Original exercise should specify progress", point);
        }
        if (originalProgress.type !== "custom") {
          throw PlannerSyntaxError.fromPoint(
            exercise.fullName,
            "Original exercise should specify custom progress",
            point
          );
        }
        if (originalProgress.reuse) {
          throw PlannerSyntaxError.fromPoint(
            exercise.fullName,
            `Original exercise cannot reuse another progress`,
            point
          );
        }
        const originalState = ObjectUtils.fromPairs(originalProgress.state);
        const state = ObjectUtils.fromPairs(progress.state);
        for (const stateKey of ObjectUtils.keys(originalState)) {
          const originalValue = originalState[stateKey];
          const value = state[stateKey];
          if (value != null && Weight.type(value) !== Weight.type(originalValue)) {
            throw PlannerSyntaxError.fromPoint(exercise.fullName, `Wrong type of state variable ${stateKey}`, point);
          }
        }
        progress.state = originalProgress.state;
        progress.script = originalProgress.script;
      }
    }
  }

  private static checkUpdateScript(exercise: IPlannerProgramExercise, settings: ISettings, dayData: IDayData): void {
    if (exercise.update?.type === "custom") {
      const { script, liftoscriptNode } = exercise.update;
      if (script && liftoscriptNode) {
        const exerciseType = PlannerProgramExercise.getExercise(exercise, settings);
        const progress = exercise.progress;
        const state = progress?.type === "custom" ? ObjectUtils.fromPairs(progress.state) : {};
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
    exercise: IPlannerProgramExercise,
    settings: ISettings,
    metadata: IPlannerEvalMetadata,
    week: number
  ): void {
    const update = exercise.update;
    if (update?.type === "custom") {
      if (update.reuse) {
        const point = exercise.points.updatePoint || exercise.points.fullName;
        const { exercise: originalExercise } = PlannerEvaluator.findOriginalExerciseAtWeekDay(
          settings,
          point,
          update.reuse,
          metadata,
          week,
          ["update"]
        );

        const originalUpdate = originalExercise.update;
        if (!originalUpdate) {
          throw PlannerSyntaxError.fromPoint(exercise.fullName, "Original exercise should specify update", point);
        }
        if (originalUpdate.type !== "custom") {
          throw PlannerSyntaxError.fromPoint(
            exercise.fullName,
            "Original exercise should specify custom update",
            point
          );
        }
        if (originalUpdate.reuse) {
          throw PlannerSyntaxError.fromPoint(exercise.fullName, `Original exercise cannot reuse another update`, point);
        }

        const stateKeys = originalUpdate.stateKeys;
        if (stateKeys.length > 0) {
          const progress = exercise.progress;
          if (progress == null || progress.type !== "custom") {
            throw PlannerSyntaxError.fromPoint(
              exercise.fullName,
              "If 'update' block uses state variables, exercise should define them in 'progress' block",
              point
            );
          }
          const state = ObjectUtils.fromPairs(progress.state);
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
        update.script = originalUpdate.script;
      }
    }

    //
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
    const { evaluatedWeeks: newEvaluatedWeeks } = this.evaluate(result, settings);
    const error = this.getFirstErrorFromEvaluatedWeeks(newEvaluatedWeeks);
    if (error) {
      console.log(result.weeks);
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
      this.fillExpandedSets(exercise);
      this.fillRepeats(exercise, evaluatedWeeks, dayInWeekIndex, metadata.byExerciseWeekDay);
      this.fillDescriptions(exercise, evaluatedWeeks, weekIndex, dayInWeekIndex);
      this.fillProperties(exercise, evaluatedWeeks, weekIndex, dayIndex);
      this.fillSingleProperties(exercise, metadata);
    });

    this.iterateOverExercises(evaluatedWeeks, (weekIndex, dayInWeekIndex, dayIndex, exerciseIndex, exercise) => {
      const week = weekIndex + 1;
      this.fillSetReuses(exercise, metadata, week, settings);
      this.fillDescriptionReuses(exercise, weekIndex, metadata.byExerciseWeekDay, settings);
      this.fillProgressReuses(exercise, settings, metadata, week);
      this.fillUpdateReuses(exercise, settings, metadata, week);
      this.checkUpdateScript(exercise, settings, {
        week: weekIndex + 1,
        dayInWeek: dayInWeekIndex + 1,
        day: dayInWeekIndex + 1,
      });
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

  public static findOriginalExerciseAtWeekDay(
    settings: ISettings,
    pointer: IPlannerSyntaxPointer,
    reuse: IPlannerProgramReuse,
    metadata: IPlannerEvalMetadata,
    currentWeek: number,
    properties: ("set" | "progress" | "update" | "warmup")[]
  ): { exercise: IPlannerProgramExercise; weekAndDay: Required<IWeekAndDay> } {
    const { fullName, week: atWeek, day: atDay } = reuse;
    const key = PlannerKey.fromFullName(fullName, settings);
    const dayDatas = metadata.byExerciseWeekDay[key];

    if (atWeek == null && atDay == null) {
      const thisWeekExercises = dayDatas?.[currentWeek];
      const thisWeekDays = ObjectUtils.keys(thisWeekExercises);
      const exercises = ObjectUtils.values(thisWeekExercises);
      const grouped = CollectionUtils.groupByExpr(exercises, (e) => PlannerEvaluator.propertyToString(e, properties));
      const count = ObjectUtils.keys(grouped).length;
      if (count === 1) {
        const exercise = ObjectUtils.values(grouped)[0]?.[0]!;
        return { exercise, weekAndDay: { week: currentWeek, dayInWeek: thisWeekDays[0] } };
      } else if (count > 1) {
        throw PlannerSyntaxError.fromPoint(
          fullName,
          `There're several exercises matching, please be more specific with [week:day] syntax`,
          pointer
        );
      } else {
        const allExercises = ObjectUtils.values(dayDatas)
          .map((d) => ObjectUtils.values(d))
          .flat();
        const allGrouped = CollectionUtils.groupByExpr(allExercises, (e) =>
          PlannerEvaluator.propertyToString(e, properties)
        );
        if (ObjectUtils.keys(allGrouped).length === 1) {
          const exercise = ObjectUtils.values(allGrouped)[0]?.[0]!;
          const week = ObjectUtils.keys(dayDatas)[0];
          const dayInWeek = ObjectUtils.keys(dayDatas[week])[0];
          return { exercise, weekAndDay: { week, dayInWeek } };
        } else {
          throw PlannerSyntaxError.fromPoint(
            fullName,
            `No exercise '${fullName}' found, be more specific with [week:day] syntax`,
            pointer
          );
        }
      }
    } else if (atDay != null) {
      const atWeekOrCurrent = atWeek ?? currentWeek;
      const exercise = dayDatas?.[atWeekOrCurrent]?.[atDay];
      if (exercise == null) {
        throw PlannerSyntaxError.fromPoint(
          fullName,
          `No such exercise ${fullName} at week: ${atWeek}, day: ${atDay}`,
          pointer
        );
      }
      return { exercise, weekAndDay: { week: atWeekOrCurrent, dayInWeek: atDay } };
    } else if (atWeek != null) {
      const thisWeekExercises = dayDatas?.[atWeek] || {};
      const thisWeekDays = ObjectUtils.keys(thisWeekExercises);
      const exercises = ObjectUtils.values(thisWeekExercises);
      const grouped = CollectionUtils.groupByExpr(exercises, (e) => PlannerEvaluator.propertyToString(e, properties));
      const count = ObjectUtils.keys(grouped).length;
      if (count === 1) {
        const exercise = ObjectUtils.values(grouped)[0]?.[0]!;
        const dayInWeek = thisWeekDays[0];
        return { exercise, weekAndDay: { week: atWeek, dayInWeek } };
      } else if (count > 1) {
        throw PlannerSyntaxError.fromPoint(
          fullName,
          `There're several exercises matching, please be more specific with [week:day] syntax`,
          pointer
        );
      } else {
        throw PlannerSyntaxError.fromPoint(fullName, `No exercise '${fullName}' found on week ${atWeek}`, pointer);
      }
    } else {
      throw PlannerSyntaxError.fromPoint(fullName, `No exercise '${fullName}' found`, pointer);
    }
  }

  public static propertyToString(
    exercise: IPlannerProgramExercise,
    properties: ("set" | "warmup" | "progress" | "update")[]
  ): string {
    return properties
      .map((property) => {
        switch (property) {
          case "set":
            return exercise.setVariations
              .map((sv) => PlannerEvaluatedProgramToText.expandedSetsToString(sv.expandedSets))
              .join(", ");
          case "warmup":
            return PlannerEvaluatedProgramToText.getWarmupSets(exercise.warmupSets || []);
          case "progress":
            return PlannerEvaluatedProgramToText.progressToString(exercise.progress);
          case "update":
            return PlannerEvaluatedProgramToText.updateToString(exercise.update);
        }
      })
      .join(", ");
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
      console.log(evaluatedWeeks);
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
