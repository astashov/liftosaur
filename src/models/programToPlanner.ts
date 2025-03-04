import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { IPercentage, IPlannerProgram, IPlannerProgramDay, IPlannerProgramWeek, ISettings, IWeight } from "../types";
import { n } from "../utils/math";
import { ObjectUtils } from "../utils/object";
import { Weight } from "./weight";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
  IPlannerProgramExerciseEvaluatedSetVariation,
  IPlannerProgramExerciseWarmupSet,
  IPlannerProgramProperty,
} from "../pages/planner/models/types";
import { IEvaluatedProgram, Program } from "./program";
import { Exercise } from "./exercise";
import { CollectionUtils } from "../utils/collection";
import { PP } from "./pp";
import { PlannerKey } from "../pages/planner/plannerKey";

interface IPlannerToProgram2Globals {
  weight?: IWeight | IPercentage;
  rpe?: number;
  timer?: number;
  logRpe?: boolean;
  askWeight?: boolean;
}

type IDereuseDecision = "sets" | "weight" | "rpe" | "timer";

export class ProgramToPlanner {
  constructor(private readonly program: IEvaluatedProgram, private readonly settings: ISettings) {}

  private getCurrentDescriptionIndex(key: string, weekIndex: number, dayInWeekIndex: number): number {
    const exercise = this.program.weeks[weekIndex]?.days[dayInWeekIndex]?.exercises?.find((e) => e.key === key);
    const descriptions = exercise?.descriptions || [];
    const index = descriptions.findIndex((s) => s.isCurrent);
    return index === -1 ? 0 : index;
  }

  private shouldReuseSets(programExercise: IPlannerProgramExercise): boolean {
    const reuseExercise = Program.getReuseExercise(this.program, programExercise);
    if (!reuseExercise) {
      return false;
    }
    const globals = this.getGlobals(programExercise.evaluatedSetVariations);
    const dereuseDecisions = new Set(this.getDereuseDecisions(programExercise));
    if (globals.weight == null) {
      dereuseDecisions.delete("weight");
    }
    if (globals.rpe == null) {
      dereuseDecisions.delete("rpe");
    }
    if (globals.timer == null) {
      dereuseDecisions.delete("timer");
    }
    return new Set(["sets", "weight", "rpe", "timer"]).difference(dereuseDecisions).size !== 0;
  }

  private getDereuseDecisions(programExercise: IPlannerProgramExercise): IDereuseDecision[] {
    const dereuseDecisions: Set<IDereuseDecision> = new Set();
    const reuseExercise = Program.getReuseExercise(this.program, programExercise);
    if (!reuseExercise) {
      return Array.from(dereuseDecisions);
    }
    if (programExercise.evaluatedSetVariations.length !== reuseExercise.evaluatedSetVariations.length) {
      dereuseDecisions.add("sets");
    }
    for (let i = 0; i < programExercise.evaluatedSetVariations.length; i += 1) {
      const programVariation = programExercise.evaluatedSetVariations[i];
      const reuseVariation = reuseExercise.evaluatedSetVariations[i];
      if (programVariation.sets.length !== reuseVariation.sets.length) {
        dereuseDecisions.add("sets");
        dereuseDecisions.add("weight");
        dereuseDecisions.add("rpe");
        dereuseDecisions.add("timer");
        break;
      }
      for (let j = 0; j < programVariation.sets.length; j += 1) {
        const programSet = programVariation.sets[j];
        const reuseSet = reuseVariation.sets[j];
        if (programSet.maxrep !== reuseSet.maxrep || programSet.minrep !== reuseSet.minrep) {
          dereuseDecisions.add("sets");
        }
        if (!(Weight.eq(programSet.weight, reuseSet.weight) || programSet.askWeight !== reuseSet.askWeight)) {
          dereuseDecisions.add("weight");
        }
        if (!(programSet.rpe !== reuseSet.rpe || programSet.logRpe !== reuseSet.logRpe)) {
          dereuseDecisions.add("rpe");
        }
        if (programSet.timer !== reuseSet.timer) {
          dereuseDecisions.add("timer");
        }
      }
    }
    return Array.from(dereuseDecisions);
  }

