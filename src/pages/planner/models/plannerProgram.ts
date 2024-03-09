import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseWarmupSet,
  IPlannerProgramProperty,
  IExportedPlannerProgram,
  IPlannerProgramExerciseDescription,
} from "./types";
import { parser as plannerExerciseParser } from "../plannerExerciseParser";
import {
  IPlannerEvalFullResult,
  IPlannerEvalResult,
  PlannerExerciseEvaluator,
  PlannerSyntaxError,
} from "../plannerExerciseEvaluator";
import {
  IAllCustomExercises,
  IAllEquipment,
  IDayData,
  IPlannerProgram,
  IPlannerProgramWeek,
  ISettings,
} from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { Exercise, IExercise } from "../../../models/exercise";
import { PlannerExerciseEvaluatorText } from "../plannerExerciseEvaluatorText";
import { Equipment } from "../../../models/equipment";
import { lf } from "lens-shmens";
import { IPlannerTopLineItem } from "../plannerExerciseEvaluator";
import { IExportedProgram, Program } from "../../../models/program";
import { PlannerToProgram2 } from "../../../models/plannerToProgram2";

export type IExerciseTypeToProperties = Record<string, (IPlannerProgramProperty & { dayData: Required<IDayData> })[]>;
export type IExerciseTypeToWarmupSets = Record<string, IPlannerProgramExerciseWarmupSet[] | undefined>;

export class PlannerDayDataError extends Error {
  constructor(message: string, public readonly dayData: Required<IDayData>) {
    super(message);
  }
}

export class PlannerProgram {
  public static isValid(program: IPlannerProgram, settings: ISettings): boolean {
    const { evaluatedWeeks } = PlannerProgram.evaluate(program, settings);
    return evaluatedWeeks.every((week) => week.every((day) => day.success));
  }

  public static getExerciseTypeToProperties(
    evaluatedWeeks: IPlannerEvalResult[][],
    customExercises: IAllCustomExercises
  ): IExerciseTypeToProperties {
    const exerciseTypeToProperties: IExerciseTypeToProperties = {};
    PlannerProgram.generateExerciseTypeAndDayData(evaluatedWeeks, customExercises, (exercise, name, dayData) => {
      exerciseTypeToProperties[name] = exerciseTypeToProperties[name] || [];
      const properties = exerciseTypeToProperties[name];
      for (const property of exercise.properties.filter((p) => p.fnName !== "none")) {
        const existingProperty = properties.find((p) => p.name === property.name);
        if (
          existingProperty != null &&
          (existingProperty.fnName !== property.fnName ||
            existingProperty.fnArgs.some((a, i) => property.fnArgs[i] !== a) ||
            existingProperty.script !== property.script ||
            existingProperty.body !== property.body)
        ) {
          throw new PlannerDayDataError(
            `Same property '${property.name}' is specified with different arguments in multiple weeks/days for exercise '${exercise.name}': both in ` +
              `week ${existingProperty.dayData.week + 1}, day ${existingProperty.dayData.dayInWeek + 1} ` +
              `and week ${dayData.week + 1}, day ${dayData.dayInWeek + 1}`,
            dayData
          );
        }
        properties.push({ ...property, dayData });
      }
    });
    return exerciseTypeToProperties;
  }

