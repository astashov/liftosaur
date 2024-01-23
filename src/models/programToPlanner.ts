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
import { ProgramExercise } from "./programExercise";

interface IPlannerToProgram2Globals {
  weight?: string;
  rpe?: string;
  timer?: string;
}

export class ProgramToPlanner {
  private _evaluatedWeeks?: IPlannerEvalResult[][];

  constructor(
    private readonly program: IProgram,
    private readonly plannerProgram: IPlannerProgram,
    private readonly settings: ISettings,
    private readonly setVariationIndexMap: Partial<Record<string, ILiftoscriptVariableValue<number>[]>>
  ) {}

  public static exerciseKeyForProgramExercise(programExercise: IProgramExercise, settings: ISettings): string {
    return PlannerProgram.nameToKey(
      `${programExercise.name},${equipmentName(programExercise.exerciseType.equipment, settings.equipment)}`,
      settings
    );
  }

  public static variationsMap(
    plannerProgram: IPlannerProgram,
    settings: ISettings
  ): Record<string, Record<number, [number, number]>> {
    const evaluatedWeeks = PlannerProgram.evaluate(plannerProgram, settings, { skipDescriptionPostProcess: true });

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
            const numberOfVariations = exercise.setVariations.length;
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
      this._evaluatedWeeks = PlannerProgram.evaluate(this.plannerProgram, this.settings);
    }
    return this._evaluatedWeeks;
  }

  public descriptionsMap(): Partial<Record<string, Record<number, string>>> {
    const evaluatedWeeks = this.getEvaluatedWeeks();

    const descriptionsMap: Record<string, Record<number, string>> = {};
    const descriptionsRunningIndex: Record<string, number> = {};

    let descriptionsDayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          for (const exercise of day.data) {
            const key = PlannerToProgram2.plannerExerciseKey(exercise, this.settings);
            if (exercise.description) {
              descriptionsRunningIndex[key] = descriptionsRunningIndex[key] || 0;
              descriptionsMap[key] = descriptionsMap[key] || {};
              descriptionsMap[key][descriptionsDayIndex] = exercise.description;
            }
          }
        }
        descriptionsDayIndex += 1;
      }
    }
    return descriptionsMap;
  }

  private getCurrentSetVariationIndex(key: string, weekIndex: number, dayInWeekIndex: number): number {
    const evaluatedWeeks = this.getEvaluatedWeeks();
    const exercises = evaluatedWeeks[weekIndex][dayInWeekIndex];
    if (exercises.success) {
      const exercise = exercises.data.find((e) => PlannerToProgram2.plannerExerciseKey(e, this.settings) === key);
      if (exercise != null) {
        const numberOfVariations = exercise.setVariations.length;
        let isCurrentIndex = exercise.setVariations.findIndex((v) => v.isCurrent);
        isCurrentIndex = isCurrentIndex === -1 ? 0 : isCurrentIndex;
        const setVariationIndexAdd = this.setVariationIndexMap[key]?.[dayInWeekIndex];
        if (setVariationIndexAdd != null) {
          const [targetWeek, targetDay] = ProgramExercise.normalizeTarget(setVariationIndexAdd.target, 2);
          if ((targetWeek === "*" || targetWeek === weekIndex) && (targetDay === "*" || targetDay === dayInWeekIndex)) {
            if (setVariationIndexAdd.op === "=") {
              isCurrentIndex = setVariationIndexAdd.value - 1;
            } else if (setVariationIndexAdd.op === "+=") {
              isCurrentIndex += setVariationIndexAdd.value;
            } else if (setVariationIndexAdd.op === "-=") {
              isCurrentIndex -= setVariationIndexAdd.value;
            } else if (setVariationIndexAdd.op === "*=") {
              isCurrentIndex *= setVariationIndexAdd.value;
            } else if (setVariationIndexAdd.op === "/=") {
              isCurrentIndex /= setVariationIndexAdd.value;
            }
          }
        }
        isCurrentIndex = isCurrentIndex % numberOfVariations;
        return isCurrentIndex;
      }
    }
    return 0;
  }

  public convertToPlanner(): IPlannerProgram {
    const plannerWeeks: IPlannerProgramWeek[] = [];
    const variationsMap = ProgramToPlanner.variationsMap(this.plannerProgram, this.settings);
    const descriptionsMap = this.descriptionsMap();
    let dayIndex = 0;
    const addedProgressMap: Record<string, boolean> = {};
    const addedWarmupsMap: Record<string, boolean> = {};
    const addedQuickAddSet: Record<string, boolean> = {};
    for (let weekIndex = 0; weekIndex < this.program.weeks.length; weekIndex += 1) {
      const week = this.program.weeks[weekIndex];
      const plannerWeek: IPlannerProgramWeek = { name: week.name, days: [] };
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.days.length; dayInWeekIndex += 1) {
        const weekDay = week.days[dayInWeekIndex];
        const programDay = this.program.days.find((d) => d.id === weekDay.id)!;
        const plannerDay: IPlannerProgramDay = { name: programDay.name, exerciseText: "" };
        const exerciseTextArr: string[] = [];
        for (const dayExercise of programDay.exercises) {
          const programExercise = this.program.exercises.find((e) => e.id === dayExercise.id)!;
          const key = ProgramToPlanner.exerciseKeyForProgramExercise(programExercise, this.settings);
          const exercise = Exercise.findById(programExercise.exerciseType.id, this.settings.exercises)!;
          let plannerExercise = "";
          const description = descriptionsMap[key]?.[dayIndex];
          if (description) {
            plannerExercise +=
              description
                .split("\n")
                .map((l) => `// ${l}`)
                .join("\n") + "\n";
          }
          plannerExercise += `${programExercise.name}`;
          if (programExercise.exerciseType.equipment !== exercise.defaultEquipment) {
            plannerExercise += `, ${equipmentName(programExercise.exerciseType.equipment)}`;
          }
          plannerExercise += " / ";
          const [from, to] = variationsMap[key][dayIndex];
          const currentSetVariationIndex = this.getCurrentSetVariationIndex(key, weekIndex, dayInWeekIndex);
          const variations = programExercise.variations.slice(from, to);

          const firstWeight = variations[0]?.sets[0]?.weightExpr;
          const firstRpe = variations[0]?.sets[0]?.rpeExpr;
          const firstLogRpe = !!variations[0]?.sets[0]?.logRpe;
          const firstTimer = variations[0]?.sets[0]?.timerExpr;
          const globals: IPlannerToProgram2Globals = {
            weight:
              firstWeight != null && variations.every((v) => v.sets.every((s) => s.weightExpr === firstWeight))
                ? firstWeight
                : undefined,
            rpe:
              firstRpe != null &&
              variations.every((v) => v.sets.every((s) => s.rpeExpr === firstRpe && !!s.logRpe === firstLogRpe))
                ? firstRpe
                : undefined,
            timer:
              firstTimer != null && variations.every((v) => v.sets.every((s) => s.timerExpr === firstTimer))
                ? firstTimer
                : undefined,
          };

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
            plannerExercise += ` / ${this.weightExprToStr(globals.weight)}`;
          }
          if (globals.rpe != null) {
            plannerExercise += ` / @${globals.rpe}`;
          }
          if (globals.timer != null) {
            plannerExercise += ` / ${globals.timer}s`;
          }

          if (!addedWarmupsMap[key] && programExercise.warmupSets) {
            const warmupSets = this.getWarmupSets(programExercise);
            if (warmupSets != null) {
              plannerExercise += ` / warmup: ${warmupSets}`;
            }
          }

          if (
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
                  const originalExercise = Exercise.get(originalProgramExercise.exerciseType, this.settings.exercises);
                  const isDefaultEquipment =
                    originalProgramExercise.exerciseType.equipment === originalExercise.defaultEquipment;
                  const originalKey = `${originalProgramExercise.name}${
                    !isDefaultEquipment
                      ? `, ${equipmentName(originalProgramExercise.exerciseType.equipment, this.settings.equipment)}`
                      : ""
                  }`;
                  plannerExercise += ` { ...${originalKey} }`;
                }
              } else if (programExercise.finishDayExpr) {
                plannerExercise += " " + programExercise.finishDayExpr;
              }
            }
            addedProgressMap[key] = true;
          }
          exerciseTextArr.push(plannerExercise);
        }
        plannerDay.exerciseText = exerciseTextArr.join("\n");
        plannerWeek.days.push(plannerDay);
        dayIndex += 1;
      }
      plannerWeeks.push(plannerWeek);
    }
    const result = { name: this.program.name, weeks: plannerWeeks };
    return result;
  }

  private printVal(val: number | IWeight | IPercentage): string {
    return Weight.is(val) || Weight.isPct(val) ? `${val.value}${val.unit}` : `${val}`;
  }

  private groupVariationSets(sets: IProgramSet[]): [IProgramSet, number][] {
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
        setStr += weightValue ? ` ${weightValue}` : "";
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