  public convertToPlanner(renameMapping: Record<string, string> = {}): IPlannerProgram {
    const plannerWeeks: IPlannerProgramWeek[] = [];
    const plannerProgram = this.program.planner;
    const topLineMap = PlannerProgram.topLineItems(plannerProgram, this.settings);
    let dayIndex = 0;
    const addedProgressMap: Record<string, boolean> = {};
    const addedUpdateMap: Record<string, boolean> = {};
    const addedWarmupsMap: Record<string, boolean> = {};
    const addedIdMap: Record<string, boolean> = {};

    for (let weekIndex = 0; weekIndex < this.program.weeks.length; weekIndex += 1) {
      const week = this.program.weeks[weekIndex];
      const plannerWeek: IPlannerProgramWeek = { name: week.name, days: [], description: week.description };
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.days.length; dayInWeekIndex += 1) {
        const topLines = topLineMap[weekIndex][dayInWeekIndex];
        const programDay = week.days[dayInWeekIndex];
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
              const value = renameMapping[line.value] || line.value;
              const evalExercise = Program.getProgramExercise(dayIndex + 1, this.program, value)!;
              const key = evalExercise.key;
              let plannerExercise = "";
              plannerExercise += this.getExerciseName(evalExercise);
              plannerExercise += " / ";
              if (evalExercise.notused) {
                plannerExercise += "used: none / ";
              }
              const variations = evalExercise.evaluatedSetVariations;
              const globals = this.getGlobals(variations);

              const shouldReuseSets = this.shouldReuseSets(evalExercise);
              const dereuseDecisions = shouldReuseSets ? this.getDereuseDecisions(evalExercise) : [];
              if (shouldReuseSets) {
                plannerExercise += this.reuseToStr(evalExercise);

                if (dereuseDecisions.includes("sets")) {
                  plannerExercise +=
                    ` / ` + variations.map((v, i) => this.variationToString(v, globals, i)).join(" / ");
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
                plannerExercise += variations.map((v, i) => this.variationToString(v, globals, i)).join(" / ");

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
                }
              }

              if (!addedIdMap[key] && (evalExercise.tags || []).length > 0) {
                plannerExercise += this.getId(evalExercise);
                addedIdMap[key] = true;
              }

              const update = PlannerProgramExercise.getUpdate(evalExercise);
              if (!addedUpdateMap[key] && update) {
                plannerExercise += this.getUpdate(update);
                addedUpdateMap[key] = true;
              }

              const progress = PlannerProgramExercise.getProgress(evalExercise);
              if (progress && progress.fnName === "none") {
                plannerExercise += ` / progress: none`;
              } else if (!addedProgressMap[key] && progress) {
                plannerExercise += this.getProgress(evalExercise, progress);
                addedProgressMap[key] = true;
              }
              exerciseTextArr.push(plannerExercise);
              break;
            }
          }
        }
        plannerDay.exerciseText = exerciseTextArr.join("\n");
        plannerDay.description = programDay.description;
        plannerWeek.days.push(plannerDay);
        dayIndex += 1;
      }
      plannerWeeks.push(plannerWeek);
    }
    const result: IPlannerProgram = { name: this.program.name, weeks: plannerWeeks };
    const repeatingExercises = new Set<string>();
    PP.iterate2(this.program.weeks, (exercise) => {
      if (exercise.repeat != null && exercise.repeat.length > 0) {
        const key = PlannerKey.fromExerciseType(exercise.exerciseType, this.settings, exercise.label);
        repeatingExercises.add(key);
      }
    });
    const newPlanner = PlannerProgram.compact(this.program.planner, result, this.settings, repeatingExercises);
    console.log(PlannerProgram.generateFullText(newPlanner.weeks));
    return newPlanner;
  }

  private getExerciseName(programExercise: IPlannerProgramExercise): string {
    const exercise = Exercise.get(programExercise.exerciseType, this.settings.exercises);
    let name = Exercise.fullName(exercise, this.settings, programExercise.label);
    if (programExercise.order > 0) {
      name = `${name}[${programExercise.order}]`;
    }
    return name;
  }

  private reuseToStr(programExercise: IPlannerProgramExercise): string {
    const reuseExercise = Program.getReuseExercise(this.program, programExercise);
    if (!reuseExercise) {
      throw new Error("reuse.exercise is required");
    }
    const reuse = programExercise.reuse;
    if (!reuse) {
      throw new Error("reuse is required");
    }
    const exercise = Exercise.get(reuseExercise.exerciseType, this.settings.exercises);
    const reuseStr = Exercise.fullName(exercise, this.settings, reuseExercise.label);
    let str = `...${reuseStr}`;
    if (reuse.week || reuse.day) {
      const weekAndDay = CollectionUtils.compact([reuse.week, reuse.day]).join(":");
      str += `[${weekAndDay}]`;
    }
    return str;
  }

  private getUpdate(update: IPlannerProgramProperty): string {
    if (update.reuse?.exerciseType) {
      const exercise = Exercise.get(update.reuse.exerciseType, this.settings.exercises);
      const fullName = Exercise.fullName(exercise, this.settings, update.reuse.label);
      return ` / update: custom() { ...${fullName} }`;
    } else {
      return ` / update: custom() ${update.script}`;
    }
  }

  private getId(programExercise: IPlannerProgramExercise): string {
    return ` / id: tags(${(programExercise.tags || []).join(", ")})`;
  }

  private getProgress(programExercise: IPlannerProgramExercise, progress: IPlannerProgramProperty): string {
    let plannerExercise = ` / progress: ${progress.fnName}`;
    if (progress.fnName === "custom") {
      plannerExercise += `(${ObjectUtils.entries(programExercise.state)
        .map(([k, v]) => {
          return `${k}${programExercise.stateMetadata[k]?.userPrompted ? "+" : ""}: ${Weight.print(v)}`;
        })
        .join(", ")})`;
    } else if (progress.fnName === "lp") {
      const increment = programExercise.state.increment as IWeight | IPercentage;
      const successes = programExercise.state.successes as number;
      const successCounter = programExercise.state.successCounter as number;
      const decrement = programExercise.state.decrement as IWeight | IPercentage;
      const failures = programExercise.state.failures as number;
      const failureCounter = programExercise.state.failureCounter as number;
      const args: string[] = [];
      args.push(Weight.print(increment));
      if (successes > 1 || decrement.value > 0) {
        args.push(`${successes}`);
      }
      if (successes > 1 || decrement.value > 0) {
        args.push(`${successCounter}`);
      }
      if (decrement.value > 0) {
        args.push(Weight.print(decrement));
      }
      if (failures > 1) {
        args.push(`${failures}`);
      }
      if (failures > 1) {
        args.push(`${failureCounter}`);
      }
      plannerExercise += `(${args.join(", ")})`;
    } else if (progress.fnName === "dp") {
      const increment = programExercise.state.increment as IWeight | IPercentage;
      const minReps = programExercise.state.minReps as number;
      const maxReps = programExercise.state.maxReps as number;
      const args = [Weight.print(increment), `${minReps}`, `${maxReps}`];
      plannerExercise += `(${args.join(", ")})`;
    } else if (progress.fnName === "sum") {
      const reps = programExercise.state.reps as number;
      const increment = programExercise.state.increment as IWeight | IPercentage;
      const args = [`${reps}`, Weight.print(increment)];
      plannerExercise += `(${args.join(", ")})`;
    }
    if (progress.fnName === "custom") {
      if (progress.reuse?.exerciseType) {
        const exercise = Exercise.get(progress.reuse.exerciseType, this.settings.exercises);
        const fullName = Exercise.fullName(exercise, this.settings, progress.reuse.label);
        plannerExercise += ` { ...${fullName} }`;
      } else {
        plannerExercise += ` ${progress.script}`;
      }
    }
    return plannerExercise;
  }

  private getGlobals(variations: IPlannerProgramExerciseEvaluatedSetVariation[]): IPlannerToProgram2Globals {
    const firstWeight = variations[0]?.sets[0]?.weight;
    const firstRpe = variations[0]?.sets[0]?.rpe;
    const firstLogRpe = !!variations[0]?.sets[0]?.logRpe;
    const firstAskWeight = !!variations[0]?.sets[0]?.askWeight;
    const firstTimer = variations[0]?.sets[0]?.timer;
    return {
      weight:
        firstWeight != null &&
        variations.every((v) =>
          v.sets.every((s) => Weight.eq(s.weight, firstWeight) && !!s.askWeight === firstAskWeight)
        )
          ? firstWeight
          : undefined,
      askWeight: variations.every((v) => v.sets.every((s) => Weight.eq(s.weight, firstWeight) && !!s.askWeight)),
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
    sets: IPlannerProgramExerciseEvaluatedSet[]
  ): [IPlannerProgramExerciseEvaluatedSet, number][] {
    if (sets.length === 0) {
      return [
        [
          {
            maxrep: 1,
            weight: Weight.build(0, "lb"),
            logRpe: false,
            isAmrap: false,
            isQuickAddSet: false,
            askWeight: false,
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
      groups[groups.length - 1][1] += 1;
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
          first.weight ?? (first.percentage != null ? Weight.buildPct(first.percentage) : Weight.build(0, "lb"));
        strs.push(`${length}x${first.reps} ${Weight.print(weight)}`);
      }
      return strs.length === 0 ? "none" : strs.join(", ");
    }
    return undefined;
  }

  private weightExprToStr(weightExpr?: IWeight | IPercentage): string {
    if (weightExpr != null) {
      return Weight.print(weightExpr);
    }
    return "";
  }

  private variationToString(
    variation: IPlannerProgramExerciseEvaluatedSetVariation,
    globals: IPlannerToProgram2Globals,
    index: number
  ): string {
    const groupedVariationSets = this.groupVariationSets(variation.sets);
    const result: string[] = [];
    for (const group of groupedVariationSets) {
      const set = group[0];
      let setStr = "";
      setStr += `${group[1]}${set.isQuickAddSet ? "+" : ""}x`;
      setStr += set.minrep != null ? `${n(Math.max(0, set.minrep))}-` : "";
      setStr += `${n(Math.max(0, set.maxrep))}`;
      setStr += set.isAmrap ? "+" : "";
      if (globals.weight == null) {
        const weightValue = this.weightExprToStr(set.weight);
        setStr += weightValue ? ` ${weightValue}${set.askWeight ? "+" : ""}` : "";
      }
      if (globals.rpe == null) {
        setStr += set.rpe ? ` @${n(Math.max(0, set.rpe))}` : "";
        setStr += set.rpe && set.logRpe ? "+" : "";
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
    return `${set.reps}-${set.numberOfSets}-${Weight.print(set.weight || set.percentage || 0)}`;
  }

  private setToKey(set: IPlannerProgramExerciseEvaluatedSet): string {
    return `${set.maxrep}-${set.minrep}-${Weight.print(set.weight)}-${set.isAmrap}-${set.rpe}-${set.logRpe}-${
      set.timer
    }-${set.label}-${set.askWeight}`;
  }
}
