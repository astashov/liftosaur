import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import {
  IDayData,
  IPercentage,
  IPlannerProgram,
  IPlannerProgramDay,
  IPlannerProgramWeek,
  ISettings,
  IWeight,
} from "../types";
import { n } from "../utils/math";
import { ObjectUtils_isEqual, ObjectUtils_entries } from "../utils/object";
import {
  Weight_eqNull,
  Weight_eq,
  Weight_zero,
  Weight_print,
  Weight_buildPct,
  Weight_build,
  Weight_printNull,
} from "./weight";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
  IPlannerProgramExerciseEvaluatedSetVariation,
  IPlannerProgramExerciseWarmupSet,
} from "../pages/planner/models/types";
import { IEvaluatedProgram, Program_getProgramExercise } from "./program";
import { Exercise_get, Exercise_fullName } from "./exercise";
import { CollectionUtils_compact } from "../utils/collection";
import { PP } from "./pp";
import { PlannerKey } from "../pages/planner/plannerKey";
import { IPlannerTopLineItem } from "../pages/planner/plannerExerciseEvaluator";

interface IPlannerToProgram2Globals {
  weight?: IWeight | IPercentage;
  rpe?: number;
  timer?: number;
  logRpe?: boolean;
  askWeight?: boolean;
}

type IDereuseDecision = "sets" | "weight" | "rpe" | "timer" | "progress" | "update";

export interface IPlannerToProgramConvertOpts {
  renameMapping?: Record<string, { to: string; dayData?: Required<IDayData> }>;
  reorder?: { dayData: Required<IDayData>; fromIndex: number; toIndex: number }[];
  add?: { dayData: Required<IDayData>; index: number; fullName: string }[];
}

export class ProgramToPlanner {
  constructor(
    private readonly program: IEvaluatedProgram,
    private readonly settings: ISettings
  ) {}

  private getCurrentDescriptionExercise(
    key: string,
    weekIndex: number,
    dayInWeekIndex: number
  ): IPlannerProgramExercise | undefined {
    return this.program.weeks[weekIndex]?.days[dayInWeekIndex]?.exercises?.find((e) => e.key === key);
  }

  private getCurrentDescriptionIndex(key: string, weekIndex: number, dayInWeekIndex: number): number {
    const exercise = this.getCurrentDescriptionExercise(key, weekIndex, dayInWeekIndex);
    const descriptions = exercise?.descriptions.values || [];
    const index = descriptions.findIndex((s) => s.isCurrent);
    return index === -1 ? 0 : index;
  }

  private shouldReuseSets(programExercise: IPlannerProgramExercise): boolean {
    return !!programExercise.reuse;
  }

