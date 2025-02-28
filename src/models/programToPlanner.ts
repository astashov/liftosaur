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
  IPlannerProgramReuse,
} from "../pages/planner/models/types";
import { IEvaluatedProgram, Program } from "./program";
import { Exercise } from "./exercise";
import { CollectionUtils } from "../utils/collection";

interface IPlannerToProgram2Globals {
  weight?: IWeight | IPercentage;
  rpe?: number;
  timer?: number;
  logRpe?: boolean;
  askWeight?: boolean;
}

type IDereuseDecision = "weight" | "rpe" | "timer";

export class ProgramToPlanner {
  constructor(private readonly program: IEvaluatedProgram, private readonly settings: ISettings) {}

  private getCurrentSetVariationIndex(key: string, weekIndex: number, dayInWeekIndex: number): number {
    const exercise = this.program.weeks[weekIndex]?.days[dayInWeekIndex]?.exercises?.find((e) => e.key === key);
    const setVariations = exercise?.setVariations || [];
    const index = setVariations.findIndex((s) => s.isCurrent);
    return index === -1 ? 0 : index;
  }

  private getCurrentDescriptionIndex(key: string, weekIndex: number, dayInWeekIndex: number): number {
    const exercise = this.program.weeks[weekIndex]?.days[dayInWeekIndex]?.exercises?.find((e) => e.key === key);
    const descriptions = exercise?.descriptions || [];
    const index = descriptions.findIndex((s) => s.isCurrent);
    return index === -1 ? 0 : index;
  }

  private getDereuseDecisions(
    programExercise: IPlannerProgramExercise,
    reuse?: IPlannerProgramReuse
  ): IDereuseDecision[] {
    const dereuseDecisions: IDereuseDecision[] = [];
    if (!reuse?.exercise) {
      return dereuseDecisions;
    }
    for (let i = 0; i < programExercise.evaluatedSetVariations.length; i += 1) {
      const programVariation = programExercise.evaluatedSetVariations[i];
      const reuseVariation = reuse.exercise.evaluatedSetVariations[i];
      for (let j = 0; j < programVariation.sets.length; j += 1) {
        const programSet = programVariation.sets[j];
        const reuseSet = reuseVariation.sets[j];
        if (!(Weight.eq(programSet.weight, reuseSet.weight) || programSet.askWeight !== reuseSet.askWeight)) {
          dereuseDecisions.push("weight");
        }
        if (!(programSet.rpe !== reuseSet.rpe || programSet.logRpe !== reuseSet.logRpe)) {
          dereuseDecisions.push("rpe");
        }
        if (programSet.timer !== reuseSet.timer) {
          dereuseDecisions.push("timer");
        }
      }
    }
    return dereuseDecisions;
  }

  public convertToPlanner(): IPlannerProgram {
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
              const evalExercise = Program.getProgramExercise(dayIndex + 1, this.program, line.value)!;
              const key = evalExercise.key;
              let plannerExercise = "";
              plannerExercise += evalExercise.fullName;
              plannerExercise += " / ";
              if (evalExercise.notused) {
                plannerExercise += "used: none / ";
              }
              const currentSetVariationIndex = this.getCurrentSetVariationIndex(
                evalExercise.key,
                weekIndex,
                dayInWeekIndex
              );
              const variations = evalExercise.evaluatedSetVariations;
              const globals = this.getGlobals(variations);

              const reuse = evalExercise?.reuse;
              const shouldReuseSets = this.shouldReuseSets(evalExercise, reuse);
              const dereuseDecisions = shouldReuseSets ? this.getDereuseDecisions(evalExercise, reuse) : [];
              if (reuse && shouldReuseSets) {
                plannerExercise += this.reuseToStr(reuse);
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
                plannerExercise += variations
                  .map((v, i) => {
                    const sets = this.variationToString(v, globals);
                    return i !== 0 && i === currentSetVariationIndex ? `! ${sets}` : sets;
                  })
                  .join(" / ");

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
              if (!addedProgressMap[key] && progress) {
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
    return PlannerProgram.compact(this.program.planner, result, this.settings);
  }

  private reuseToStr(reuse: IPlannerProgramReuse): string {
    if (!reuse.exercise) {
      throw new Error("reuse.exercise is required");
    }
    const exercise = Exercise.get(reuse.exercise.exerciseType, this.settings.exercises);
    const reuseStr = Exercise.fullName(exercise, this.settings, reuse.exercise.label);
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
          return `${k}: ${Weight.print(v)}`;
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
      const args = [Weight.print(increment), `${reps}`];
      plannerExercise += `(${args.join(", ")})`;
    }
    if (progress.fnName === "custom") {
      if (progress.reuse?.exerciseType) {
        const exercise = Exercise.get(progress.reuse.exerciseType, this.settings.exercises);
        const fullName = Exercise.fullName(exercise, this.settings, progress.reuse.label);
        plannerExercise += `{ ...${fullName} }`;
      } else {
        plannerExercise += progress.script;
      }
    }
    return plannerExercise;
  }

  private shouldReuseSets(programExercise: IPlannerProgramExercise, reuse?: IPlannerProgramReuse): boolean {
    if (!reuse?.exercise) {
      return false;
    }
    const globals = this.getGlobals(programExercise.evaluatedSetVariations);
    if (programExercise.evaluatedSetVariations.length !== reuse.exercise.evaluatedSetVariations.length) {
      return false;
    }
    for (let i = 0; i < programExercise.evaluatedSetVariations.length; i += 1) {
      const programVariation = programExercise.evaluatedSetVariations[i];
      const reuseVariation = reuse.exercise.evaluatedSetVariations[i];
      if (programVariation.sets.length !== reuseVariation.sets.length) {
        return false;
      }
      for (let j = 0; j < programVariation.sets.length; j += 1) {
        const programSet = programVariation.sets[j];
        const reuseSet = reuseVariation.sets[j];
        if (programSet.maxrep !== reuseSet.maxrep || programSet.minrep !== reuseSet.minrep) {
          return false;
        }
        if (
          (!(Weight.eq(programSet.weight, reuseSet.weight) || programSet.askWeight !== reuseSet.askWeight) &&
            !globals.weight) ||
          ((programSet.rpe !== reuseSet.rpe || programSet.logRpe !== reuseSet.logRpe) && !globals.rpe) ||
          (programSet.timer !== reuseSet.timer && !globals.timer)
        ) {
          return false;
        }
      }
    }
    return true;
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
        strs.push(`${length}x${first.reps} ${Weight.print(first.weight || first.percentage || 0)}`);
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
    globals: IPlannerToProgram2Globals
  ): string {
    const groupedVariationSets = this.groupVariationSets(variation.sets);
    const result: string[] = [];
    for (const group of groupedVariationSets) {
      const set = group[0];
      let setStr = "";
      setStr += `${group[1]}${set.isQuickAddSet ? "+" : ""}x`;
      setStr += set.minrep != null && set.minrep !== set.maxrep ? `${n(Math.max(0, set.minrep))}-` : "";
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
    return result.map((r) => r.trim()).join(", ");
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
