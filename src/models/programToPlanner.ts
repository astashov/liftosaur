import { PlannerProgram, IDereuseDecision } from "../pages/planner/models/plannerProgram";
import {
  IPercentage,
  IPlannerProgram,
  IPlannerProgramDay,
  IPlannerProgramWeek,
  IProgram,
  IProgramExercise,
  IProgramExerciseVariation,
  IProgramSet,
  IProgramState,
  ISettings,
  IWeight,
} from "../types";
import { MathUtils } from "../utils/math";
import { ObjectUtils } from "../utils/object";
import { Exercise, equipmentName, IExercise } from "./exercise";
import { Weight } from "./weight";
import { IProgramExerciseWarmupSet } from "../types";
import { ILiftoscriptVariableValue } from "../liftoscriptEvaluator";
import { IPlannerEvalResult, IPlannerTopLineItem } from "../pages/planner/plannerExerciseEvaluator";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerKey } from "../pages/planner/plannerKey";
import { PP } from "./pp";
import { IByExerciseWeekDay } from "../pages/planner/plannerEvaluator";

interface ISimpleSet {
  reps: number;
  minReps?: number;
  rpe?: number;
  weight?: string;
  timer?: number;
}

interface ISimpleGlobals {
  rpe?: number;
  weight?: string;
  timer?: number;
}

interface IPlannerToProgram2Globals {
  weight?: string;
  rpe?: string;
  timer?: string;
  logRpe?: boolean;
  askWeight?: boolean;
}

export class ProgramToPlanner {
  private _evaluatedWeeks?: IPlannerEvalResult[][];
  private _reverseReuseGraph:
    | Record<
        string,
        {
          exercise: IPlannerProgramExercise;
          reusingWeekIndex: number;
          reusingDayInWeekIndex: number;
          dayIndex: number;
        }[]
      >
    | undefined;

  constructor(
    private readonly program: IProgram,
    private readonly plannerProgram: IPlannerProgram,
    private readonly settings: ISettings,
    private readonly setVariationIndexMap: Partial<Record<string, ILiftoscriptVariableValue<number>[]>>,
    private readonly descriptionIndexMap: Partial<Record<string, ILiftoscriptVariableValue<number>[]>>
  ) {}

  private reverseReuseGraph(): Record<
    string,
    { exercise: IPlannerProgramExercise; reusingWeekIndex: number; reusingDayInWeekIndex: number; dayIndex: number }[]
  > {
    if (this._reverseReuseGraph != null) {
      return this._reverseReuseGraph;
    }
    const evaluatedWeeks = this.getEvaluatedWeeks();
    const reverseReuseGraph: Record<
      string,
      { exercise: IPlannerProgramExercise; reusingWeekIndex: number; reusingDayInWeekIndex: number; dayIndex: number }[]
    > = {};
    this._reverseReuseGraph = {};
    PP.iterate(evaluatedWeeks, (exercise, weekIndex, dayInWeekIndex, dayIndex) => {
      if (exercise.reuse) {
        const { exercise: reuseExercise, exerciseDay, exerciseWeek, exerciseDayInWeek } = exercise.reuse;
        if (reuseExercise != null && exerciseDay != null && exerciseWeek != null && exerciseDayInWeek != null) {
          const key = PlannerKey.fromPlannerExercise(reuseExercise, this.settings);
          reverseReuseGraph[key] = reverseReuseGraph[key] || [];
          reverseReuseGraph[key].push({
            exercise,
            dayIndex: exerciseDay - 1,
            reusingWeekIndex: weekIndex,
            reusingDayInWeekIndex: dayInWeekIndex,
          });
        }
      }
    });
    this._reverseReuseGraph = reverseReuseGraph;
    return reverseReuseGraph;
  }

