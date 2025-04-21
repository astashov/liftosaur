import { IPlannerProgramExerciseWarmupSet, IPlannerProgramProperty, IExportedPlannerProgram } from "./types";
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
  IExerciseType,
  IPlannerProgram,
  IPlannerProgramWeek,
  IProgram,
  ISettings,
} from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { PlannerExerciseEvaluatorText } from "../plannerExerciseEvaluatorText";
import { IPlannerTopLineItem } from "../plannerExerciseEvaluator";
import { IEvaluatedProgram, IExportedProgram, Program } from "../../../models/program";
import { PlannerEvaluator } from "../plannerEvaluator";
import { IWeightChange } from "../../../models/programExercise";
import { Storage } from "../../../models/storage";
import { Weight } from "../../../models/weight";
import { PP } from "../../../models/pp";
import { IEither } from "../../../utils/types";
import { getLatestMigrationVersion } from "../../../migrations/migrations";
import { ProgramToPlanner } from "../../../models/programToPlanner";
import { PlannerKey } from "../plannerKey";
import { UidFactory } from "../../../utils/generator";
import { CollectionUtils } from "../../../utils/collection";

export type IExerciseTypeToProperties = Record<string, (IPlannerProgramProperty & { dayData: Required<IDayData> })[]>;
export type IExerciseTypeToWarmupSets = Record<string, IPlannerProgramExerciseWarmupSet[] | undefined>;

export class PlannerDayDataError extends Error {
  constructor(
    message: string,
    public readonly dayData: Required<IDayData>
  ) {
    super(message);
  }
}

export type IDereuseDecision = "all" | "weight" | "rpe" | "timer";

export class PlannerProgram {
  public static isValid(program: IPlannerProgram, settings: ISettings): boolean {
    const { evaluatedWeeks } = PlannerProgram.evaluate(program, settings);
    return evaluatedWeeks.every((week) => week.every((day) => day.success));
  }

  public static replaceWeight(
    program: IEvaluatedProgram,
    programExerciseId: string,
    weightChanges: IWeightChange[]
  ): IEvaluatedProgram {
    if (weightChanges.every((wc) => ObjectUtils.isEqual(wc.originalWeight, wc.weight))) {
      return program;
    }
    const newEvalutedProgram = ObjectUtils.clone(program);
    PP.iterate2(newEvalutedProgram.weeks, (ex) => {
      if (ex.key === programExerciseId) {
        for (const setVariation of ex.evaluatedSetVariations) {
          for (const set of setVariation.sets) {
            const weightChange = weightChanges.find((wc) => Weight.eqNull(wc.originalWeight, set.weight));
            if (weightChange != null) {
              set.weight = weightChange.weight;
            }
          }
        }
      }
    });
    return newEvalutedProgram;
  }

  public static replaceExercise(
    program: IProgram,
    key: string,
    toExerciseType: IExerciseType,
    settings: ISettings
  ): IEither<IProgram, string> {
    const evaluatedProgram = Program.evaluate(program, settings);
    const allExercises = Program.getAllProgramExercises(evaluatedProgram);
    let labelSuffix: string | undefined = undefined;
    let noConflicts = false;

    function getLabel(label?: string): string | undefined {
      return label || labelSuffix ? CollectionUtils.compact([label, labelSuffix]).join("-") : undefined;
    }

    while (!noConflicts) {
      const conflictingExercises = allExercises.filter((e) => {
        const newKey = PlannerKey.fromExerciseType(toExerciseType, settings, getLabel(e.label));
        return e.key === newKey;
      });
      if (conflictingExercises.length > 0) {
        noConflicts = false;
        labelSuffix = UidFactory.generateUid(3);
      } else {
        noConflicts = true;
      }
    }

    const renameMapping: Record<string, string> = {};
    PP.iterate2(evaluatedProgram.weeks, (exercise) => {
      if (exercise.key === key) {
        exercise.exerciseType = toExerciseType;
        const newLabel = getLabel(exercise.label);
        exercise.label = newLabel;
        const newKey = PlannerKey.fromExerciseType(toExerciseType, settings, newLabel);
        renameMapping[exercise.key] = newKey;
        exercise.key = newKey;
      }
    });
    const newPlanner = new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner(renameMapping);
    const newProgram = { ...program, planner: newPlanner };
    const { evaluatedWeeks } = PlannerEvaluator.evaluate(newPlanner, settings);
    let error: PlannerSyntaxError | undefined;
    for (const week of evaluatedWeeks) {
      for (const day of week) {
        if (!day.success) {
          error = day.error;
          break;
        }
      }
    }
    if (error) {
      return { success: false, error: error.message };
    } else {
      return { success: true, data: newProgram };
    }
  }

