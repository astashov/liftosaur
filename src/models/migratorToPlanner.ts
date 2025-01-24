import { PlannerKey } from "../pages/planner/plannerKey";
import {
  IDayData,
  IPercentage,
  IPlannerProgram,
  IPlannerProgramDay,
  IPlannerProgramWeek,
  IProgram,
  IProgramExercise,
  IProgramExerciseWarmupSet,
  IProgramSet,
  ISettings,
  IWeight,
} from "../types";
import { MathUtils } from "../utils/math";
import { equipmentName, Exercise, IExercise } from "./exercise";
import { Weight } from "./weight";
import { IProgramWeek } from "../types";
import { UidFactory } from "../utils/generator";
import { ScriptRunner } from "../parser";
import { Progress } from "./progress";
import { ProgramExercise } from "./programExercise";

export interface IGlobals {
  weight?: IWeight | IPercentage;
  rpe?: number;
}

export class MigratorToPlanner {
  constructor(private readonly program: IProgram, private readonly settings: ISettings) {}

  public migrate(): IPlannerProgram {
    const addedWarmupsMap: Record<string, boolean> = {};
    const addedQuickAddSet: Record<string, boolean> = {};
    const plannerWeeks: IPlannerProgramWeek[] = [];
    const weeks: IProgramWeek[] = this.program.isMultiweek
      ? this.program.weeks
      : [
          {
            id: UidFactory.generateUid(8),
            name: "Week 1",
            days: this.program.days.map((d) => ({ id: d.id })),
          },
        ];
    let dayIndex = 0;
    for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
      const week = weeks[weekIndex];
      const plannerWeek: IPlannerProgramWeek = { name: week.name, days: [] };
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.days.length; dayInWeekIndex++) {
        const weekDay = week.days[dayInWeekIndex];
        const day = this.program.days.find((d) => d.id === weekDay.id)!;
        const plannerDay: IPlannerProgramDay = { name: day.name, exerciseText: "" };
        const exerciseTextArr: string[] = [];
        for (const dayExercise of day?.exercises || []) {
          const dayData: IDayData = { dayInWeek: dayInWeekIndex + 1, week: weekIndex + 1, day: dayIndex + 1 };
          const programExercise = this.program.exercises.find((e) => e.id === dayExercise.id);
          if (!programExercise) {
            continue;
          }

          const key = PlannerKey.fromProgramExercise(programExercise, this.settings);
          const exercise = Exercise.findById(programExercise.exerciseType.id, this.settings.exercises)!;
          const currentSetVariationIndex = 1;
          let plannerExercise = "";
          plannerExercise += this.getExerciseName(programExercise, exercise);
          plannerExercise += " / ";
          const variations = ProgramExercise.getVariations(programExercise, this.program.exercises);
          const globals = this.getGlobals(programExercise, dayData);

          plannerExercise += variations
            .map((v, i) => {
              let addQuickAddSet = false;
              if (!addedQuickAddSet[key] && programExercise.quickAddSets) {
                addQuickAddSet = true;
                addedQuickAddSet[key] = true;
              }
              const sets = this.setsToString(v.sets, programExercise, dayData, globals, this.settings, addQuickAddSet);
              return i !== 0 && i === currentSetVariationIndex ? `! ${sets}` : sets;
            })
            .join(" / ");

          if (globals.weight != null) {
            plannerExercise += ` / ${Weight.print(globals.weight)}`;
          }
          if (globals.rpe != null) {
            plannerExercise += ` / @${globals.rpe}`;
          }

          if (!addedWarmupsMap[key] && programExercise.warmupSets) {
            const warmupSets = this.getWarmupSets(programExercise);
            if (warmupSets != null) {
              plannerExercise += ` / warmup: ${warmupSets}`;
            }
          }

          exerciseTextArr.push(plannerExercise);
          dayIndex += 1;
        }
        plannerDay.exerciseText = exerciseTextArr.join("\n");
        plannerWeek.days.push(plannerDay);
      }
      plannerWeeks.push(plannerWeek);
    }
    return { name: `${this.program.name} (New)`, weeks: plannerWeeks };
  }

  private getExerciseName(programExercise: IProgramExercise, exercise: IExercise): string {
    let plannerExercise = `${programExercise.name}`;
    if (
      programExercise.exerciseType.equipment != null &&
      programExercise.exerciseType.equipment !== exercise.defaultEquipment
    ) {
      plannerExercise += `, ${equipmentName(programExercise.exerciseType.equipment)}`;
    }
    return plannerExercise;
  }

  private getGlobals(programExercise: IProgramExercise, dayData: IDayData): IGlobals {
    const variations = ProgramExercise.getVariations(programExercise, this.program.exercises);
    const firstWeightExpr = variations[0]?.sets[0]?.weightExpr;
    const firstRpeExpr = variations[0]?.sets[0]?.rpeExpr;

    const firstWeight = firstWeightExpr
      ? this.getWeight(programExercise, firstWeightExpr, dayData, this.settings)
      : undefined;
    const firstRpe = firstRpeExpr ? this.getRpe(programExercise, firstRpeExpr, dayData, this.settings) : undefined;

    return {
      weight:
        firstWeight != null &&
        variations.every((v) =>
          v.sets.every((s) => {
            const weight = this.getWeight(programExercise, s.weightExpr, dayData, this.settings);
            return Weight.eq(weight, firstWeight);
          })
        )
          ? firstWeight
          : undefined,
      rpe:
        firstRpe != null &&
        variations.every((v) =>
          v.sets.every((s) => {
            const rpe = this.getRpe(programExercise, s.rpeExpr, dayData, this.settings);
            return rpe === firstRpe;
          })
        )
          ? firstRpe
          : undefined,
    };
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

  private getReps(
    programExercise: IProgramExercise,
    expr: string | undefined,
    dayData: IDayData,
    settings: ISettings
  ): number | undefined {
    const state = ProgramExercise.getState(programExercise, this.program.exercises);
    return expr
      ? new ScriptRunner(
          expr,
          state,
          {},
          Progress.createEmptyScriptBindings(dayData, settings, programExercise.exerciseType),
          Progress.createScriptFunctions(settings),
          settings.units,
          { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
          "regular"
        ).execute("reps")
      : undefined;
  }

  private getRpe(
    programExercise: IProgramExercise,
    expr: string | undefined,
    dayData: IDayData,
    settings: ISettings
  ): number | undefined {
    const state = ProgramExercise.getState(programExercise, this.program.exercises);
    return expr
      ? new ScriptRunner(
          expr,
          state,
          {},
          Progress.createEmptyScriptBindings(dayData, settings, programExercise.exerciseType),
          Progress.createScriptFunctions(settings),
          settings.units,
          { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
          "regular"
        ).execute("rpe")
      : undefined;
  }

  private getWeight(
    programExercise: IProgramExercise,
    expr: string,
    dayData: IDayData,
    settings: ISettings
  ): IWeight | IPercentage {
    const state = ProgramExercise.getState(programExercise, this.program.exercises);
    return new ScriptRunner(
      expr,
      state,
      {},
      Progress.createEmptyScriptBindings(dayData, settings, programExercise.exerciseType),
      Progress.createScriptFunctions(settings),
      settings.units,
      { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
      "regular"
    ).execute("weight");
  }

  private setsToString(
    sets: IProgramSet[],
    programExercise: IProgramExercise,
    dayData: IDayData,
    globals: IGlobals,
    settings: ISettings,
    addQuickAddSet?: boolean
  ): string {
    const groupedVariationSets = this.groupVariationSets(sets);
    const result: string[] = [];
    for (const group of groupedVariationSets) {
      const set = group[0];
      const reps = this.getReps(programExercise, set.repsExpr, dayData, settings);
      const minReps = this.getReps(programExercise, set.minRepsExpr, dayData, settings);
      const weight = this.getWeight(programExercise, set.weightExpr, dayData, settings);
      const rpe = this.getRpe(programExercise, set.rpeExpr, dayData, settings);

      let setStr = "";
      setStr += `${group[1]}${addQuickAddSet ? "+" : ""}x`;
      setStr += minReps != null ? `${minReps}-` : "";
      setStr += `${reps}`;
      setStr += set.isAmrap ? "+" : "";
      if (globals.weight == null) {
        setStr += weight ? ` ${Weight.display(weight)}${set.askWeight ? "+" : ""}` : "";
      }
      if (globals.rpe == null) {
        setStr += rpe != null ? ` @${rpe}` : "";
        setStr += rpe != null && set.logRpe ? "+" : "";
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