  public static getExerciseTypeToWarmupSets(
    evaluatedWeeks: IPlannerEvalResult[][],
    customExercises: IAllCustomExercises
  ): IExerciseTypeToWarmupSets {
    const exerciseTypeToWarmupSets: IExerciseTypeToWarmupSets = {};
    const warmupSetSchemes: Partial<Record<string, { dayData: Required<IDayData>; scheme: string }>> = {};
    PlannerProgram.generateExerciseTypeAndDayData(evaluatedWeeks, customExercises, (exercise, name, dayData) => {
      if (exercise.warmupSets == null) {
        return;
      }
      const scheme = JSON.stringify(exercise.warmupSets);
      const ws = warmupSetSchemes[name];
      if (ws != null && ws.scheme !== scheme) {
        throw new PlannerDayDataError(
          `Different warmup sets are specified in multiple weeks/days for exercise '${exercise.name}': both in ` +
            `week ${ws.dayData.week + 1}, day ${ws.dayData.dayInWeek + 1} ` +
            `and week ${dayData.week + 1}, day ${dayData.dayInWeek + 1}`,
          dayData
        );
      }
      warmupSetSchemes[name] = { scheme, dayData };
      exerciseTypeToWarmupSets[name] = exercise.warmupSets;
    });
    return exerciseTypeToWarmupSets;
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
        const lastWeekExercise = lastWeekDay.data.find(
          (ex) =>
            ex.name.toLowerCase() === exercise.name.toLowerCase() &&
            ex.label?.toLowerCase() === exercise.label?.toLowerCase() &&
            ex.equipment?.toLowerCase() === exercise.equipment?.toLowerCase()
        );
        if (lastWeekExercise != null && (cond == null || cond(lastWeekExercise))) {
          return lastWeekExercise;
        }
      }
    }
    return undefined;
  }

  private static iterateOverExercises(
    program: IPlannerEvalResult[][],
    cb: (weekIndex: number, dayIndex: number, exercise: IPlannerProgramExercise) => void
  ): void {
    for (let weekIndex = 0; weekIndex < program.length; weekIndex += 1) {
      const week = program[weekIndex];
      for (let dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
        const day = week[dayIndex];
        if (day?.success) {
          const exercises = day.data;
          for (const exercise of exercises) {
            cb(weekIndex, dayIndex, exercise);
          }
        }
      }
    }
  }

  public static postProcess(
    settings: ISettings,
    program: IPlannerEvalResult[][],
    args?: { skipDescriptionPostProcess?: boolean }
  ): IPlannerEvalResult[][] {
    const exerciseDescriptions: Record<
      string,
      Record<number, Record<number, IPlannerProgramExerciseDescription[]>>
    > = {};
    this.iterateOverExercises(program, (weekIndex, dayIndex, exercise) => {
      if (!args?.skipDescriptionPostProcess) {
        if (exercise.descriptions == null || exercise.descriptions.length === 0) {
          const lastWeekExercise = this.findLastWeekExercise(
            program,
            weekIndex,
            dayIndex,
            exercise,
            (ex) => ex.descriptions != null
          );
          exercise.descriptions = lastWeekExercise?.descriptions || [];
        }
      }
      if (exercise.descriptions != null && exercise.descriptions.length > 0) {
        const key = PlannerToProgram2.plannerExerciseKey(exercise, settings);
        exerciseDescriptions[key] = exerciseDescriptions[key] || {};
        exerciseDescriptions[key][weekIndex] = exerciseDescriptions[key][weekIndex] || {};
        exerciseDescriptions[key][weekIndex][dayIndex] = exercise.descriptions;
      }
    });
    const notused: Set<string> = new Set();
    this.iterateOverExercises(program, (weekIndex, dayIndex, exercise) => {
      if (exercise.notused) {
        notused.add(PlannerToProgram2.plannerExerciseKey(exercise, settings));
      }
      if (exercise.reuse) {
        const originalExercise = PlannerExerciseEvaluator.findOriginalExercisesAtWeekDay(
          settings,
          exercise.reuse.exercise,
          program,
          exercise.reuse.week ?? weekIndex + 1 ?? 1,
          exercise.reuse.day
        )[0];
        if (originalExercise) {
          exercise.reuse.sets = originalExercise.setVariations[0].sets;
          exercise.reuse.globals = originalExercise.globals;
        }
      }
      if (
        exercise.descriptions != null &&
        exercise.descriptions.length === 1 &&
        exercise.descriptions[0].value?.startsWith("...")
      ) {
        const reusingName = exercise.descriptions[0].value.slice(3).trim();
        const descriptions = this.findReusedDescriptions(reusingName, weekIndex, exerciseDescriptions, settings);
        if (descriptions != null) {
          exercise.descriptions = descriptions;
        }
      }
    });
    const skipProgress: Record<string, IPlannerProgramExercise["skipProgress"]> = {};
    this.iterateOverExercises(program, (weekIndex, dayIndex, exercise) => {
      const key = PlannerToProgram2.plannerExerciseKey(exercise, settings);
      if (notused.has(key)) {
        exercise.notused = true;
      }
      const nones = exercise.properties.filter((p) => p.fnName === "none");
      if (nones.length > 0) {
        skipProgress[key] = skipProgress[key] || [];
        skipProgress[key].push({ week: weekIndex + 1, day: dayIndex + 1 });
      }
    });
    this.iterateOverExercises(program, (weekIndex, dayIndex, exercise) => {
      const nonnones = exercise.properties.filter((p) => p.fnName !== "none");
      if (nonnones.length > 0) {
        const key = PlannerToProgram2.plannerExerciseKey(exercise, settings);
        exercise.skipProgress = skipProgress[key] || [];
      }
    });
    return program;
  }

  public static findReusedDescriptions(
    reusingName: string,
    currentWeekIndex: number,
    exerciseDescriptions: Record<string, Record<number, Record<number, IPlannerProgramExerciseDescription[]>>>,
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
    const key = PlannerProgram.nameToKey(reusingName, settings);
    const weekDescriptions = exerciseDescriptions[key]?.[weekIndex ?? currentWeekIndex];
    if (dayIndex != null) {
      return weekDescriptions?.[dayIndex];
    } else {
      return ObjectUtils.values(weekDescriptions ?? {})[0];
    }
  }

  public static compact(
    originalToplineItems: IPlannerTopLineItem[][][],
    plannerProgram: IPlannerProgram,
    settings: ISettings
  ): IPlannerProgram {
    let dayIndex = 0;
    const repeatingExercises = new Set<string>();
    for (const w of originalToplineItems) {
      for (const d of w) {
        for (const e of d) {
          if (e.type === "exercise" && e.repeat != null && e.repeat.length > 0) {
            repeatingExercises.add(e.value);
          }
        }
      }
    }

    const mapping = plannerProgram.weeks.map((week, weekIndex) => {
      return week.days.map((day, dayInWeekIndex) => {
        const tree = plannerExerciseParser.parse(day.exerciseText);
        const evaluator = new PlannerExerciseEvaluator(day.exerciseText, settings, "perday", {
          day: dayIndex + 1,
          dayInWeek: dayInWeekIndex + 1,
          week: weekIndex + 1,
        });
        dayIndex += 1;
        const map = evaluator.topLineMap(tree.topNode);
        return map;
      });
    });

    for (let weekIndex = 0; weekIndex < mapping.length; weekIndex += 1) {
      const week = mapping[weekIndex];
      for (dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
        const day = week[dayIndex];
        for (const line of day) {
          if (line.type === "exercise" && !line.used && repeatingExercises.has(line.value)) {
            const repeatRanges: [number, number | undefined][] = [];
            for (let repeatWeekIndex = weekIndex + 1; repeatWeekIndex < mapping.length; repeatWeekIndex += 1) {
              const repeatDay = mapping[repeatWeekIndex]?.[dayIndex];
              const repeatedExercises = (repeatDay || []).filter((e) => {
                return (
                  e.type === "exercise" &&
                  e.value === line.value &&
                  e.sectionsToReuse === line.sectionsToReuse &&
                  e.description === line.description
                );
              });
              for (const e of repeatedExercises) {
                e.used = true;
              }
              if (repeatedExercises.length > 0) {
                if (repeatRanges.length === 0 || repeatRanges[repeatRanges.length - 1][1] != null) {
                  repeatRanges.push([repeatWeekIndex, undefined]);
                }
              } else {
                if (repeatRanges.length > 0) {
                  repeatRanges[repeatRanges.length - 1][1] = repeatWeekIndex;
                }
                break;
              }
            }
            if (repeatRanges.length > 0 && repeatRanges[repeatRanges.length - 1][1] == null) {
              repeatRanges[repeatRanges.length - 1][1] = mapping.length;
            }
            line.repeatRanges = repeatRanges.map((r) => `${r[0]}-${r[1]}`);
          }
        }
      }
    }

    for (let weekIndex = 0; weekIndex < mapping.length; weekIndex += 1) {
      const programWeek = plannerProgram.weeks[weekIndex];
      const week = mapping[weekIndex];
      for (dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
        const day = week[dayIndex];
        const programDay = programWeek.days[dayIndex];
        let str = "";
        for (const line of day) {
          if (line.type === "description") {
            //
          } else if (line.type === "exercise") {
            if (!line.used) {
              if (line.description) {
                str += `${line.description}\n`;
              }
              let repeatStr = "";
              if ((line.order != null && line.order !== 0) || (line.repeatRanges && line.repeatRanges.length > 0)) {
                const repeatParts = [];
                if (line.order != null && line.order !== 0) {
                  repeatParts.push(line.order);
                }
                if (line.repeatRanges && line.repeatRanges.length > 0) {
                  repeatParts.push(line.repeatRanges.join(","));
                }
                repeatStr = `[${repeatParts.join(",")}]`;
              }
              str += `${line.fullName}${repeatStr} / ${line.sections}\n`;
            }
          } else {
            str += line.value + "\n";
          }
        }
        programDay.exerciseText = str.trim();
      }
    }

    return plannerProgram;
  }

  public static topLineItems(plannerProgram: IPlannerProgram, settings: ISettings): IPlannerTopLineItem[][][] {
    let dayIndex = 0;

    const mapping = plannerProgram.weeks.map((week, weekIndex) => {
      return week.days.map((day, dayInWeekIndex) => {
        const tree = plannerExerciseParser.parse(day.exerciseText);
        const evaluator = new PlannerExerciseEvaluator(day.exerciseText, settings, "perday", {
          day: dayIndex + 1,
          dayInWeek: dayInWeekIndex + 1,
          week: weekIndex + 1,
        });
        dayIndex += 1;
        const map = evaluator.topLineMap(tree.topNode);
        return map;
      });
    });
    for (let weekIndex = 0; weekIndex < mapping.length; weekIndex += 1) {
      const week = mapping[weekIndex];
      for (dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
        const day = week[dayIndex];
        for (const exercise of day) {
          for (const r of exercise.repeat || []) {
            const reuseDay = mapping[r - 1][dayIndex];
            if (!reuseDay.some((e) => e.type === "exercise" && e.value === exercise.value)) {
              if (exercise.description) {
                reuseDay.push({ type: "description", value: exercise.description });
              }
              reuseDay.push({ ...exercise, repeat: undefined });
            }
          }
        }
      }
    }
    return mapping;
  }

  public static fillRepeats(evalWeeks: IPlannerEvalResult[][], settings: ISettings): IPlannerProgramExercise[][][] {
    const repeats: IPlannerProgramExercise[][][] = [];
    for (let weekIndex = 0; weekIndex < evalWeeks.length; weekIndex += 1) {
      const week = evalWeeks[weekIndex];
      for (let dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
        const day = week[dayIndex];
        if (day.success) {
          const exercises = day.data;
          for (let i = 0; i < exercises.length; i += 1) {
            const exercise = exercises[i];
            for (const repeatWeek of exercise.repeat ?? []) {
              const repeatWeekIndex = repeatWeek - 1;
              const repeatDay = evalWeeks[repeatWeekIndex]?.[dayIndex];
              if (repeatDay?.success) {
                const hasExercise = repeatDay.data.some(
                  (e) =>
                    PlannerToProgram2.plannerExerciseKey(e, settings) ===
                    PlannerToProgram2.plannerExerciseKey(exercise, settings)
                );
                if (!hasExercise) {
                  repeats[repeatWeekIndex] = repeats[repeatWeekIndex] || [];
                  repeats[repeatWeekIndex][dayIndex] = repeats[repeatWeekIndex][dayIndex] || [];
                  const newExercise: IPlannerProgramExercise = {
                    ...ObjectUtils.clone(exercise),
                    repeat: [],
                    isRepeat: true,
                  };
                  repeats[repeatWeekIndex][dayIndex].push(newExercise);
                  repeatDay.data.push(newExercise);
                }
              }
            }
          }
        }
      }
    }
    return repeats;
  }

  public static evaluate(
    plannerProgram: IPlannerProgram,
    settings: ISettings,
    args?: { skipDescriptionPostProcess?: boolean }
  ): { evaluatedWeeks: IPlannerEvalResult[][]; repeats: IPlannerProgramExercise[][][]; exerciseFullNames: string[] } {
    let dayIndex = 0;
    const exerciseFullNames: Set<string> = new Set();
    let evaluatedWeeks: IPlannerEvalResult[][] = plannerProgram.weeks.map((week, weekIndex) => {
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
            exerciseFullNames.add(e.fullName);
          }
          return { success: true, data: exercises };
        } else {
          return result;
        }
      });
    });
    const repeats = this.fillRepeats(evaluatedWeeks, settings);
    dayIndex = 0;
    const errors: { error: string; dayData: Required<IDayData> }[] = [];
    plannerProgram.weeks.forEach((week, weekIndex) => {
      week.days.forEach((day, dayInWeekIndex) => {
        if (evaluatedWeeks[weekIndex][dayInWeekIndex].success) {
          const tree = plannerExerciseParser.parse(day.exerciseText);
          const evaluator = new PlannerExerciseEvaluator(day.exerciseText, settings, "perday", {
            day: dayIndex + 1,
            dayInWeek: dayInWeekIndex + 1,
            week: weekIndex + 1,
          });
          const error = evaluator.postEvaluateCheck(tree.topNode, evaluatedWeeks);
          if (error) {
            evaluatedWeeks = lf(evaluatedWeeks).i(weekIndex).i(dayInWeekIndex).set({ success: false, error });
          }
        }
        dayIndex += 1;
      });
    });

    const evaluatedCheckError = this.evaluatedCheck(evaluatedWeeks, settings);
    if (evaluatedCheckError) {
      evaluatedWeeks[evaluatedCheckError.weekIndex][evaluatedCheckError.dayInWeekIndex] = {
        success: false,
        error: evaluatedCheckError.error,
      };
    }
    this.postProcess(settings, evaluatedWeeks, args);
    try {
      PlannerProgram.getExerciseTypeToProperties(evaluatedWeeks, settings.exercises);
      PlannerProgram.getExerciseTypeToWarmupSets(evaluatedWeeks, settings.exercises);
    } catch (e) {
      if (e instanceof PlannerDayDataError) {
        errors.push({ error: e.message, dayData: e.dayData });
      } else {
        throw e;
      }
    }
    for (const error of errors) {
      evaluatedWeeks[error.dayData.week][error.dayData.dayInWeek] = {
        success: false,
        error: new PlannerSyntaxError(error.error, 0, 0, 0, 1),
      };
    }

    return { repeats, evaluatedWeeks, exerciseFullNames: Array.from(exerciseFullNames) };
  }

  public static evaluatedCheck(
    program: IPlannerEvalResult[][],
    settings: ISettings
  ): { weekIndex: number; dayInWeekIndex: number; error: PlannerSyntaxError } | undefined {
    for (let weekIndex = 0; weekIndex < program.length; weekIndex++) {
      const week = program[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex++) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          for (const exercise of day.data) {
            if (exercise.reuse) {
              const originalExercise = PlannerExerciseEvaluator.findOriginalExercisesAtWeekDay(
                settings,
                exercise.reuse.exercise,
                program,
                exercise.reuse.week ?? weekIndex + 1 ?? 1,
                exercise.reuse.day
              )[0];
              if (!originalExercise) {
                return {
                  weekIndex,
                  dayInWeekIndex,
                  error: new PlannerSyntaxError(
                    `Reused and repeated exercises mismatch for '${exercise.name}'`,
                    0,
                    0,
                    0,
                    0
                  ),
                };
              }
            }
          }
        }
      }
    }
    return undefined;
  }

  public static evaluateFull(
    fullProgramText: string,
    settings: ISettings
  ): { evaluatedWeeks: IPlannerEvalFullResult; exerciseFullNames: string[] } {
    const evaluator = new PlannerExerciseEvaluator(fullProgramText, settings, "full");
    const tree = plannerExerciseParser.parse(fullProgramText);
    const result = evaluator.evaluate(tree.topNode);
    const exerciseFullNames: Set<string> = new Set();
    if (result.success) {
      const evaluatedWeeks = result.data.map((week) =>
        week.days.map((d) => {
          const exercises = d.exercises;
          for (const e of exercises) {
            exerciseFullNames.add(e.fullName);
          }
          return { success: true as const, data: exercises };
        })
      );
      this.fillRepeats(evaluatedWeeks, settings);
      const error = evaluator.postEvaluateCheck(tree.topNode, evaluatedWeeks);
      if (error) {
        return { evaluatedWeeks: { success: false, error }, exerciseFullNames: [] };
      }
    }
    return { evaluatedWeeks: result, exerciseFullNames: Array.from(exerciseFullNames) };
  }

  public static evaluateText(fullProgramText: string): IPlannerProgramWeek[] {
    const evaluator = new PlannerExerciseEvaluatorText(fullProgramText);
    const tree = plannerExerciseParser.parse(fullProgramText);
    const data = evaluator.evaluate(tree.topNode);
    return data.map((week) => {
      return {
        name: week.name,
        days: week.days.map((day) => {
          return {
            name: day.name,
            exerciseText: day.exercises.join("").trim(),
          };
        }),
      };
    });
  }

  public static fullToWeekEvalResult(fullResult: IPlannerEvalFullResult): IPlannerEvalResult[][] {
    return fullResult.success
      ? fullResult.data.map((week) => week.days.map((d) => ({ success: true, data: d.exercises })))
      : [[fullResult]];
  }

  public static generateFullText(weeks: IPlannerProgramWeek[]): string {
    let fullText = "";
    for (const week of weeks) {
      fullText += `# ${week.name}\n`;
      for (const day of week.days) {
        fullText += `## ${day.name}\n`;
        fullText += `${day.exerciseText}\n\n`;
      }
      fullText += "\n";
    }
    return fullText;
  }

  public static generateExerciseTypeAndDayData(
    evaluatedWeeks: IPlannerEvalResult[][],
    customExercises: IAllCustomExercises,
    cb: (exercise: IPlannerProgramExercise, name: string, dayData: Required<IDayData>) => void
  ): void {
    let dayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          const excrs = day.data;
          const exercisesByName: Record<string, IPlannerProgramExercise[]> = {};
          for (const exercise of excrs) {
            const key = `${exercise.label}_${exercise.name}_${exercise.equipment}`.toLowerCase();
            exercisesByName[key] = exercisesByName[key] || [];
            exercisesByName[key].push(exercise);
          }
          for (const groupedExercises of ObjectUtils.values(exercisesByName)) {
            const exercise = groupedExercises.reduce((memo, ex) => {
              memo.sets.push(...ex.sets);
              return memo;
            });
            const liftosaurExercise = Exercise.findByName(exercise.name, customExercises);
            if (!liftosaurExercise) {
              continue;
            }
            const name = PlannerProgram.generateExerciseTypeKey(exercise, liftosaurExercise);
            const dayData = {
              week: weekIndex,
              day: dayIndex,
              dayInWeek: dayInWeekIndex,
            };
            cb(exercise, name, dayData);
          }
        }
        dayIndex += 1;
      }
    }
  }

  public static nameToKey(labelNameAndEquipment: string, settings: ISettings): string {
    let equip: string | undefined;
    const parts = labelNameAndEquipment.split(",");
    if (parts.length > 1) {
      equip = parts.pop();
    }
    equip = equip?.trim();
    if (equip) {
      equip = Equipment.equipmentKeyByName(equip, settings.equipment);
    }
    const nameAndLabel = parts.join(",").trim();
    const [labelOrName, ...nameParts] = nameAndLabel.split(":");
    let label: string | undefined;
    let name: string;
    if (nameParts.length === 0) {
      name = labelOrName;
      label = undefined;
    } else {
      label = labelOrName.trim();
      name = nameParts.join(":").trim();
    }
    if (equip == null) {
      const exercise = Exercise.findByName(name, settings.exercises);
      equip = exercise?.defaultEquipment;
    }
    const key = `${label ? `${label}-` : ""}${name}-${equip}`.toLowerCase();
    return key;
  }

  public static generateExerciseTypeKey(plannerExercise: IPlannerProgramExercise, exercise: IExercise): string {
    const equipment = plannerExercise.equipment ?? exercise.defaultEquipment;
    return `${plannerExercise.label ? `${plannerExercise.label}-` : ""}${exercise.id}-${equipment}`.toLowerCase();
  }

  public static usedExercises(
    exercises: IAllCustomExercises,
    evaluatedWeeks: IPlannerEvalResult[][]
  ): IAllCustomExercises {
    return ObjectUtils.filter(exercises, (_id, ex) => {
      if (!ex) {
        return false;
      }

      return evaluatedWeeks.some((week) => {
        return week.some((day) => {
          return day.success && day.data.some((d) => d.name.toLowerCase() === ex.name.toLowerCase());
        });
      });
    });
  }

  public static usedEquipment(equipment: IAllEquipment, evaluatedWeeks: IPlannerEvalResult[][]): IAllEquipment {
    return ObjectUtils.filter(equipment, (key, value) => {
      return evaluatedWeeks.some((week) => {
        return week.some((day) => {
          return day.success && day.data.some((d) => d.equipment?.toLowerCase() === key);
        });
      });
    });
  }

  public static convertExportedPlannerToProgram(
    planner: IExportedPlannerProgram,
    settings: ISettings
  ): IExportedProgram {
    const newProgram = Program.create(planner.program.name, planner.id);
    const newSettings: ISettings = {
      ...settings,
      exercises: { ...settings.exercises, ...planner.settings.exercises },
      equipment: { ...settings.equipment, ...planner.settings.equipment },
    };
    const program = new PlannerToProgram2(
      newProgram.id,
      newProgram.nextDay,
      newProgram.exercises,
      planner.program,
      newSettings
    ).convertToProgram();
    return {
      program: program,
      settings: {
        timers: newSettings.timers,
        units: newSettings.units,
      },
      customExercises: planner.settings.exercises,
      customEquipment: planner.settings.equipment,
      version: planner.version,
    };
  }
}
