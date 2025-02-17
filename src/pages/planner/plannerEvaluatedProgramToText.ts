import { IDayData, IPlannerProgram, IPlannerProgramDay, IPlannerProgramWeek, ISettings } from "../../types";
import { PlannerProgram } from "./models/plannerProgram";
import { PlannerKey } from "./plannerKey";
import { IPlannerEvalResult, IPlannerTopLineItem } from "./plannerExerciseEvaluator";
import {
  IPlannerProgramExerciseSet,
  IPlannerProgramExerciseSetExpanded,
  IPlannerProgramExerciseWarmupSet,
  IPlannerProgramProgress,
  IPlannerProgramReuse,
  IPlannerProgramUpdate,
} from "./models/types";
import { Weight } from "../../models/weight";
import { ObjectUtils } from "../../utils/object";
import { PlannerProgramExercise } from "./models/plannerProgramExercise";

export interface IPlannerEvaluatedProgramToTextOpts {
  reorder?: { dayData: Required<IDayData>; fromIndex: number; toIndex: number }[];
  add?: { dayData: Required<IDayData>; index: number; fullName: string }[];
}

export class PlannerEvaluatedProgramToText {
  constructor(
    private readonly plannerProgram: IPlannerProgram,
    private readonly newEvaluatedWeeks: IPlannerEvalResult[][],
    private readonly settings: ISettings
  ) {}

  private reorderGroupedTopLine(
    groupedTopLine: IPlannerTopLineItem[][][][],
    reorders: IPlannerEvaluatedProgramToTextOpts["reorder"]
  ): IPlannerTopLineItem[][][][] {
    if (!reorders) {
      return groupedTopLine;
    }
    for (const reorder of reorders) {
      const groupedDay = groupedTopLine[reorder.dayData.week - 1][reorder.dayData.dayInWeek - 1];
      const from = groupedDay[reorder.fromIndex];
      groupedDay.splice(reorder.fromIndex, 1);
      groupedDay.splice(reorder.toIndex, 0, from);
    }
    return groupedTopLine;
  }

  private addGroupedTopLine(
    groupedTopLine: IPlannerTopLineItem[][][][],
    adds: IPlannerEvaluatedProgramToTextOpts["add"]
  ): IPlannerTopLineItem[][][][] {
    if (!adds) {
      return groupedTopLine;
    }
    for (const add of adds) {
      const groupedDay = groupedTopLine[add.dayData.week - 1][add.dayData.dayInWeek - 1];
      groupedDay.splice(add.index, 0, [
        { type: "exercise", value: PlannerKey.fromFullName(add.fullName, this.settings) },
      ]);
    }
    return groupedTopLine;
  }

