import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import {
  IPercentage,
  IPlannerProgram,
  IPlannerProgramDay,
  IPlannerProgramWeek,
  IProgram,
  IProgramExercise,
  IProgramSet,
  IProgramState,
  ISettings,
  IWeight,
} from "../types";
import { MathUtils } from "../utils/math";
import { ObjectUtils } from "../utils/object";
import { Exercise, equipmentName } from "./exercise";
import { Weight } from "./weight";
import { PlannerToProgram2 } from "./plannerToProgram2";
import { IProgramExerciseWarmupSet } from "../types";
import { ILiftoscriptVariableValue } from "../liftoscriptEvaluator";
import { IPlannerEvalResult } from "../pages/planner/plannerExerciseEvaluator";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramReuse } from "../pages/planner/models/types";

interface IPlannerToProgram2Globals {
  weight?: string;
  rpe?: string;
  timer?: string;
  logRpe?: boolean;
  askWeight?: boolean;
}

export class ProgramToPlanner {
  private _evaluatedWeeks?: IPlannerEvalResult[][];
  private _reuseGraph?: Record<string, Record<string, Record<string, IPlannerProgramReuse>>>;

  constructor(
    private readonly program: IProgram,
    private readonly plannerProgram: IPlannerProgram,
    private readonly settings: ISettings,
    private readonly setVariationIndexMap: Partial<Record<string, ILiftoscriptVariableValue<number>[]>>,
    private readonly descriptionIndexMap: Partial<Record<string, ILiftoscriptVariableValue<number>[]>>,
    private readonly dereuseExercises: Record<string, Record<string, Set<string>>>
  ) {}

  public static exerciseKeyForProgramExercise(programExercise: IProgramExercise, settings: ISettings): string {
    return PlannerProgram.nameToKey(
      `${programExercise.name},${equipmentName(programExercise.exerciseType.equipment, settings.equipment)}`,
      settings
    );
  }