  public static modifyTopLineItems(
    aPlannerProgram: IPlannerProgram,
    settings: ISettings,
    firstPass: (
      line: IPlannerTopLineItem,
      weekIndex: number,
      dayInWeekIndex: number,
      dayIndex: number,
      lineIndex: number
    ) => IPlannerTopLineItem
  ): IPlannerProgram {
    let dayIndex = 0;
    const plannerProgram = ObjectUtils.clone(aPlannerProgram);
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

    dayIndex = 0;
    for (let weekIndex = 0; weekIndex < mapping.length; weekIndex += 1) {
      const week = mapping[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        for (let lineIndex = 0; lineIndex < day.length; lineIndex += 1) {
          const line = day[lineIndex];
          const newLine = firstPass(line, weekIndex, dayInWeekIndex, dayIndex, lineIndex);
          day[lineIndex] = newLine;
        }
        dayIndex += 1;
      }
    }

    for (let weekIndex = 0; weekIndex < mapping.length; weekIndex += 1) {
      const programWeek = plannerProgram.weeks[weekIndex];
      const week = mapping[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        const programDay = programWeek.days[dayInWeekIndex];
        let str = "";
        for (const line of day) {
          str += this.topLineItemToText(line);
        }
        programDay.exerciseText = str.trim();
      }
    }

    return plannerProgram;
  }