  public static variationsMap(
    plannerProgram: IPlannerProgram,
    settings: ISettings
  ): Record<string, Record<number, [number, number]>> {
    const { evaluatedWeeks } = PlannerProgram.evaluate(plannerProgram, settings);

    const variationsMap: Record<string, Record<number, [number, number]>> = {};
    const variationsRunningIndex: Record<string, number> = {};

    let variationsDayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          for (const exercise of day.data) {
            const key = PlannerKey.fromPlannerExercise(exercise, settings);
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
      const exercise = exercises.data.find((e) => PlannerKey.fromPlannerExercise(e, this.settings) === key);
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
      const exercise = exercises.data.find((e) => PlannerKey.fromPlannerExercise(e, this.settings) === key);
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

  private getDereuseDecisions(): IByExerciseWeekDay<Set<IDereuseDecision>> {
    const usedProgramExercises = this.program.exercises.filter((e) =>
      this.program.days.some(
        (d) =>
          d.exercises.some((ex) => ex.id === e.id) &&
          this.program.weeks.some((w) => w.days.some((day) => day.id === d.id))
      )
    );
    const variationsMap = ProgramToPlanner.variationsMap(this.plannerProgram, this.settings);
    const keyToProgramExercise = usedProgramExercises.reduce<Record<string, IProgramExercise>>((acc, e) => {
      acc[PlannerKey.fromProgramExercise(e, this.settings)] = e;
      return acc;
    }, {});

    const reverseReuseGraph = this.reverseReuseGraph();

    const dereuseDecisions: IByExerciseWeekDay<Set<IDereuseDecision>> = {};
    PP.iterate(this.getEvaluatedWeeks(), (exercise, weekIndex, dayInWeekIndex, dayIndex) => {
      const programExercise = keyToProgramExercise[exercise.key];
      if (programExercise != null) {
        function addDecisions(key: string, w: number, d: number, decisions: Set<IDereuseDecision>): void {
          for (const decision of decisions) {
            dereuseDecisions[key] = dereuseDecisions[key] || {};
            dereuseDecisions[key][w] = dereuseDecisions[key][w] || {};
            dereuseDecisions[key][w][d] = dereuseDecisions[key][w][d] || new Set();
            dereuseDecisions[key][w][d].add(decision);
          }
        }

        if (exercise.reuse) {
          const { exercise: reuseExercise, exerciseDay } = exercise.reuse;
          if (reuseExercise != null && exerciseDay != null) {
            const [from, to] = variationsMap[exercise.key][dayIndex];
            const variations = programExercise.variations.slice(from, to);
            const sets = variations[0].sets;
            addDecisions(exercise.key, weekIndex, dayInWeekIndex, this.dereuseDecisionsForReusing(sets, reuseExercise));
          }
        } else if (reverseReuseGraph[exercise.key] && reverseReuseGraph[exercise.key].length > 0) {
          for (const ex of reverseReuseGraph[exercise.key]) {
            const [from, to] = variationsMap[exercise.key][ex.dayIndex];
            const variations = programExercise.variations.slice(from, to);
            const sets = variations[0].sets;
            addDecisions(
              ex.exercise.key,
              ex.reusingWeekIndex,
              ex.reusingDayInWeekIndex,
              this.dereuseDecisionsForOriginal(sets, ex.exercise)
            );
          }
        }
      }
    });
    return dereuseDecisions;
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
    const allDereuseDecisions = this.getDereuseDecisions();

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
                (e) => PlannerKey.fromProgramExercise(e, this.settings) === line.value
              )!;
              const evalDay = this.getEvaluatedWeeks()[weekIndex][dayInWeekIndex];
              const evalExercise = evalDay.success ? evalDay.data.find((e) => e.key === line.value) : undefined;
              const programExercise = this.program.exercises.find((e) => e.id === dayExercise.id)!;
              const notused = this.program.days.every((d) => d.exercises.every((e) => e.id !== programExercise.id));
              const key = PlannerKey.fromProgramExercise(programExercise, this.settings);
              const exercise = Exercise.findById(programExercise.exerciseType.id, this.settings.exercises)!;
              let plannerExercise = "";
              plannerExercise += this.getExerciseName(programExercise, exercise, line);
              plannerExercise += " / ";
              if (notused) {
                plannerExercise += "used: none / ";
              }
              const [from, to] = variationsMap[key][dayIndex];
              const currentSetVariationIndex = this.getCurrentSetVariationIndex(key, weekIndex, dayInWeekIndex);
              const variations = programExercise.variations.slice(from, to);
              const globals = this.getGlobals(variations);

              const reuse = evalExercise?.reuse;
              if (reuse) {
                const dereuseDecisions = allDereuseDecisions[key]?.[weekIndex]?.[dayInWeekIndex] || new Set();
                let reusedKey = reuse.fullName;
                if (reuse.week != null || reuse.day != null) {
                  reusedKey += reuse.week == null ? `[${reuse.day}]` : `[${reuse.week}:${reuse.day ?? "_"}]`;
                }
                plannerExercise += `...${reusedKey}`;
                if (dereuseDecisions.has("all")) {
                  plannerExercise +=
                    " / " +
                    variations
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
                }
                if (dereuseDecisions.has("weight") && globals.weight != null) {
                  plannerExercise += ` / ${this.weightExprToStr(globals.weight)}${globals.askWeight ? "+" : ""}`;
                }
                if (dereuseDecisions.has("rpe") && globals.rpe != null) {
                  plannerExercise += ` / @${globals.rpe}${globals.logRpe ? "+" : ""}`;
                }
                if (dereuseDecisions.has("timer") && globals.timer != null) {
                  plannerExercise += ` / ${globals.timer}s`;
                }
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

              if (!addedWarmupsMap[key] && programExercise.warmupSets && evalExercise?.warmupSets) {
                const warmupSets = this.getWarmupSets(programExercise);
                if (warmupSets != null) {
                  plannerExercise += ` / warmup: ${warmupSets}`;
                }
              }

              if (!addedUpdateMap[key] && (programExercise.updateDayExpr || programExercise.reuseUpdateDayScript)) {
                plannerExercise += this.getUpdate(programExercise);
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
                plannerExercise += this.getProgress(programExercise);
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

  private getUpdate(programExercise: IProgramExercise): string {
    let plannerExercise = ` / update: custom()`;
    if (programExercise.reuseUpdateDayScript) {
      const originalProgramExercise = this.program.exercises.find((e) => e.id === programExercise.reuseUpdateDayScript);
      if (originalProgramExercise != null) {
        const originalKey = this.getExerciseKey(originalProgramExercise);
        plannerExercise += ` { ...${originalKey} }`;
      }
    } else if (programExercise.updateDayExpr) {
      plannerExercise += " " + programExercise.updateDayExpr;
    }
    return plannerExercise;
  }

  private getProgress(programExercise: IProgramExercise): string {
    let plannerExercise = "";
    const progress = this.getBuiltinProgress(programExercise.state, programExercise.finishDayExpr);
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
        const finishDayExpr = programExercise.finishDayExpr.replace(/^[\s\S]*{~/, "{~").replace(/~}[\s\S]*$/, "~}");
        plannerExercise += " " + finishDayExpr;
      }
    }
    return plannerExercise;
  }

  private getExerciseName(programExercise: IProgramExercise, exercise: IExercise, line: IPlannerTopLineItem): string {
    let plannerExercise = `${programExercise.name}`;
    if (programExercise.exerciseType.equipment !== exercise.defaultEquipment) {
      plannerExercise += `, ${equipmentName(programExercise.exerciseType.equipment, this.settings.equipment)}`;
    }
    if (line.order != null && line.order !== 0) {
      plannerExercise += `[${line.order}]`;
    }
    return plannerExercise;
  }

  private getGlobals(variations: IProgramExerciseVariation[]): IPlannerToProgram2Globals {
    const firstWeight = variations[0]?.sets[0]?.weightExpr;
    const firstRpe = variations[0]?.sets[0]?.rpeExpr;
    const firstLogRpe = !!variations[0]?.sets[0]?.logRpe;
    const firstAskWeight = !!variations[0]?.sets[0]?.askWeight;
    const firstTimer = variations[0]?.sets[0]?.timerExpr;
    return {
      weight:
        firstWeight != null &&
        variations.every((v) => v.sets.every((s) => s.weightExpr === firstWeight && !!s.askWeight === firstAskWeight))
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

  private getBuiltinProgress(state: IProgramState, finishDayExpr?: string): string | undefined {
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

  private dereuseDecisionsForReusing(
    updatedSets: IProgramSet[],
    reusedExercise: IPlannerProgramExercise
  ): Set<IDereuseDecision> {
    const { sets: normalizedUpdatedSets, globals: updatedGlobals } = this.normalizedProgramSets(updatedSets);
    const { sets: normalizedReusedSets, globals: reusedGlobals } = this.normalizedSets(reusedExercise);
    const decisions: Set<IDereuseDecision> = new Set();
    if (updatedGlobals.weight !== reusedGlobals.weight) {
      decisions.add("weight");
    }
    if (updatedGlobals.rpe !== reusedGlobals.rpe) {
      decisions.add("rpe");
    }
    if (updatedGlobals.timer !== reusedGlobals.timer) {
      decisions.add("timer");
    }
    for (const set of normalizedReusedSets) {
      for (const field of ["weight", "rpe", "timer"] as const) {
        if (decisions.has(field)) {
          delete set[field];
        }
      }
    }
    for (const set of normalizedUpdatedSets) {
      for (const field of ["weight", "rpe", "timer"] as const) {
        if (decisions.has(field)) {
          delete set[field];
        }
      }
    }
    if (!ObjectUtils.isEqual(normalizedUpdatedSets, normalizedReusedSets)) {
      decisions.add("all");
    }

    return decisions;
  }

  private dereuseDecisionsForOriginal(
    updatedSets: IProgramSet[],
    reusingExercise: IPlannerProgramExercise
  ): Set<IDereuseDecision> {
    const { sets: normalizedUpdatedSets, globals: updatedGlobals } = this.normalizedProgramSets(updatedSets);
    const { sets: normalizedReusingSets, globals: reusingGlobals } = this.normalizedSets(reusingExercise);
    const decisions: Set<IDereuseDecision> = new Set();
    if (updatedGlobals.timer !== reusingGlobals.timer) {
      decisions.add("timer");
    }
    if (updatedGlobals.rpe !== reusingGlobals.rpe) {
      decisions.add("rpe");
    }
    if (updatedGlobals.weight !== reusingGlobals.weight) {
      decisions.add("weight");
    }
    for (const set of normalizedReusingSets) {
      for (const field of ["weight", "rpe", "timer"] as const) {
        if (decisions.has(field)) {
          delete set[field];
        }
      }
    }
    for (const set of normalizedUpdatedSets) {
      for (const field of ["weight", "rpe", "timer"] as const) {
        if (decisions.has(field)) {
          delete set[field];
        }
      }
    }
    if (!ObjectUtils.isEqual(normalizedUpdatedSets, normalizedReusingSets)) {
      decisions.add("all");
    }
    return decisions;
  }

  private normalizedProgramSets(
    sets: IProgramSet[]
  ): {
    sets: ISimpleSet[];
    globals: ISimpleGlobals;
  } {
    const firstWeight = sets[0]?.weightExpr;
    const firstRpe = sets[0]?.rpeExpr;
    const firstTimer = sets[0]?.timerExpr;
    const globals = {
      weight: firstWeight != null && sets.every((s) => s.weightExpr === firstWeight) ? firstWeight : undefined,
      rpe: firstRpe != null && sets.every((s) => s.rpeExpr === firstRpe) ? Number(firstRpe) : undefined,
      timer: firstTimer != null && sets.every((s) => s.timerExpr === firstTimer) ? Number(firstTimer) : undefined,
    };

    const normalizedSets = sets.map((s) => {
      return {
        reps: Number(s.repsExpr),
        minReps: s.minRepsExpr ? Number(s.minRepsExpr) : undefined,
        weight: s.weightExpr && s.weightExpr === globals.weight ? undefined : s.weightExpr,
        rpe: s.rpeExpr ? (Number(s.rpeExpr) === globals.rpe ? undefined : Number(s.rpeExpr)) : undefined,
        timer: s.timerExpr ? (Number(s.timerExpr) === globals.timer ? undefined : Number(s.timerExpr)) : undefined,
      };
    });
    return { sets: normalizedSets, globals };
  }

  private normalizedSets(
    exercise: IPlannerProgramExercise
  ): {
    sets: ISimpleSet[];
    globals: ISimpleGlobals;
  } {
    function toStr(weight: IWeight | number | undefined): string | undefined {
      if (weight == null) {
        return undefined;
      }
      return typeof weight === "number" ? `${weight}%` : Weight.print(weight);
    }

    const sets = PlannerProgramExercise.sets(exercise);
    const firstWeight = sets[0]?.weight;
    const firstRpe = sets[0]?.rpe;
    const firstTimer = sets[0]?.timer;
    const firstPercentage = sets[0]?.percentage;
    const globalWeight =
      firstWeight != null
        ? sets.every((set) =>
            Weight.eq(set.weight || { value: 0, unit: "lb" }, firstWeight || { value: 0, unit: "lb" })
          )
          ? firstWeight
          : undefined
        : sets.every((set) => set.percentage === firstPercentage)
        ? firstPercentage
        : undefined;
    const globalRpe = sets.every((set) => set.rpe === firstRpe) ? firstRpe : undefined;
    const globalTimer = sets.every((set) => set.timer === firstTimer) ? firstTimer : undefined;
    const denormalizedSets = [];
    for (const set of sets) {
      if (set.repRange) {
        for (let i = 0; i < set.repRange.numberOfSets; i++) {
          denormalizedSets.push({
            reps: set.repRange.maxrep,
            minReps: set.repRange.maxrep === set.repRange.minrep ? undefined : set.repRange.minrep,
            rpe: globalRpe ? undefined : set.rpe,
            weight: toStr(globalWeight ? undefined : set.weight ?? set.percentage),
            timer: globalTimer ? undefined : set.timer,
          });
        }
      }
    }
    return { sets: denormalizedSets, globals: { rpe: globalRpe, weight: toStr(globalWeight), timer: globalTimer } };
  }
}