  private getReuseGraph(): Record<string, Record<string, Record<string, IPlannerProgramReuse>>> {
    if (this._reuseGraph != null) {
      return this._reuseGraph;
    }
    const evaluatedWeeks = this.getEvaluatedWeeks();

    const exerciseKeyToId = this.program.exercises.reduce<Record<string, string>>((memo, e) => {
      memo[ProgramToPlanner.exerciseKeyForProgramExercise(e, this.settings)] = e.id;
      return memo;
    }, {});

    const graph: Record<string, Record<string, Record<string, IPlannerProgramReuse>>> = {};
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
        const day = week[dayIndex];
        if (day.success) {
          for (const exercise of day.data) {
            const key = PlannerToProgram2.plannerExerciseKey(exercise, this.settings);
            const id = exerciseKeyToId[key];
            const reuse = exercise.reuse;
            if (reuse?.exercise != null && !this.dereuseExercises[weekIndex]?.[dayIndex]?.has(key)) {
              const reuseKey = PlannerProgram.nameToKey(reuse.exercise, this.settings);
              const reuseWeekIndex = reuse.week != null ? reuse.week - 1 : weekIndex;
              const condition =
                reuse.day != null
                  ? !this.dereuseExercises[reuseWeekIndex]?.[reuse.day - 1]?.has(reuseKey)
                  : ObjectUtils.values(this.dereuseExercises[reuseWeekIndex] || {}).every((s) => !s.has(reuseKey));
              if (condition) {
                const reuseId = exerciseKeyToId[reuseKey];
                graph[weekIndex] = graph[weekIndex] || {};
                graph[weekIndex][dayIndex] = graph[weekIndex][dayIndex] || {};
                graph[weekIndex][dayIndex][id] = {
                  exercise: reuseId,
                  week: reuse.week,
                  day: reuse.day,
                };
              }
            }
          }
        }
      }
    }
    this._reuseGraph = graph;
    return graph;
  }

  public static variationsMap(
    plannerProgram: IPlannerProgram,
    settings: ISettings
  ): Record<string, Record<number, [number, number]>> {
    const { evaluatedWeeks } = PlannerProgram.evaluate(plannerProgram, settings, { skipDescriptionPostProcess: true });

    const variationsMap: Record<string, Record<number, [number, number]>> = {};
    const variationsRunningIndex: Record<string, number> = {};

    let variationsDayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          for (const exercise of day.data) {
            const key = PlannerToProgram2.plannerExerciseKey(exercise, settings);
            variationsRunningIndex[key] = variationsRunningIndex[key] || 0;
            variationsMap[key] = variationsMap[key] || {};
            const numberOfVariations = PlannerProgramExercise.setVariations(exercise).length;
            variationsMap[key][variationsDayIndex] = [
              variationsRunningIndex[key],
              variationsRunningIndex[key] + numberOfVariations,
            ];
            variationsRunningIndex[key] += numberOfVariations;
          }
        }
        variationsDayIndex += 1;
      }
    }
    return variationsMap;
  }

  private getEvaluatedWeeks(): IPlannerEvalResult[][] {
    if (this._evaluatedWeeks == null) {
      const { evaluatedWeeks } = PlannerProgram.evaluate(this.plannerProgram, this.settings);
      this._evaluatedWeeks = evaluatedWeeks;
    }
    return this._evaluatedWeeks;
  }

  private getCurrentSetVariationIndex(key: string, weekIndex: number, dayInWeekIndex: number): number {
    const evaluatedWeeks = this.getEvaluatedWeeks();
    const exercises = evaluatedWeeks[weekIndex][dayInWeekIndex];
    if (exercises.success) {
      const exercise = exercises.data.find((e) => PlannerToProgram2.plannerExerciseKey(e, this.settings) === key);
      if (exercise != null) {
        const numberOfVariations = PlannerProgramExercise.setVariations(exercise).length;
        let isCurrentIndex = exercise.setVariations.findIndex((v) => v.isCurrent);
        isCurrentIndex = isCurrentIndex === -1 ? 0 : isCurrentIndex;
        const setVariationIndexAdd = this.setVariationIndexMap[key];
        if (setVariationIndexAdd != null) {
          for (const add of setVariationIndexAdd) {
            const [targetWeek, targetDay] = add.target;
            if (
              (targetWeek === "*" || targetWeek === weekIndex + 1) &&
              (targetDay === "*" || targetDay === dayInWeekIndex + 1)
            ) {
              if (add.op === "=") {
                isCurrentIndex = add.value - 1;
              } else if (add.op === "+=") {
                isCurrentIndex += add.value;
              } else if (add.op === "-=") {
                isCurrentIndex -= add.value;
              } else if (add.op === "*=") {
                isCurrentIndex *= add.value;
              } else if (add.op === "/=") {
                isCurrentIndex /= add.value;
              }
            }
          }
        }
        isCurrentIndex = isCurrentIndex % numberOfVariations;
        return isCurrentIndex;
      }
    }
    return 0;
  }

  private getCurrentDescriptionIndex(key: string, weekIndex: number, dayInWeekIndex: number): number {
    const evaluatedWeeks = this.getEvaluatedWeeks();
    const exercises = evaluatedWeeks[weekIndex][dayInWeekIndex];
    if (exercises.success) {
      const exercise = exercises.data.find((e) => PlannerToProgram2.plannerExerciseKey(e, this.settings) === key);
      if (exercise != null) {
        const numberOfDescriptions = exercise.descriptions.length;
        let isCurrentIndex = exercise.descriptions.findIndex((v) => v.isCurrent);
        isCurrentIndex = isCurrentIndex === -1 ? 0 : isCurrentIndex;
        const descriptionIndexAdd = this.descriptionIndexMap[key];
        if (descriptionIndexAdd != null) {
          for (const add of descriptionIndexAdd) {
            const [targetWeek, targetDay] = add.target;
            if (
              (targetWeek === "*" || targetWeek === weekIndex + 1) &&
              (targetDay === "*" || targetDay === dayInWeekIndex + 1)
            ) {
              if (add.op === "=") {
                isCurrentIndex = add.value - 1;
              } else if (add.op === "+=") {
                isCurrentIndex += add.value;
              } else if (add.op === "-=") {
                isCurrentIndex -= add.value;
              } else if (add.op === "*=") {
                isCurrentIndex *= add.value;
              } else if (add.op === "/=") {
                isCurrentIndex /= add.value;
              }
            }
          }
        }
        isCurrentIndex = isCurrentIndex % numberOfDescriptions;
        return isCurrentIndex;
      }
    }
    return 0;
  }

  public convertToPlanner(): IPlannerProgram {
    const plannerWeeks: IPlannerProgramWeek[] = [];
    const topLineMap = PlannerProgram.topLineItems(this.plannerProgram, this.settings);
    const variationsMap = ProgramToPlanner.variationsMap(this.plannerProgram, this.settings);
    let dayIndex = 0;
    const addedProgressMap: Record<string, boolean> = {};
    const addedUpdateMap: Record<string, boolean> = {};
    const addedWarmupsMap: Record<string, boolean> = {};
    const addedQuickAddSet: Record<string, boolean> = {};
    for (let weekIndex = 0; weekIndex < this.program.weeks.length; weekIndex += 1) {
      const week = this.program.weeks[weekIndex];
      const plannerWeek: IPlannerProgramWeek = { name: week.name, days: [] };
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.days.length; dayInWeekIndex += 1) {
        const topLines = topLineMap[weekIndex][dayInWeekIndex];
        const weekDay = week.days[dayInWeekIndex];
        const programDay = this.program.days.find((d) => d.id === weekDay.id)!;
        const plannerDay: IPlannerProgramDay = { name: programDay.name, exerciseText: "" };
        const exerciseTextArr: string[] = [];
        let descriptionIndex: number | undefined = undefined;
        let addedCurrentDescription = false;
        for (let lineIndex = 0; lineIndex < topLines.length; lineIndex += 1) {
          const line = topLines[lineIndex];
          switch (line.type) {
            case "comment": {
              exerciseTextArr.push(line.value);
              if (descriptionIndex != null) {
                descriptionIndex += 1;
              }
              break;
            }
            case "description": {
              let key: string | undefined;
              for (let i = lineIndex; i < topLines.length; i += 1) {
                if (topLines[i].type === "exercise") {
                  key = topLines[i].value;
                  break;
                }
              }
              let value: string;
              if (descriptionIndex == null) {
                descriptionIndex = 0;
              }
              if (key != null) {
                const currentIndex = this.getCurrentDescriptionIndex(key, weekIndex, dayInWeekIndex);
                if (currentIndex !== 0 && currentIndex === descriptionIndex && !addedCurrentDescription) {
                  value = line.value.replace(/^\/\/\s*!?\s*/, "// ! ");
                  addedCurrentDescription = true;
                } else {
                  value = line.value.replace(/^(\/\/\s*)!\s*/, "$1");
                }
              } else {
                value = line.value.replace(/^(\/\/\s*)!\s*/, "$1");
              }
              exerciseTextArr.push(value);
              break;
            }
            case "empty": {
              exerciseTextArr.push("");
              if (descriptionIndex != null) {
                descriptionIndex += 1;
              }
              break;
            }
            case "exercise": {
              descriptionIndex = undefined;
              addedCurrentDescription = false;
              const dayExercise = this.program.exercises.find(
                (e) => ProgramToPlanner.exerciseKeyForProgramExercise(e, this.settings) === line.value
              )!;
              const programExercise = this.program.exercises.find((e) => e.id === dayExercise.id)!;
              const notused = this.program.days.every((d) => d.exercises.every((e) => e.id !== programExercise.id));
              const key = ProgramToPlanner.exerciseKeyForProgramExercise(programExercise, this.settings);
              const exercise = Exercise.findById(programExercise.exerciseType.id, this.settings.exercises)!;
              let plannerExercise = "";
              plannerExercise += `${programExercise.name}`;
              if (programExercise.exerciseType.equipment !== exercise.defaultEquipment) {
                plannerExercise += `, ${equipmentName(
                  programExercise.exerciseType.equipment,
                  this.settings.equipment
                )}`;
              }
              if (line.order != null && line.order !== 0) {
                plannerExercise += `[${line.order}]`;
              }
              plannerExercise += " / ";
              if (notused) {
                plannerExercise += "used: none / ";
              }
              const [from, to] = variationsMap[key][dayIndex];
              const currentSetVariationIndex = this.getCurrentSetVariationIndex(key, weekIndex, dayInWeekIndex);
              const variations = programExercise.variations.slice(from, to);

              const firstWeight = variations[0]?.sets[0]?.weightExpr;
              const firstRpe = variations[0]?.sets[0]?.rpeExpr;
              const firstLogRpe = !!variations[0]?.sets[0]?.logRpe;
              const firstAskWeight = !!variations[0]?.sets[0]?.askWeight;
              const firstTimer = variations[0]?.sets[0]?.timerExpr;
              const globals: IPlannerToProgram2Globals = {
                weight:
                  firstWeight != null &&
                  variations.every((v) =>
                    v.sets.every((s) => s.weightExpr === firstWeight && !!s.askWeight === firstAskWeight)
                  )
                    ? firstWeight
                    : undefined,
                askWeight: variations.every((v) => v.sets.every((s) => s.weightExpr === firstWeight && !!s.askWeight)),
                rpe:
                  firstRpe != null &&
                  variations.every((v) => v.sets.every((s) => s.rpeExpr === firstRpe && !!s.logRpe === firstLogRpe))
                    ? firstRpe
                    : undefined,
                logRpe: variations.every((v) => v.sets.every((s) => s.rpeExpr === firstRpe && !!s.logRpe)),
                timer:
                  firstTimer != null && variations.every((v) => v.sets.every((s) => s.timerExpr === firstTimer))
                    ? firstTimer
                    : undefined,
              };

              const reuseGraph = this.getReuseGraph();
              const reuse = reuseGraph[weekIndex]?.[dayInWeekIndex]?.[programExercise.id];
              const reusedExercise = reuse ? this.program.exercises.find((e) => e.id === reuse.exercise) : undefined;
              if (reuse && reusedExercise) {
                let reusedKey = this.getExerciseKey(reusedExercise);
                if (reuse.week != null || reuse.day != null) {
                  reusedKey += reuse.week == null ? `[${reuse.day}]` : `[${reuse.week}:${reuse.day ?? "_"}]`;
                }
                plannerExercise += `...${reusedKey}`;
              } else {
                plannerExercise += variations
                  .map((v, i) => {
                    let addQuickAddSet = false;
                    if (!addedQuickAddSet[key] && programExercise.quickAddSets) {
                      addQuickAddSet = true;
                      addedQuickAddSet[key] = true;
                    }
                    const sets = this.setsToString(v.sets, globals, addQuickAddSet);
                    return i !== 0 && i === currentSetVariationIndex ? `! ${sets}` : sets;
                  })
                  .join(" / ");

                if (globals.weight != null) {
                  plannerExercise += ` / ${this.weightExprToStr(globals.weight)}${globals.askWeight ? "+" : ""}`;
                }
                if (globals.rpe != null) {
                  plannerExercise += ` / @${globals.rpe}${globals.logRpe ? "+" : ""}`;
                }
                if (globals.timer != null) {
                  plannerExercise += ` / ${globals.timer}s`;
                }
              }

              if (!addedWarmupsMap[key] && programExercise.warmupSets) {
                const warmupSets = this.getWarmupSets(programExercise);
                if (warmupSets != null) {
                  plannerExercise += ` / warmup: ${warmupSets}`;
                }
              }

              if (!addedUpdateMap[key] && (programExercise.updateDayExpr || programExercise.reuseUpdateDayScript)) {
                plannerExercise += ` / update: custom()`;
                if (programExercise.reuseUpdateDayScript) {
                  const originalProgramExercise = this.program.exercises.find(
                    (e) => e.id === programExercise.reuseUpdateDayScript
                  );
                  if (originalProgramExercise != null) {
                    const originalKey = this.getExerciseKey(originalProgramExercise);
                    plannerExercise += ` { ...${originalKey} }`;
                  }
                } else if (programExercise.updateDayExpr) {
                  plannerExercise += " " + programExercise.updateDayExpr;
                }
                addedUpdateMap[key] = true;
              }

              const skip = this.getSkipProgress(programExercise.finishDayExpr);
              if (skip.some((s) => weekIndex + 1 === s[0] && dayInWeekIndex + 1 === s[1])) {
                plannerExercise += ` / progress: none`;
              } else if (
                !addedProgressMap[key] &&
                (programExercise.finishDayExpr ||
                  programExercise.reuseFinishDayScript ||
                  ObjectUtils.isNotEmpty(programExercise.state))
              ) {
                const progress = this.getProgress(programExercise.state, programExercise.finishDayExpr);
                if (progress != null) {
                  plannerExercise += ` / progress: ${progress}`;
                } else {
                  const stateVars = ObjectUtils.keys(programExercise.state).map(
                    (k) => `${k}: ${this.printVal(programExercise.state[k])}`
                  );
                  plannerExercise += ` / progress: custom(${stateVars.join(", ")})`;
                  if (programExercise.reuseFinishDayScript) {
                    const originalProgramExercise = this.program.exercises.find(
                      (e) => e.id === programExercise.reuseFinishDayScript
                    );
                    if (originalProgramExercise != null) {
                      const originalKey = this.getExerciseKey(originalProgramExercise);
                      plannerExercise += ` { ...${originalKey} }`;
                    }
                  } else if (programExercise.finishDayExpr) {
                    const finishDayExpr = programExercise.finishDayExpr
                      .replace(/^[\s\S]*{~/, "{~")
                      .replace(/~}[\s\S]*$/, "~}");
                    plannerExercise += " " + finishDayExpr;
                  }
                }
                addedProgressMap[key] = true;
              }
              exerciseTextArr.push(plannerExercise);
              break;
            }
          }
        }
        plannerDay.exerciseText = exerciseTextArr.join("\n");
        plannerWeek.days.push(plannerDay);
        dayIndex += 1;
      }
      plannerWeeks.push(plannerWeek);
    }
    const result: IPlannerProgram = { name: this.program.name, weeks: plannerWeeks };
    return PlannerProgram.compact(topLineMap, result, this.settings);
  }

  private printVal(val: number | IWeight | IPercentage): string {
    return Weight.is(val) || Weight.isPct(val) ? `${val.value}${val.unit}` : `${val}`;
  }

  private groupVariationSets(sets: IProgramSet[]): [IProgramSet, number][] {
    if (sets.length === 0) {
      return [[{ repsExpr: "1", weightExpr: "0lb" }, 0]];
    }
    let lastKey: string | undefined;
    const groups: [IProgramSet, number][] = [];
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

  private getExerciseKey(programExercise: IProgramExercise): string {
    const originalExercise = Exercise.get(programExercise.exerciseType, this.settings.exercises);
    const isDefaultEquipment = programExercise.exerciseType.equipment === originalExercise.defaultEquipment;
    return `${programExercise.name}${
      !isDefaultEquipment ? `, ${equipmentName(programExercise.exerciseType.equipment, this.settings.equipment)}` : ""
    }`;
  }

  private groupWarmupsSets(sets: IProgramExerciseWarmupSet[]): [IProgramExerciseWarmupSet, number][] {
    let lastKey: string | undefined;
    const groups: [IProgramExerciseWarmupSet, number][] = [];
    for (const set of sets) {
      const key = this.warmupSetToKey(set);
      if (lastKey == null || lastKey !== key) {
        groups.push([set, 0]);
      }
      groups[groups.length - 1][1] += 1;
      lastKey = key;
    }
    return groups;
  }

  private getWarmupSets(programExercise: IProgramExercise): string | undefined {
    const warmupSets = programExercise.warmupSets;
    if (warmupSets) {
      const groups = this.groupWarmupsSets(warmupSets);
      const strs: string[] = [];
      for (const group of groups) {
        const first = group[0];
        const length = group[1];
        strs.push(
          `${length}x${first.reps} ${
            typeof first.value === "number"
              ? `${MathUtils.roundFloat(first.value * 100, 0)}%`
              : Weight.print(first.value)
          }`
        );
      }
      return strs.length === 0 ? "none" : strs.join(", ");
    }
    return undefined;
  }

  private getProgress(state: IProgramState, finishDayExpr?: string): string | undefined {
    const progressLine = (finishDayExpr || "").split("\n")?.find((l) => l.indexOf("// progress:") !== -1);
    if (progressLine != null) {
      const progressMatch = progressLine.match(/progress: ([^(]+)\((.*)\)$/);
      if (progressMatch) {
        const name = progressMatch[1];
        const args = progressMatch[2].split(",").map((a) => a.trim());
        if (name === "lp") {
          const [increment, totalSuccess, , decrement, totalFailure] = args;
          return `lp(${increment}, ${totalSuccess}, ${state.successes}, ${decrement}, ${totalFailure}, ${state.failures})`;
        } else if (name === "dp" || name === "sum") {
          return `${name}(${args.join(", ")})`;
        }
      }
    }
    return undefined;
  }

  private getSkipProgress(finishDayExpr?: string): [number, number][] {
    const skipLine = (finishDayExpr || "").split("\n")?.find((l) => l.indexOf("// skip: ") !== -1);
    if (skipLine != null) {
      const skipMatch = skipLine.match(/skip: (.*)$/);
      if (skipMatch) {
        const arr: [number, number][] = JSON.parse(skipMatch[1]);
        return arr;
      }
    }
    return [];
  }

  private weightExprToStr(weightExpr?: string): string {
    if (weightExpr != null) {
      const percentageMatch = weightExpr.match(/(.*)%/);
      if (percentageMatch != null) {
        const percentage = MathUtils.roundFloat(parseFloat(percentageMatch[1]), 2);
        return `${percentage}%`;
      } else {
        return weightExpr;
      }
    }
    return "";
  }

  private setsToString(sets: IProgramSet[], globals: IPlannerToProgram2Globals, addQuickAddSet?: boolean): string {
    const groupedVariationSets = this.groupVariationSets(sets);
    const result: string[] = [];
    for (const group of groupedVariationSets) {
      const set = group[0];
      let setStr = "";
      setStr += `${group[1]}${addQuickAddSet ? "+" : ""}x`;
      setStr += set.minRepsExpr ? `${set.minRepsExpr}-` : "";
      setStr += `${set.repsExpr}`;
      setStr += set.isAmrap ? "+" : "";
      if (globals.weight == null) {
        const weightValue = this.weightExprToStr(set.weightExpr);
        setStr += weightValue ? ` ${weightValue}${set.askWeight ? "+" : ""}` : "";
      }
      if (globals.rpe == null) {
        setStr += set.rpeExpr ? ` @${set.rpeExpr}` : "";
        setStr += set.rpeExpr && set.logRpe ? "+" : "";
      }
      if (globals.timer == null) {
        setStr += set.timerExpr ? ` ${set.timerExpr}s` : "";
      }
      if (set.label) {
        setStr += ` (${set.label})`;
      }
      result.push(setStr);
    }
    return result.map((r) => r.trim()).join(", ");
  }

  private warmupSetToKey(set: IProgramExerciseWarmupSet): string {
    return `${set.reps}-${Weight.print(set.threshold)}-${Weight.printOrNumber(set.value)}`;
  }

  private setToKey(set: IProgramSet): string {
    return `${set.repsExpr}-${set.minRepsExpr}-${set.weightExpr}-${set.isAmrap}-${set.rpeExpr}-${set.logRpe}-${set.timerExpr}-${set.label}`;
  }
}