  public run(opts: IPlannerEvaluatedProgramToTextOpts = {}): IPlannerProgram {
    const plannerWeeks: IPlannerProgramWeek[] = [];
    const topLineMap = ObjectUtils.clone(PlannerProgram.topLineItems(this.plannerProgram, this.settings));
    let groupedTopLineMap = PlannerProgram.groupedTopLines(topLineMap);
    groupedTopLineMap = opts.reorder ? this.reorderGroupedTopLine(groupedTopLineMap, opts.reorder) : groupedTopLineMap;
    groupedTopLineMap = opts.add ? this.addGroupedTopLine(groupedTopLineMap, opts.add) : groupedTopLineMap;

    const addedIdMap: Record<string, boolean> = {};

    for (let weekIndex = 0; weekIndex < this.plannerProgram.weeks.length; weekIndex += 1) {
      const week = this.plannerProgram.weeks[weekIndex];
      const plannerWeek: IPlannerProgramWeek = { name: week.name, days: [], description: week.description };
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.days.length; dayInWeekIndex += 1) {
        const groupedTopLines = groupedTopLineMap[weekIndex][dayInWeekIndex];
        const weekDay = week.days[dayInWeekIndex];
        const plannerDay: IPlannerProgramDay = {
          name: weekDay.name,
          exerciseText: "",
          description: weekDay.description,
        };
        const exerciseTextArr: string[] = [];
        for (let groupIndex = 0; groupIndex < groupedTopLines.length; groupIndex += 1) {
          const group = groupedTopLines[groupIndex];
          let descriptionIndex = -1;
          let hadEmpty = true;
          for (let itemIndex = 0; itemIndex < group.length; itemIndex += 1) {
            const line = group[itemIndex];
            const exerciseLine = group.find((l) => l.type === "exercise");
            switch (line.type) {
              case "comment": {
                exerciseTextArr.push(line.value);
                break;
              }
              case "description": {
                let value = line.value;
                if (hadEmpty) {
                  descriptionIndex += 1;
                  value = value.replace(/^\s*\/\/ !?\s*/, "");
                  const evalDay = this.newEvaluatedWeeks[weekIndex][dayInWeekIndex];
                  const evalExercise = evalDay.success
                    ? evalDay.data.find((e) => e.key === exerciseLine?.value)
                    : undefined;
                  if (descriptionIndex > 0 && evalExercise?.descriptions?.[descriptionIndex]?.isCurrent) {
                    value = `// ! ${value}`;
                  } else {
                    value = `// ${value}`;
                  }
                }
                hadEmpty = false;
                exerciseTextArr.push(value);
                break;
              }
              case "empty": {
                exerciseTextArr.push("");
                hadEmpty = true;
                break;
              }
              case "exercise": {
                const evalDay = this.newEvaluatedWeeks[weekIndex][dayInWeekIndex];
                const evalExercise = evalDay.success ? evalDay.data.find((e) => e.key === line.value) : undefined;
                if (!evalExercise || (evalExercise.isRepeat && evalExercise.repeating.indexOf(weekIndex + 1) === -1)) {
                  break;
                }
                const key = PlannerKey.fromFullName(evalExercise.fullName, this.settings);
                let plannerExercise = "";
                plannerExercise += evalExercise.fullName;
                const orderAndRepeat: string[] = [];
                if (evalExercise.order !== 0) {
                  orderAndRepeat.push(`${evalExercise.order}`);
                }
                if (evalExercise.repeat.length > 0) {
                  const from = evalExercise.repeat[0];
                  const to = evalExercise.repeat[evalExercise.repeat.length - 1];
                  orderAndRepeat.push(`${from}-${to}`);
                }
                if (orderAndRepeat.length > 0) {
                  plannerExercise += `[${orderAndRepeat.join(",")}]`;
                }
                if (evalExercise.notused) {
                  plannerExercise += " / used: none";
                }
                const reuse = evalExercise.reuse;
                if (reuse) {
                  let reusedKey = reuse.fullName;
                  if (reuse.week != null || reuse.day != null) {
                    reusedKey += reuse.week == null ? `[${reuse.day}]` : `[${reuse.week}:${reuse.day ?? "_"}]`;
                  }
                  plannerExercise += ` / ...${reusedKey}`;
                }
                if (evalExercise.setVariations.length > 0) {
                  plannerExercise +=
                    ` / ` +
                    evalExercise.setVariations
                      .map((v, i) =>
                        this.setsToString(PlannerProgramExercise.sets(evalExercise, i), v.isCurrent && i !== 0)
                      )
                      .join(" / ");
                }

                if (reuse && evalExercise.setVariations.length === 0) {
                  const globals = evalExercise.globals;
                  if (globals.weight != null) {
                    plannerExercise += ` / ${Weight.print(globals.weight)}${globals.askWeight ? "+" : ""}`;
                  }
                  if (globals.rpe != null) {
                    plannerExercise += ` / @${globals.rpe}${globals.logRpe ? "+" : ""}`;
                  }
                  if (globals.timer != null) {
                    plannerExercise += ` / ${globals.timer}s`;
                  }
                }

                if (evalExercise.warmupSets) {
                  const warmupSets = PlannerEvaluatedProgramToText.getWarmupSets(evalExercise.warmupSets);
                  plannerExercise += ` / warmup: ${warmupSets}`;
                }

                if (!addedIdMap[key] && (evalExercise.tags || []).length > 0) {
                  plannerExercise += ` / id: tags(${evalExercise.tags.join(", ")})`;
                  addedIdMap[key] = true;
                }

                if (evalExercise.update) {
                  plannerExercise += ` / ${PlannerEvaluatedProgramToText.updateToString(evalExercise.update)} `;
                }

                if (evalExercise.progress) {
                  plannerExercise += ` / ${PlannerEvaluatedProgramToText.progressToString(evalExercise.progress)} `;
                }
                exerciseTextArr.push(plannerExercise);
                break;
              }
            }
          }
        }
        plannerDay.exerciseText = exerciseTextArr.join("\n");
        plannerWeek.days.push(plannerDay);
      }
      plannerWeeks.push(plannerWeek);
    }
    const result: IPlannerProgram = { name: this.plannerProgram.name, weeks: plannerWeeks };
    return PlannerProgram.compact(this.plannerProgram, result, this.settings);
  }

  public static expandedSetsToString(sets: IPlannerProgramExerciseSetExpanded[]): string {
    const result: string[] = [];
    for (const set of sets) {
      let setStr = "";
      setStr += set.minrep != null && set.minrep !== set.maxrep ? `${Math.max(0, set.minrep)}-` : "";
      setStr += set.maxrep != null ? `${Math.max(0, set.maxrep)}` : "";
      setStr += set.maxrep != null && set.isAmrap ? "+ " : " ";
      setStr += set.weight != null ? Weight.print(set.weight) : undefined;
      setStr += set.rpe != null ? ` @${Math.max(0, set.rpe)}` : "";
      setStr += set.rpe != null && set.logRpe ? "+" : "";
      setStr += set.timer != null ? ` ${Math.max(0, set.timer)}s` : "";
      if (set.label) {
        setStr += ` (${set.label})`;
      }
      result.push(setStr);
    }
    return result.map((r) => r.trim()).join(", ");
  }

  public static reuseToString(reuse: IPlannerProgramReuse): string {
    let result = "";
    if (reuse) {
      result += `...${reuse.fullName}`;
      if (reuse.week != null || reuse.day != null) {
        result += reuse.week == null ? `[${reuse.day}]` : `[${reuse.week}:${reuse.day ?? "*"}]`;
      }
    }
    return result;
  }

  public static updateToString(update?: IPlannerProgramUpdate): string {
    let result = "";
    if (update == null) {
      return result;
    }
    if (update.type === "custom") {
      result += `update: custom() `;
      if (update.reuse) {
        result += `{ ${this.reuseToString(update.reuse)} }`;
      } else {
        result += update.script;
      }
    }
    return result;
  }

  public static progressToString(progress?: IPlannerProgramProgress): string {
    let result = "";
    if (progress == null) {
      return result;
    }
    if (progress.type === "custom") {
      const state = progress.state.map(([key, value]) => `${key}: ${Weight.print(value)}`).join(", ");
      result += `progress: custom(${state}) `;
      if (progress.reuse) {
        result += `{ ${this.reuseToString(progress.reuse)} }`;
      } else {
        result += progress.script;
      }
    } else if (progress.type === "lp") {
      const args: string[] = [];
      args.push(Weight.print(progress.increment));
      if (progress.successes > 1 || progress.decrement.value > 0) {
        args.push(`${progress.successes}`);
        args.push(`${progress.successCounter}`);
      }
      if (progress.decrement.value > 0) {
        args.push(Weight.print(progress.decrement));
        if (progress.failures > 1) {
          args.push(`${progress.failures}`);
          args.push(`${progress.failureCounter}`);
        }
      }
      result += `progress: lp(${args.join(", ")})`;
    } else if (progress.type === "dp") {
      result += `progress: dp(${Weight.print(progress.increment)}, ${progress.minReps}, ${progress.maxReps})`;
    } else if (progress.type === "sum") {
      result += `progress: sum(${progress.reps}, ${Weight.print(progress.increment)})`;
    } else {
      result += `progress: none`;
    }
    return result;
  }

  private setsToString(sets: IPlannerProgramExerciseSet[], isCurrent: boolean): string {
    const addQuickAddSet = sets.some((s) => !!s.repRange?.isQuickAddSet);
    const result: string[] = [];
    for (const set of sets) {
      let setStr = "";
      const repRange = set.repRange;
      if (repRange == null) {
        continue;
      }
      setStr += `${repRange.numberOfSets}${addQuickAddSet ? "+" : ""}x`;
      setStr += repRange.minrep !== repRange.maxrep ? `${Math.max(0, repRange.minrep)}-` : "";
      setStr += `${Math.max(0, repRange.maxrep)}`;
      setStr += repRange.isAmrap ? "+" : "";
      const weightValue = set.weight != null ? Weight.print(set.weight) : undefined;
      setStr += weightValue ? ` ${weightValue}${set.askWeight ? "+" : ""}` : "";
      setStr += set.rpe != null ? ` @${Math.max(0, set.rpe)}` : "";
      setStr += set.rpe != null && set.logRpe ? "+" : "";
      setStr += set.timer != null ? ` ${Math.max(0, set.timer)}s` : "";
      if (set.label) {
        setStr += ` (${set.label})`;
      }
      result.push(setStr);
    }
    return (isCurrent ? "! " : "") + result.map((r) => r.trim()).join(", ");
  }

  public static getWarmupSets(sets: IPlannerProgramExerciseWarmupSet[]): string {
    if (sets.length === 0) {
      return "none";
    }
    const result: string[] = [];
    for (const set of sets) {
      let setStr = "";
      setStr += `${Math.max(0, set.numberOfSets)}x${Math.max(set.reps, 0)} `;
      if (set.weight != null) {
        setStr += `${Weight.print(set.weight)} `;
      }
      result.push(setStr);
    }
    return result.map((r) => r.trim()).join(", ");
  }
}