  public static topLineItemToText(line: IPlannerTopLineItem): string {
    let str = "";
    if (line.type === "description") {
      //
    } else if (line.type === "exercise") {
      if (!line.used) {
        if (line.descriptions && line.descriptions.length > 0) {
          str += `${line.descriptions.join("\n\n")}\n`;
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
    return str;
  }

  public static switchToUnit(plannerProgram: IPlannerProgram, settings: ISettings): IPlannerProgram {
    const newPlannerProgram = ObjectUtils.clone(plannerProgram);
    for (const week of newPlannerProgram.weeks) {
      for (const day of week.days) {
        const evaluator = new PlannerExerciseEvaluator(day.exerciseText, settings, "perday");
        const tree = plannerExerciseParser.parse(day.exerciseText);
        day.exerciseText = evaluator.switchWeightsToUnit(tree.topNode, settings);
      }
    }
    return newPlannerProgram;
  }

  public static hasNonSelectedWeightUnit(plannerProgram: IPlannerProgram, settings: ISettings): boolean {
    for (const week of plannerProgram.weeks) {
      for (const day of week.days) {
        const tree = plannerExerciseParser.parse(day.exerciseText);
        const evaluator = new PlannerExerciseEvaluator(day.exerciseText, settings, "perday");
        if (evaluator.hasWeightInUnit(tree.topNode, settings.units === "kg" ? "lb" : "kg")) {
          return true;
        }
      }
    }
    return false;
  }

  public static compact(
    oldPlannerProgram: IPlannerProgram,
    plannerProgram: IPlannerProgram,
    settings: ISettings,
    additionalRepeatingExercises?: Set<string>
  ): IPlannerProgram {
    let dayIndex = 0;
    const repeatingExercises = new Set<string>();
    const { evaluatedWeeks } = PlannerProgram.evaluate(ObjectUtils.clone(oldPlannerProgram), settings);
    const { evaluatedWeeks: newEvaluatedWeeks } = PlannerProgram.evaluate(ObjectUtils.clone(plannerProgram), settings);
    for (const ev of [evaluatedWeeks, newEvaluatedWeeks]) {
      PP.iterate(ev, (exercise) => {
        if (exercise.repeat != null && exercise.repeat.length > 0) {
          repeatingExercises.add(exercise.key);
        }
      });
    }
    for (const ex of additionalRepeatingExercises || []) {
      repeatingExercises.add(ex);
    }

    const lastDescriptions: Partial<Record<number, string | undefined>> = {};
    plannerProgram.weeks.forEach((week) => {
      week.days.forEach((day, dayInWeekIndex) => {
        if (lastDescriptions[dayInWeekIndex] == null) {
          lastDescriptions[dayInWeekIndex] = day.description;
        } else if (lastDescriptions[dayInWeekIndex] === day.description) {
          day.description = undefined;
        } else {
          lastDescriptions[dayInWeekIndex] = day.description;
        }
      });
    });

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
                  ObjectUtils.isEqual(e.descriptions || [], line.descriptions || [])
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
        let ongoingDescriptions = false;
        for (const line of day) {
          if (line.type === "description") {
            ongoingDescriptions = true;
            //
          } else if (line.type === "exercise") {
            ongoingDescriptions = false;
            if (!line.used) {
              if (line.descriptions && line.descriptions.length > 0) {
                str += `${line.descriptions.filter((d) => d.trim()).join("\n\n")}\n`;
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
              str += [`${line.fullName}${repeatStr}`, line.sections].filter((r) => r).join(" / ") + `\n`;
            }
          } else if (line.type === "empty") {
            if (!ongoingDescriptions) {
              str += line.value + "\n";
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

  public static groupedTopLines(topLine: IPlannerTopLineItem[][][]): IPlannerTopLineItem[][][][] {
    const groupedTopLine: IPlannerTopLineItem[][][][] = [];
    for (let weekIndex = 0; weekIndex < topLine.length; weekIndex += 1) {
      const topLineWeek = topLine[weekIndex];
      groupedTopLine.push([]);
      for (let dayInWeekIndex = 0; dayInWeekIndex < topLineWeek.length; dayInWeekIndex += 1) {
        const topLineDay = topLineWeek[dayInWeekIndex];
        const group: IPlannerTopLineItem[][] = [];
        groupedTopLine[weekIndex].push(group);
        let reset = true;
        for (let lineIndex = 0; lineIndex < topLineDay.length; lineIndex += 1) {
          if (reset) {
            group.push([]);
            reset = false;
          }
          const line = topLineDay[lineIndex];
          group[group.length - 1] = group[group.length - 1] || [];
          group[group.length - 1].push(line);
          if (line.type === "exercise") {
            reset = true;
          }
        }
      }
    }

    return groupedTopLine;
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
            const reuseDay = mapping[r - 1]?.[dayIndex];
            if (reuseDay && !reuseDay.some((e) => e.type === "exercise" && e.value === exercise.value)) {
              if (exercise.descriptions) {
                for (let di = 0; di < exercise.descriptions.length; di += 1) {
                  if (di !== 0) {
                    reuseDay.push({ type: "empty", value: "" });
                  }
                  reuseDay.push({ type: "description", value: exercise.descriptions[di] });
                }
              }
              reuseDay.push({ ...exercise, repeat: undefined });
            }
          }
        }
      }
    }
    return mapping;
  }

  public static evaluate(
    plannerProgram: IPlannerProgram,
    settings: ISettings
  ): { evaluatedWeeks: IPlannerEvalResult[][]; exerciseFullNames: string[] } {
    return PlannerEvaluator.evaluate(plannerProgram, settings);
  }

  public static evaluateFull(
    fullProgramText: string,
    settings: ISettings
  ): { evaluatedWeeks: IPlannerEvalFullResult; exerciseFullNames: string[] } {
    return PlannerEvaluator.evaluateFull(fullProgramText, settings);
  }

  public static evaluateText(fullProgramText: string): IPlannerProgramWeek[] {
    const evaluator = new PlannerExerciseEvaluatorText(fullProgramText);
    const tree = plannerExerciseParser.parse(fullProgramText);
    const data = evaluator.evaluate(tree.topNode);
    const weeks: IPlannerProgramWeek[] = data.map((week) => {
      return {
        name: week.name,
        description: week.description,
        days: week.days.map((day) => {
          return {
            name: day.name,
            description: day.description,
            exerciseText: day.exercises.join("").trim(),
          };
        }),
      };
    });
    if (weeks.length === 0) {
      weeks.push({ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] });
    }
    return weeks;
  }

  public static fullToWeekEvalResult(fullResult: IPlannerEvalFullResult): IPlannerEvalResult[][] {
    return fullResult.success
      ? fullResult.data.map((week) => week.days.map((d) => ({ success: true, data: d.exercises })))
      : [[fullResult]];
  }

  public static generateFullText(weeks: IPlannerProgramWeek[]): string {
    let fullText = "";
    for (const week of weeks) {
      if (week.description != null) {
        fullText +=
          week.description
            .split("\n")
            .map((l) => (l ? `// ${l}` : "//"))
            .join("\n") + "\n";
      }
      fullText += `# ${week.name}\n`;
      for (const day of week.days) {
        if (day.description != null) {
          fullText +=
            day.description
              .split("\n")
              .map((l) => `// ${l}`)
              .join("\n") + "\n";
        }
        fullText += `## ${day.name}\n`;
        fullText += `${day.exerciseText}\n\n`;
      }
      fullText += "\n";
    }
    return fullText;
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
    };
    const program = { ...newProgram, planner: planner.program };
    return {
      program: program,
      settings: {
        timers: newSettings.timers,
        planner: newSettings.planner,
        units: newSettings.units,
      },
      customExercises: planner.settings.exercises,
      version: planner.version,
    };
  }

  public static buildExportedProgram(
    id: string,
    program: IPlannerProgram,
    settings: ISettings,
    nextDay?: number
  ): IExportedProgram {
    const { evaluatedWeeks } = PlannerProgram.evaluate(program, settings);

    const exportedPlannerProgram: IExportedPlannerProgram = {
      id,
      type: "v2",
      version: getLatestMigrationVersion(),
      program: program,
      plannerSettings: settings.planner,
      settings: {
        exercises: PlannerProgram.usedExercises(settings.exercises, evaluatedWeeks),
        timer: settings.timers.workout ?? 0,
      },
    };
    return Program.exportedPlannerProgramToExportedProgram(exportedPlannerProgram, nextDay);
  }

  public static async getExportedPlannerProgram(
    client: Window["fetch"],
    program: IExportedPlannerProgram,
    settings: ISettings
  ): Promise<IEither<IExportedPlannerProgram, string[]>> {
    const storage = Storage.getDefault();
    storage.version = program.version;
    storage.programs = [{ ...Program.create(program.program.name), planner: program.program }];
    storage.settings = { ...storage.settings, planner: program.plannerSettings || storage.settings.planner };
    storage.settings.exercises = { ...storage.settings.exercises, ...settings.exercises };

    const result = await Storage.get(client, storage);
    if (result.success) {
      const newStorage = result.data;
      return {
        success: true,
        data: {
          id: program.id,
          type: "v2",
          version: newStorage.version,
          program: newStorage.programs[0].planner!,
          plannerSettings: storage.settings.planner,
          settings: {
            exercises: storage.settings.exercises || {},
            timer: storage.settings.timers?.workout || 180,
          },
        },
      };
    } else {
      return { success: false, error: result.error };
    }
  }
}
