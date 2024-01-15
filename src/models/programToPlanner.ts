import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import {
  IPlannerProgram,
  IPlannerProgramDay,
  IPlannerProgramWeek,
  IProgram,
  IProgramExercise,
  IProgramSet,
  ISettings,
  IWeight,
} from "../types";
import { MathUtils } from "../utils/math";
import { ObjectUtils } from "../utils/object";
import { Exercise, equipmentName } from "./exercise";
import { Weight } from "./weight";
import { PlannerToProgram2 } from "./plannerToProgram2";

interface IPlannerToProgram2Globals {
  weight?: string;
  rpe?: string;
  timer?: string;
}

export class ProgramToPlanner {
  constructor(
    private readonly program: IProgram,
    private readonly plannerProgram: IPlannerProgram,
    private readonly settings: ISettings
  ) {}

  public static exerciseKey(programExercise: IProgramExercise): string {
    const [aLabel, ...aNameParts] = programExercise.name.split(":");
    let name: string;
    let label: string | undefined;
    if (aNameParts.length === 0) {
      name = aLabel.trim();
      label = undefined;
    } else {
      name = aNameParts.join(":").trim();
      label = aLabel.trim();
    }
    return `${label || ""}-${name || ""}-${programExercise.exerciseType.equipment || "bodyweight"}`;
  }

  public static variationsMap(
    plannerProgram: IPlannerProgram,
    settings: ISettings
  ): Record<string, Record<number, [number, number]>> {
    const evaluatedWeeks = PlannerProgram.evaluate(plannerProgram, settings.exercises, settings.equipment);

    const variationsMap: Record<string, Record<number, [number, number]>> = {};
    const variationsRunningIndex: Record<string, number> = {};

    let variationsDayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          for (const exercise of day.data) {
            const key = PlannerToProgram2.plannerExerciseKey(exercise);
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
    console.log("vm", variationsMap);
    return variationsMap;
  }

  public convertToPlanner(): IPlannerProgram {
    const plannerWeeks: IPlannerProgramWeek[] = [];
    const variationsMap = ProgramToPlanner.variationsMap(this.plannerProgram, this.settings);
    let dayIndex = 0;
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
          const key = ProgramToPlanner.exerciseKey(programExercise);
          const exercise = Exercise.findById(programExercise.exerciseType.id, this.settings.exercises)!;
          let plannerExercise = `${programExercise.name}`;
          if (programExercise.exerciseType.equipment !== exercise.defaultEquipment) {
            plannerExercise += `, ${equipmentName(programExercise.exerciseType.equipment)}`;
          }
          plannerExercise += " / ";
          const [from, to] = variationsMap[key][dayIndex];
          const variations = programExercise.variations.slice(from, to);
          console.log(from, to, variations);

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
            .map((v) => {
              return this.setsToString(v.sets, globals);
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

          if (programExercise.finishDayExpr || ObjectUtils.isNotEmpty(programExercise.state)) {
            const stateVars = ObjectUtils.keys(programExercise.state).map(
              (k) => `${k}: ${this.printVal(programExercise.state[k])}`
            );
            plannerExercise += ` / progress: custom(${stateVars.join(", ")})`;
            if (programExercise.finishDayExpr) {
              plannerExercise += " " + programExercise.finishDayExpr;
            }
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
    console.log(PlannerProgram.generateFullText(result.weeks));
    return result;
  }

  private printVal(val: number | IWeight): string {
    return Weight.is(val) ? `${val.value}${val.unit}` : `${val}`;
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

  private weightExprToStr(weightExpr?: string): string {
    if (weightExpr != null && weightExpr.indexOf("rm1 * rpeMultiplier") === -1) {
      const percentageMatch = weightExpr.match(/rm1 \* (.*)/);
      console.log(percentageMatch);
      if (percentageMatch != null) {
        const percentage = MathUtils.roundFloat(parseFloat(percentageMatch[1]) * 100, 2);
        console.log(percentage);
        return `${percentage}%`;
      } else {
        return weightExpr;
      }
    }
    return "";
  }

  private setsToString(sets: IProgramSet[], globals: IPlannerToProgram2Globals): string {
    const groupedVariationSets = this.groupVariationSets(sets);
    const result: string[] = [];
    for (const group of groupedVariationSets) {
      const set = group[0];
      let setStr = "";
      setStr += group[1] > 1 ? `${group[1]}x` : "";
      setStr += set.minRepsExpr ? `${set.minRepsExpr}-` : "";
      setStr += `${set.repsExpr}`;
      setStr += set.isAmrap ? "+" : "";
      if (globals.weight == null) {
        setStr = this.weightExprToStr(set.weightExpr);
      }
      if (globals.rpe == null) {
        setStr += set.rpeExpr ? ` @${set.rpeExpr}` : "";
        setStr += set.rpeExpr && set.logRpe ? "+" : "";
      }
      if (globals.timer == null) {
        setStr += set.timerExpr ? ` ${set.timerExpr}s` : "";
      }
      result.push(setStr);
    }
    return result.join(", ");
  }

  private setToKey(set: IProgramSet): string {
    return `${set.repsExpr}-${set.minRepsExpr}-${set.weightExpr}-${set.isAmrap}-${set.rpeExpr}-${set.logRpe}-${set.timerExpr}`;
  }
}