  private getDereuseDecisions(programExercise: IPlannerProgramExercise): IDereuseDecision[] {
    const dereuseDecisions: Set<IDereuseDecision> = new Set();
    const reuseExercise = programExercise.reuse?.exercise;
    if (!reuseExercise) {
      return Array.from(dereuseDecisions);
    }
    const globals = this.getGlobals(programExercise);
    const reusedGlobals = this.getGlobals(reuseExercise);
    if (programExercise.evaluatedSetVariations.length !== reuseExercise.evaluatedSetVariations.length) {
      dereuseDecisions.add("sets");
    }
    if (
      PlannerProgramExercise.currentEvaluatedSetVariationIndex(programExercise) !==
      PlannerProgramExercise.currentEvaluatedSetVariationIndex(reuseExercise)
    ) {
      dereuseDecisions.add("sets");
    }
    if (reuseExercise.progress != null || programExercise.progress != null) {
      if (
        programExercise.progress == null ||
        programExercise.progress.type !== reuseExercise.progress?.type ||
        (programExercise.progress.reuse
          ? programExercise.progress.reuse?.fullName !== reuseExercise.fullName
          : programExercise.progress.script !== reuseExercise.progress.script) ||
        Object.keys(PlannerProgramExercise.getOnlyChangedState(programExercise)).length > 0
      ) {
        dereuseDecisions.add("progress");
      }
    }
    if (reuseExercise.update != null || programExercise.update != null) {
      if (
        programExercise.update == null ||
        (programExercise.update.reuse
          ? programExercise.update.reuse?.fullName !== reuseExercise.fullName
          : programExercise.update.script !== reuseExercise.update?.script)
      ) {
        dereuseDecisions.add("update");
      }
    }
    if (programExercise.evaluatedSetVariations.length === reuseExercise.evaluatedSetVariations.length) {
      for (let i = 0; i < programExercise.evaluatedSetVariations.length; i += 1) {
        const programVariation = programExercise.evaluatedSetVariations[i];
        const reuseVariation = reuseExercise.evaluatedSetVariations[i];
        if (programVariation.sets.length !== reuseVariation.sets.length) {
          dereuseDecisions.add("sets");
        }
        for (let j = 0; j < programVariation.sets.length; j += 1) {
          const programSet = programVariation.sets[j];
          const reuseSet = reuseVariation.sets[j];
          if (programSet.maxrep !== reuseSet?.maxrep || programSet.minrep !== reuseSet?.minrep) {
            dereuseDecisions.add("sets");
          }
          if (
            reuseSet
              ? !Weight_eqNull(programSet.weight, reuseSet.weight) || programSet.askWeight !== reuseSet.askWeight
              : !Weight_eq(globals.weight || Weight_zero, reusedGlobals.weight || Weight_zero) ||
                globals.askWeight !== reusedGlobals.askWeight
          ) {
            if (globals.weight != null) {
              dereuseDecisions.add("weight");
            } else {
              dereuseDecisions.add("sets");
            }
          }
          if (
            reuseSet
              ? programSet.rpe !== reuseSet.rpe || programSet.logRpe !== reuseSet.logRpe
              : globals.rpe !== reusedGlobals.rpe || globals.logRpe !== reusedGlobals.logRpe
          ) {
            if (globals.rpe != null) {
              dereuseDecisions.add("rpe");
            } else {
              dereuseDecisions.add("sets");
            }
          }
          if (reuseSet ? programSet.timer !== reuseSet.timer : globals.timer !== reusedGlobals.timer) {
            if (globals.timer != null) {
              dereuseDecisions.add("timer");
            } else {
              dereuseDecisions.add("sets");
            }
          }
        }
      }
    }
    return Array.from(dereuseDecisions);
  }

  private reorderGroupedTopLine(
    groupedTopLine: IPlannerTopLineItem[][][][],
    reorders: IPlannerToProgramConvertOpts["reorder"]
  ): IPlannerTopLineItem[][][][] {
    if (!reorders) {
      return groupedTopLine;
    }
    for (const reorder of reorders) {
      const groupedDay = groupedTopLine[reorder.dayData.week - 1]?.[reorder.dayData.dayInWeek - 1];
      if (groupedDay) {
        const indexMap = groupedDay.reduce<{ result: Record<number, number>; i: number }>(
          ({ result, i }, group, index) => {
            const exercise = group.find((item) => item.type === "exercise");
            if (exercise && !exercise.notused) {
              result[i] = index;
              i += 1;
            }
            return { result, i };
          },
          { result: {}, i: 0 }
        ).result;
        const from = groupedDay[indexMap[reorder.fromIndex]];
        if (from) {
          groupedDay.splice(indexMap[reorder.fromIndex], 1);
          groupedDay.splice(indexMap[reorder.toIndex], 0, from);
        }
      }
    }
    return groupedTopLine;
  }

  private addGroupedTopLine(
    groupedTopLine: IPlannerTopLineItem[][][][],
    adds: IPlannerToProgramConvertOpts["add"]
  ): IPlannerTopLineItem[][][][] {
    if (!adds) {
      return groupedTopLine;
    }
    for (const add of adds) {
      const groupedDay = groupedTopLine[add.dayData.week - 1]?.[add.dayData.dayInWeek - 1];
      if (groupedDay) {
        groupedDay.splice(add.index, 0, [
          { type: "exercise", value: PlannerKey.fromFullName(add.fullName, this.settings.exercises) },
        ]);
      }
    }
    return groupedTopLine;
  }

