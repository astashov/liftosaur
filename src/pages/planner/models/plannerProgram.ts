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
  IProgramExercise,
  ISettings,
} from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { equipmentName, Exercise } from "../../../models/exercise";
import { PlannerExerciseEvaluatorText } from "../plannerExerciseEvaluatorText";
import { IPlannerTopLineItem } from "../plannerExerciseEvaluator";
import { IExportedProgram, Program } from "../../../models/program";
import { PlannerNodeName } from "../plannerExerciseStyles";
import { PlannerKey } from "../plannerKey";
import { PlannerEvaluator } from "../plannerEvaluator";
import { IWeightChange } from "../../../models/programExercise";
import { Storage } from "../../../models/storage";
import { Weight } from "../../../models/weight";
import { PP } from "../../../models/pp";
import { IEither } from "../../../utils/types";
import { UidFactory } from "../../../utils/generator";

export type IExerciseTypeToProperties = Record<string, (IPlannerProgramProperty & { dayData: Required<IDayData> })[]>;
export type IExerciseTypeToWarmupSets = Record<string, IPlannerProgramExerciseWarmupSet[] | undefined>;

export class PlannerDayDataError extends Error {
  constructor(message: string, public readonly dayData: Required<IDayData>) {
    super(message);
  }
}

export type IDereuseDecision = "all" | "weight" | "rpe" | "timer";

export class PlannerProgram {
  public static isValid(program: IPlannerProgram, settings: ISettings): boolean {
    const { evaluatedWeeks } = PlannerProgram.evaluate(program, settings);
    return evaluatedWeeks.every((week) => week.every((day) => day.success));
  }

  public static replaceWeight(programExercise: IProgramExercise, weightChanges: IWeightChange[]): IProgramExercise {
    if (weightChanges.every((wc) => ObjectUtils.isEqual(wc.originalWeight, wc.weight))) {
      return programExercise;
    }
    return {
      ...programExercise,
      variations: programExercise.variations.map((variation) => {
        return {
          ...variation,
          sets: variation.sets.map((set) => {
            const weightChange = weightChanges.find((wc) => Weight.print(wc.originalWeight) === set.weightExpr);
            if (weightChange != null) {
              const weightStr = Weight.print(weightChange.weight);
              return {
                ...set,
                weightExpr: weightStr,
              };
            } else {
              return set;
            }
          }),
        };
      }),
    };
  }

  public static replaceExercise(
    plannerProgram: IPlannerProgram,
    key: string,
    exerciseType: IExerciseType,
    settings: ISettings,
    customLabel?: string
  ): IEither<IPlannerProgram, string> {
    const conversions: Record<string, string> = {};
    const exercise = Exercise.get(exerciseType, settings.exercises);

    function getNewFullName(oldFullName: string): string {
      const label = customLabel || PlannerExerciseEvaluator.extractNameParts(oldFullName, settings).label;
      return `${label ? `${label}: ` : ""}${exercise.name}${
        exerciseType.equipment != null && exercise.defaultEquipment !== exerciseType.equipment
          ? `, ${equipmentName(exerciseType.equipment)}`
          : ""
      }`;
    }

    const newPlannerProgram = this.modifyTopLineItems(plannerProgram, settings, (line) => {
      if (line.type === "exercise") {
        line.descriptions = line.descriptions?.map((d) => {
          if (d.match(/^\s*\/+\s*\.\.\./)) {
            const fullName = d.replace(/^\s*\/+\s*.../, "").trim();
            const exerciseKey = PlannerKey.fromFullName(fullName, settings);
            if (exerciseKey === key) {
              return `// ...${getNewFullName(fullName)}`;
            }
          }
          return d;
        });

        if (line.value === key && line.fullName) {
          const newFullName = getNewFullName(line.fullName);
          conversions[line.fullName] = newFullName;
          line.fullName = newFullName;
        }
        let fakeScript = `E / ${line.sections}`;
        const fakeTree = plannerExerciseParser.parse(fakeScript);
        const cursor = fakeTree.cursor();
        const ranges: [number, number, string][] = [];
        let newFullName;
        do {
          if (cursor.type.name === PlannerNodeName.ExerciseName) {
            const oldFullname = fakeScript.slice(cursor.node.from, cursor.node.to);
            const exerciseKey = PlannerKey.fromFullName(oldFullname, settings);
            if (exerciseKey === key) {
              newFullName = getNewFullName(oldFullname);
              ranges.push([cursor.node.from, cursor.node.to, newFullName]);
            }
          }
        } while (cursor.next());
        if (newFullName) {
          fakeScript = PlannerExerciseEvaluator.applyChangesToScript(fakeScript, ranges);
          line.sections = fakeScript.replace(/^E \//, "").trim();
        }
      }
      return line;
    });
    const { evaluatedWeeks } = PlannerProgram.evaluate(newPlannerProgram, settings);
    const errors: [number, number, PlannerSyntaxError][] = [];
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex++) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex++) {
        const day = week[dayInWeekIndex];
        if (!day.success) {
          errors.push([weekIndex + 1, dayInWeekIndex + 1, day.error]);
        }
      }
    }
    if (errors.length > 0) {
      if (customLabel) {
        return {
          success: false,
          error: `Failed to replace exercise:\n${errors
            .map(([week, day, error]) => `Week ${week}, Day ${day}: ${error.toString()}`)
            .join("\n")}`,
        };
      } else {
        return this.replaceExercise(plannerProgram, key, exerciseType, settings, UidFactory.generateUid(3));
      }
    } else {
      return { success: true, data: newPlannerProgram };
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
    settings: ISettings
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
              str += `${line.fullName}${repeatStr} / ${line.sections}\n`;
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
