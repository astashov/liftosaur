import { IDayData, IPlannerProgram, IPlannerProgramDay, IPlannerProgramWeek, ISettings } from "../../types";
import { PlannerProgram } from "./models/plannerProgram";
import { PlannerKey } from "./plannerKey";
import { IPlannerEvalResult, IPlannerTopLineItem } from "./plannerExerciseEvaluator";
import { IPlannerProgramExerciseSet, IPlannerProgramExerciseWarmupSet } from "./models/types";
import { Weight } from "../../models/weight";
import { ObjectUtils } from "../../utils/object";
import { PlannerProgramExercise } from "./models/plannerProgramExercise";
import { ProgramToPlanner } from "../../models/programToPlanner";

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

    const addedProgressMap: Record<string, boolean> = {};
    const addedUpdateMap: Record<string, boolean> = {};
    const addedWarmupsMap: Record<string, boolean> = {};
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
                  if (descriptionIndex > 0 && evalExercise?.descriptions.values?.[descriptionIndex]?.isCurrent) {
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
                  const setVarsStr = evalExercise.setVariations
                    .map((v, i) =>
                      this.setsToString(PlannerProgramExercise.sets(evalExercise, i), v.isCurrent && i !== 0)
                    )
                    .join(" / ");
                  plannerExercise += setVarsStr ? ` / ${setVarsStr}` : "";
                }

                if (reuse && evalExercise.setVariations.length === 0) {
                  const globals = evalExercise.globals;
                  if (globals.weight != null) {
                    plannerExercise += ` / ${Weight.print(globals.weight)}${globals.askWeight ? "+" : ""}`;
                  } else if (globals.percentage != null) {
                    plannerExercise += ` / ${globals.percentage}%${globals.askWeight ? "+" : ""}`;
                  }
                  if (globals.rpe != null) {
                    plannerExercise += ` / @${globals.rpe}${globals.logRpe ? "+" : ""}`;
                  }
                  if (globals.timer != null) {
                    plannerExercise += ` / ${globals.timer}s`;
                  }
                }

                if (!addedWarmupsMap[key] && evalExercise.warmupSets) {
                  const warmupSets = this.getWarmupSets(evalExercise.warmupSets);
                  plannerExercise += ` / warmup: ${warmupSets}`;
                }
                addedWarmupsMap[key] = true;

                if (!addedIdMap[key] && (evalExercise.tags || []).length > 0) {
                  plannerExercise += ` / id: tags(${evalExercise.tags.join(", ")})`;
                  addedIdMap[key] = true;
                }

                const update = evalExercise.update;
                if (!addedUpdateMap[key] && update != null && (update.reuse?.fullName || update.script)) {
                  plannerExercise += ` / ${ProgramToPlanner.getUpdate(evalExercise, this.settings)}`;
                  addedUpdateMap[key] = true;
                }

                const progress = evalExercise.progress;
                if (progress != null) {
                  if (progress.type === "none") {
                    plannerExercise += ` / progress: none`;
                  } else if (!addedProgressMap[key]) {
                    plannerExercise += ` / ${ProgramToPlanner.getProgress(evalExercise, this.settings)}`;
                    addedProgressMap[key] = true;
                  }
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
      setStr += repRange.minrep != null ? `${Math.max(0, repRange.minrep)}-` : "";
      setStr += `${Math.max(0, repRange.maxrep ?? 0)}`;
      setStr += repRange.isAmrap ? "+" : "";
      const weightValue =
        set.weight != null ? Weight.print(set.weight) : set.percentage != null ? `${set.percentage}%` : undefined;
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

  private getWarmupSets(sets: IPlannerProgramExerciseWarmupSet[]): string {
    if (sets.length === 0) {
      return "none";
    }
    const result: string[] = [];
    for (const set of sets) {
      let setStr = "";
      setStr += `${Math.max(0, set.numberOfSets)}x${Math.max(set.reps, 0)} `;
      if (set.weight != null) {
        setStr += `${Weight.print(set.weight)} `;
      } else if (set.percentage != null) {
        setStr += `${set.percentage}%`;
      }
      result.push(setStr);
    }
    return result.map((r) => r.trim()).join(", ");
  }
}