  private getRenamedValue(
    opts: IPlannerToProgramConvertOpts,
    line: IPlannerTopLineItem,
    weekIndex: number,
    dayInWeekIndex: number
  ): string {
    const renamedValue = opts.renameMapping?.[line.value];
    if (
      renamedValue &&
      (!renamedValue.dayData ||
        (renamedValue.dayData.week === weekIndex + 1 && renamedValue.dayData.dayInWeek === dayInWeekIndex + 1))
    ) {
      return renamedValue.to;
    } else {
      return line.value;
    }
  }

  private addExerciseDescriptions(
    exercise: IPlannerProgramExercise | undefined,
    weekIndex: number,
    dayInWeekIndex: number,
    addedCurrentDescription: boolean
  ): { lines: string[]; addedCurrentDescription: boolean } | undefined {
    if (!exercise) {
      return undefined;
    }
    if (
      exercise?.descriptions.reuse == null ||
      !ObjectUtils_isEqual(
        exercise.descriptions.values || [],
        exercise.descriptions.reuse.exercise?.descriptions.values || []
      )
    ) {
      const lines: string[] = [];
      const currentIndex = this.getCurrentDescriptionIndex(exercise.key, weekIndex, dayInWeekIndex);
      for (let i = 0; i < exercise.descriptions.values.length; i += 1) {
        if (i > 0) {
          lines.push("");
        }
        const description = exercise.descriptions.values[i];
        const parts = description.value.split("\n");
        for (const part of parts) {
          if (currentIndex !== 0 && currentIndex === i && !addedCurrentDescription) {
            lines.push(`// ! ${part}`);
            addedCurrentDescription = true;
          } else {
            lines.push(`// ${part}`);
          }
        }
      }
      return { lines, addedCurrentDescription };
    } else if (exercise?.descriptions.reuse?.exercise) {
      const reusedExercise = exercise.descriptions.reuse.exercise;
      const reusedDayData = reusedExercise.dayData;
      const currentWeekReusedExercisesCount = this.program.weeks[weekIndex]?.days.filter((day) => {
        return day.exercises.some((e) => e.key === reusedExercise.key);
      }).length;
      if (currentWeekReusedExercisesCount === 1 && reusedDayData.week === weekIndex + 1) {
        return { lines: [`// ...${reusedExercise.fullName}`], addedCurrentDescription };
      } else {
        return {
          lines: [`// ...${reusedExercise.fullName}[${reusedDayData.week}:${reusedDayData.dayInWeek}]`],
          addedCurrentDescription,
        };
      }
    } else {
      return undefined;
    }
  }

  public convertToPlanner(opts: IPlannerToProgramConvertOpts = {}): IPlannerProgram {
    const plannerWeeks: IPlannerProgramWeek[] = [];
    const plannerProgram = this.program.planner;
    if (this.program.errors.length > 0) {
      const error = this.program.errors[0];
      const msg = `There's an error during evaluating a program, week ${error.dayData.week}, day: ${error.dayData.dayInWeek}. Please fix it to proceed.\n\n${error.error.toString()}`;
      console.log(PlannerProgram.generateFullText(plannerProgram.weeks));
      if (typeof window !== "undefined" && window.alert != null) {
        window.alert(msg);
      }
      throw error.error;
    }
    const topLineMap = PlannerProgram.topLineItems(plannerProgram, this.settings);
    let groupedTopLineMap = PlannerProgram.groupedTopLines(topLineMap);
    groupedTopLineMap = opts.reorder ? this.reorderGroupedTopLine(groupedTopLineMap, opts.reorder) : groupedTopLineMap;
    groupedTopLineMap = opts.add ? this.addGroupedTopLine(groupedTopLineMap, opts.add) : groupedTopLineMap;
    let dayIndex = 0;
    const addedProgressMap: Record<string, boolean> = {};
    const addedUpdateMap: Record<string, boolean> = {};
    const addedWarmupsMap: Record<string, boolean> = {};
    const addedIdMap: Record<string, boolean> = {};

    for (let weekIndex = 0; weekIndex < this.program.weeks.length; weekIndex += 1) {
      const week = this.program.weeks[weekIndex];
      const plannerWeek: IPlannerProgramWeek = { name: week.name, days: [], description: week.description };
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.days.length; dayInWeekIndex += 1) {
        const programDay = week.days[dayInWeekIndex];
        const plannerDay: IPlannerProgramDay = { name: programDay.name, exerciseText: "" };
        let descriptionIndex: number | undefined = undefined;
        let addedCurrentDescription = false;
        let finishedToAddDescription = false;
        const groupedTopLines = groupedTopLineMap[weekIndex][dayInWeekIndex];
        let groupTextArr: string[] = [];
        groupLoop: for (let groupIndex = 0; groupIndex < groupedTopLines.length; groupIndex += 1) {
          const exerciseTextArr: string[] = [];
          const group = groupedTopLines[groupIndex];
          for (let lineIndex = 0; lineIndex < group.length; lineIndex += 1) {
            const line = group[lineIndex];
            switch (line.type) {
              case "comment": {
                exerciseTextArr.push(line.value);
                break;
              }
              case "description": {
                let key: string | undefined;
                for (let i = lineIndex; i < group.length; i += 1) {
                  if (group[i].type === "exercise") {
                    key = this.getRenamedValue(opts, group[i], weekIndex, dayInWeekIndex);
                    break;
                  }
                }
                if (descriptionIndex == null) {
                  descriptionIndex = 0;
                }
                if (finishedToAddDescription) {
                  break;
                }
                if (key != null) {
                  const exercise = this.getCurrentDescriptionExercise(key, weekIndex, dayInWeekIndex);
                  const result = this.addExerciseDescriptions(
                    exercise,
                    weekIndex,
                    dayInWeekIndex,
                    addedCurrentDescription
                  );
                  if (result) {
                    exerciseTextArr.push(...result.lines);
                    addedCurrentDescription = result.addedCurrentDescription;
                    finishedToAddDescription = true;
                  } else {
                    const currentIndex = this.getCurrentDescriptionIndex(key, weekIndex, dayInWeekIndex);
                    if (currentIndex !== 0 && currentIndex === descriptionIndex && !addedCurrentDescription) {
                      exerciseTextArr.push(line.value.replace(/^\/\/\s*!?\s*/, "// ! "));
                      addedCurrentDescription = true;
                    } else {
                      exerciseTextArr.push(line.value.replace(/^(\/\/\s*)!\s*/, "$1"));
                    }
                  }
                } else {
                  exerciseTextArr.push(line.value.replace(/^(\/\/\s*)!\s*/, "$1"));
                }
                break;
              }
              case "empty": {
                if (!finishedToAddDescription) {
                  exerciseTextArr.push("");
                  if (descriptionIndex != null) {
                    descriptionIndex += 1;
                  }
                }
                break;
              }
              case "exercise": {
                descriptionIndex = undefined;
                const value = this.getRenamedValue(opts, line, weekIndex, dayInWeekIndex);
                const evalExercise = Program_getProgramExercise(dayIndex + 1, this.program, value)!;

                if (evalExercise == null) {
                  continue groupLoop;
                }

                const key = evalExercise.key;

                if (
                  !finishedToAddDescription &&
                  (evalExercise.descriptions.reuse || evalExercise.descriptions.values.length > 0)
                ) {
                  const result = this.addExerciseDescriptions(
                    evalExercise,
                    weekIndex,
                    dayInWeekIndex,
                    addedCurrentDescription
                  );
                  if (result) {
                    exerciseTextArr.push(...result.lines);
                  }
                }

                finishedToAddDescription = false;
                addedCurrentDescription = false;

                let plannerExercise = "";
                plannerExercise += this.getExerciseName(evalExercise);
                plannerExercise += " / ";
                if (evalExercise.notused) {
                  plannerExercise += "used: none / ";
                }
                const variations = evalExercise.evaluatedSetVariations;
                const globals = this.getGlobals(evalExercise);

                const shouldReuseSets = this.shouldReuseSets(evalExercise);
                const dereuseDecisions = shouldReuseSets ? this.getDereuseDecisions(evalExercise) : [];
                if (shouldReuseSets) {
                  plannerExercise += this.reuseToStr(evalExercise);

                  if (dereuseDecisions.includes("sets")) {
                    plannerExercise +=
                      ` / ` +
                      variations
                        .map((v, i) => {
                          return this.variationToString(v, globals, i, evalExercise);
                        })
                        .join(" / ");
                  }

                  const overriddenGlobals: string[] = [];
                  if (dereuseDecisions.includes("weight") && globals.weight != null) {
                    overriddenGlobals.push(`${this.weightExprToStr(globals.weight)}${globals.askWeight ? "+" : ""}`);
                  }
                  if (dereuseDecisions.includes("rpe") && globals.rpe != null) {
                    overriddenGlobals.push(`@${n(globals.rpe)}${globals.logRpe ? "+" : ""}`);
                  }
                  if (dereuseDecisions.includes("timer") && globals.timer != null) {
                    overriddenGlobals.push(`${n(globals.timer)}s`);
                  }
                  if (overriddenGlobals.length > 0) {
                    plannerExercise += ` / ${overriddenGlobals.join(" ")}`;
                  }
                } else {
                  if (evalExercise.setVariations.length > 0) {
                    plannerExercise += variations
                      .map((v, i) => this.variationToString(v, globals, i, evalExercise))
                      .join(" / ");
                  }

                  const globalsStr: string[] = [];
                  if (globals.weight != null) {
                    globalsStr.push(`${this.weightExprToStr(globals.weight)}${globals.askWeight ? "+" : ""}`);
                  }
                  if (globals.rpe != null) {
                    globalsStr.push(`@${globals.rpe}${globals.logRpe ? "+" : ""}`);
                  }
                  if (globals.timer != null) {
                    globalsStr.push(`${globals.timer}s`);
                  }
                  if (globalsStr.length > 0) {
                    plannerExercise += ` / ${globalsStr.join(" ")}`;
                  }
                }

                if (!addedWarmupsMap[key] && evalExercise?.warmupSets) {
                  const warmupSets = this.getWarmupSets(evalExercise);
                  if (warmupSets != null) {
                    plannerExercise += ` / warmup: ${warmupSets}`;
                    addedWarmupsMap[key] = true;
                  }
                }

                if (!addedIdMap[key] && (evalExercise.tags || []).length > 0) {
                  plannerExercise += this.getId(evalExercise);
                  addedIdMap[key] = true;
                }

                const superset = evalExercise.superset?.name;
                if (superset) {
                  plannerExercise += ` / superset: ${superset}`;
                }

                const update = evalExercise.update;
                if (
                  !addedUpdateMap[key] &&
                  update &&
                  (update.reuse || update.script) &&
                  (!evalExercise.reuse || dereuseDecisions.includes("update"))
                ) {
                  const updateStr = ProgramToPlanner.getUpdate(evalExercise, this.settings);
                  if (updateStr) {
                    plannerExercise += ` / ${updateStr}`;
                  }
                  addedUpdateMap[key] = true;
                }

                const progress = evalExercise.progress;
                if (progress && progress.type === "none") {
                  plannerExercise += ` / progress: none`;
                } else if (
                  !addedProgressMap[key] &&
                  progress &&
                  (progress.reuse || progress.script) &&
                  (!evalExercise.reuse || dereuseDecisions.includes("progress"))
                ) {
                  const progressStr = ProgramToPlanner.getProgress(evalExercise, this.settings, false);
                  if (progressStr) {
                    plannerExercise += ` / ${progressStr}`;
                  }
                  addedProgressMap[key] = true;
                }
                exerciseTextArr.push(plannerExercise);
                break;
              }
            }
          }
          if (exerciseTextArr.length > 0) {
            groupTextArr = groupTextArr.concat(exerciseTextArr);
          }
        }
        plannerDay.exerciseText = groupTextArr.join("\n");
        plannerDay.description = programDay.description;
        plannerWeek.days.push(plannerDay);
        dayIndex += 1;
      }
      plannerWeeks.push(plannerWeek);
    }
    const result: IPlannerProgram = { vtype: "planner", name: this.program.name, weeks: plannerWeeks };
    const repeatingExercises = new Set<string>();
    PP.iterate2(this.program.weeks, (exercise) => {
      if (exercise.repeat != null && exercise.repeat.length > 0) {
        const key = PlannerKey.fromPlannerExercise(exercise, this.settings);
        repeatingExercises.add(key);
      }
    });
    const newPlanner = PlannerProgram.compact(this.program.planner, result, this.settings, repeatingExercises);
    // console.log(PlannerProgram.generateFullText(newPlanner.weeks));
    return newPlanner;
  }

  private getExerciseName(programExercise: IPlannerProgramExercise): string {
    if (programExercise.exerciseType) {
      const exercise = Exercise_get(programExercise.exerciseType, this.settings.exercises);
      let name = Exercise_fullName(exercise, this.settings, programExercise.label);
      if (programExercise.order > 0) {
        name = `${name}[${programExercise.order}]`;
      }
      return name;
    } else {
      return programExercise.fullName;
    }
  }

  private reuseToStr(programExercise: IPlannerProgramExercise): string {
    const reuseExercise = programExercise.reuse?.exercise;
    if (!reuseExercise) {
      throw new Error("reuse.exercise is required");
    }
    const reuse = programExercise.reuse;
    if (!reuse) {
      throw new Error("reuse is required");
    }
    let str = "...";
    if (reuseExercise.exerciseType) {
      const exercise = Exercise_get(reuseExercise.exerciseType, this.settings.exercises);
      const reuseStr = Exercise_fullName(exercise, this.settings, reuseExercise.label);
      str += reuseStr;
    } else {
      str += reuseExercise.fullName;
    }
    if (reuse.week || reuse.day) {
      const weekAndDay = CollectionUtils_compact([reuse.week, reuse.day]).join(":");
      str += `[${weekAndDay}]`;
    }
    return str;
  }

  public static getUpdate(programExercise: IPlannerProgramExercise, settings: ISettings, hideScript?: boolean): string {
    const update = programExercise.update;
    if (!update) {
      return "";
    }
    if (update.reuse) {
      if (update.reuse.exercise?.exerciseType) {
        const exercise = Exercise_get(update.reuse.exercise.exerciseType, settings.exercises);
        const fullName = Exercise_fullName(exercise, settings, update.reuse.exercise.label);
        return `update: custom() { ...${fullName} }`;
      } else {
        return ` / update: custom() { ...${update.reuse.exercise?.fullName || update.reuse.fullName} }`;
      }
    } else {
      return `update: custom() ${hideScript ? "{~ ... ~}" : update.script}`;
    }
  }

  private getId(programExercise: IPlannerProgramExercise): string {
    return ` / id: tags(${(programExercise.tags || []).join(", ")})`;
  }

  public static getProgress(
    programExercise: IPlannerProgramExercise,
    settings: ISettings,
    hideScript?: boolean
  ): string {
    const progress = programExercise.progress;
    if (!progress) {
      return "";
    }
    let progressStr = `progress: ${progress.type}`;
    const state = PlannerProgramExercise.getState(programExercise);
    const stateMetadata = PlannerProgramExercise.getStateMetadata(programExercise);
    if (progress.type === "custom") {
      const onlyChangedState = PlannerProgramExercise.getOnlyChangedState(programExercise);
      progressStr += `(${ObjectUtils_entries(onlyChangedState)
        .map(([k, v]) => {
          return `${k}${stateMetadata[k]?.userPrompted ? "+" : ""}: ${Weight_print(v)}`;
        })
        .join(", ")})`;
    } else if (progress.type === "lp") {
      const increment = state.increment as IWeight | IPercentage;
      const successes = state.successes as number;
      const successCounter = state.successCounter as number;
      const decrement = state.decrement as IWeight | IPercentage;
      const failures = state.failures as number;
      const failureCounter = state.failureCounter as number;
      const args: string[] = [];
      args.push(Weight_print(increment));
      if (successes > 1 || decrement.value > 0) {
        args.push(`${successes}`);
      }
      if (successes > 1 || decrement.value > 0) {
        args.push(`${successCounter}`);
      }
      if (decrement.value > 0) {
        args.push(Weight_print(decrement));
      }
      if (failures > 1) {
        args.push(`${failures}`);
      }
      if (failures > 1) {
        args.push(`${failureCounter}`);
      }
      progressStr += `(${args.join(", ")})`;
    } else if (progress.type === "dp") {
      const increment = state.increment as IWeight | IPercentage;
      const minReps = state.minReps as number;
      const maxReps = state.maxReps as number;
      const args = [Weight_print(increment), `${minReps}`, `${maxReps}`];
      progressStr += `(${args.join(", ")})`;
    } else if (progress.type === "sum") {
      const reps = state.reps as number;
      const increment = state.increment as IWeight | IPercentage;
      const args = [`${reps}`, Weight_print(increment)];
      progressStr += `(${args.join(", ")})`;
    }
    if (progress.type === "custom") {
      if (progress.reuse) {
        if (progress.reuse.exercise?.exerciseType) {
          const exercise = Exercise_get(progress.reuse.exercise.exerciseType, settings.exercises);
          const fullName = Exercise_fullName(exercise, settings, progress.reuse.exercise.label);
          progressStr += ` { ...${fullName} }`;
        } else {
          progressStr += ` { ...${progress.reuse.exercise?.fullName || progress.reuse.fullName} }`;
        }
      } else {
        progressStr += hideScript ? ` {~ ... ~}` : ` ${progress.script}`;
      }
    }
    return progressStr;
  }

  private getGlobals(exercise: IPlannerProgramExercise): IPlannerToProgram2Globals {
    const variations = exercise.evaluatedSetVariations;
    if (variations.length === 0 || variations[0].sets.length === 0) {
      const globals = exercise.globals;
      const reusedGlobals = exercise.reuse?.exercise?.globals || {};
      return {
        weight: globals?.weight ?? reusedGlobals.weight,
        rpe: globals?.rpe ?? reusedGlobals.rpe,
        timer: globals?.timer ?? reusedGlobals.timer,
        logRpe: globals?.logRpe ?? reusedGlobals.logRpe,
        askWeight: globals?.askWeight ?? reusedGlobals.askWeight,
      };
    }
    const firstWeight = variations[0]?.sets[0]?.weight;
    const firstRpe = variations[0]?.sets[0]?.rpe;
    const firstLogRpe = !!variations[0]?.sets[0]?.logRpe;
    const firstAskWeight = !!variations[0]?.sets[0]?.askWeight;
    const firstTimer = variations[0]?.sets[0]?.timer;
    return {
      weight:
        firstWeight != null &&
        variations.every((v) =>
          v.sets.every((s) => Weight_eqNull(s.weight, firstWeight) && !!s.askWeight === firstAskWeight)
        )
          ? firstWeight
          : undefined,
      askWeight: variations.every((v) => v.sets.every((s) => Weight_eqNull(s.weight, firstWeight) && !!s.askWeight)),
      rpe:
        firstRpe != null &&
        variations.every((v) => v.sets.every((s) => s.rpe === firstRpe && !!s.logRpe === firstLogRpe))
          ? firstRpe
          : undefined,
      logRpe: variations.every((v) => v.sets.every((s) => s.rpe === firstRpe && !!s.logRpe)),
      timer:
        firstTimer != null && variations.every((v) => v.sets.every((s) => s.timer === firstTimer))
          ? firstTimer
          : undefined,
    };
  }

  private groupVariationSets(
    sets: IPlannerProgramExerciseEvaluatedSet[],
    exercise: IPlannerProgramExercise,
    index: number
  ): [IPlannerProgramExerciseEvaluatedSet, number][] {
    if (sets.length === 0) {
      const originalSets = PlannerProgramExercise.sets(exercise, index)[0];
      return [
        [
          {
            maxrep: originalSets?.repRange?.maxrep || 1,
            minrep: originalSets?.repRange?.minrep,
            weight: originalSets?.weight || Weight_zero,
            logRpe: originalSets?.logRpe || false,
            isAmrap: originalSets?.repRange?.isAmrap || false,
            isQuickAddSet: originalSets?.repRange?.isQuickAddSet || false,
            askWeight: originalSets?.askWeight || false,
            rpe: originalSets?.rpe,
            timer: originalSets?.timer,
            label: originalSets?.label,
          },
          0,
        ],
      ];
    }
    let lastKey: string | undefined;
    const groups: [IPlannerProgramExerciseEvaluatedSet, number][] = [];
    for (const set of sets) {
      const key = this.setToKey(set);
      if (lastKey == null || lastKey !== key) {
        groups.push([set, 0]);
      }
      groups[groups.length - 1][1] += 1;
      lastKey = key;
    }
    return groups;
  }

  private groupWarmupsSets(sets: IPlannerProgramExerciseWarmupSet[]): [IPlannerProgramExerciseWarmupSet, number][] {
    let lastKey: string | undefined;
    const groups: [IPlannerProgramExerciseWarmupSet, number][] = [];
    for (const set of sets) {
      const key = this.warmupSetToKey(set);
      if (lastKey == null || lastKey !== key) {
        groups.push([set, 0]);
      }
      groups[groups.length - 1][1] += set.numberOfSets;
      lastKey = key;
    }
    return groups;
  }

  private getWarmupSets(programExercise: IPlannerProgramExercise): string | undefined {
    const warmupSets = programExercise.warmupSets;
    if (warmupSets) {
      const groups = this.groupWarmupsSets(warmupSets);
      const strs: string[] = [];
      for (const group of groups) {
        const first = group[0];
        const length = group[1];
        const weight =
          first.weight ?? (first.percentage != null ? Weight_buildPct(first.percentage) : Weight_build(0, "lb"));
        strs.push(`${length}x${first.reps} ${Weight_print(weight)}`);
      }
      return strs.length === 0 ? "none" : strs.join(", ");
    }
    return undefined;
  }

  private weightExprToStr(weightExpr?: IWeight | IPercentage): string {
    if (weightExpr != null) {
      return Weight_print(weightExpr);
    }
    return "";
  }

  private variationToString(
    variation: IPlannerProgramExerciseEvaluatedSetVariation,
    globals: IPlannerToProgram2Globals,
    index: number,
    exercise: IPlannerProgramExercise
  ): string {
    const groupedVariationSets = this.groupVariationSets(variation.sets, exercise, index);
    const result: string[] = [];
    for (const group of groupedVariationSets) {
      const set = group[0];
      let setStr = "";
      setStr += `${group[1]}${set.isQuickAddSet ? "+" : ""}x`;
      setStr += set.minrep != null ? `${n(Math.max(0, set.minrep))}-` : "";
      setStr += `${n(Math.max(0, set.maxrep ?? 0))}`;
      setStr += set.isAmrap ? "+" : "";
      if (globals.weight == null) {
        const weightValue = this.weightExprToStr(set.weight);
        setStr += weightValue ? ` ${weightValue}${set.askWeight ? "+" : ""}` : "";
      }
      if (globals.rpe == null) {
        setStr += set.rpe != null ? ` @${n(Math.max(0, set.rpe))}` : "";
        setStr += set.rpe != null && set.logRpe ? "+" : "";
      }
      if (globals.timer == null) {
        setStr += set.timer ? ` ${n(Math.max(0, set.timer))}s` : "";
      }
      if (set.label) {
        setStr += ` (${set.label})`;
      }
      result.push(setStr);
    }
    let resultStr = "";
    if (index > 0 && variation.isCurrent) {
      resultStr += "! ";
    }
    return resultStr + result.map((r) => r.trim()).join(", ");
  }

  private warmupSetToKey(set: IPlannerProgramExerciseWarmupSet): string {
    return `${set.reps}-${Weight_print(set.weight || set.percentage || 0)}`;
  }

  private setToKey(set: IPlannerProgramExerciseEvaluatedSet): string {
    return `${set.maxrep}-${set.minrep}-${Weight_printNull(set.weight)}-${set.isAmrap}-${set.rpe}-${set.logRpe}-${
      set.timer
    }-${set.label}-${set.askWeight}`;
  }
}
