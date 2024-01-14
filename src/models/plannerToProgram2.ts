import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { IPlannerProgramExercise, IPlannerProgramExerciseSet } from "../pages/planner/models/types";
import {
  IPlannerProgram,
  IProgram,
  IProgramExercise,
  ISettings,
  IProgramSet,
  IProgramDay,
  IProgramWeek,
  IProgramExerciseVariation,
  IPlannerProgramWeek,
} from "../types";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { equipmentName, Exercise } from "./exercise";
import { IPlannerProgramDay } from "../types";

interface IPlannerToProgram2Globals {
  weight?: string;
  rpe?: string;
  timer?: string;
}

export class PlannerToProgram2 {
  constructor(
    private readonly program: IProgram,
    private readonly plannerProgram: IPlannerProgram,
    private readonly settings: ISettings
  ) {}

  private exerciseKey(exercise: IPlannerProgramExercise): string {
    return `${exercise.label || ""}-${exercise.name}-${exercise.equipment || "bodyweight"}`;
  }

  public convertToProgram(): IProgram {
    const evaluatedWeeks = PlannerProgram.evaluate(
      this.plannerProgram,
      this.settings.exercises,
      this.settings.equipment
    );
    const isValid = evaluatedWeeks.every((week) => week.every((day) => day.success));

    if (!isValid) {
      throw new Error("Invalid program");
    }

    const programDays: IProgramDay[] = [];
    const programWeeks: IProgramWeek[] = [];
    const programExercises: Record<string, IProgramExercise> = {};
    let dayIndex = 0;
    const variationIndexes: Record<string, Record<number, { count: number; current: number }>> = {};
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      const plannerWeek = this.plannerProgram.weeks[weekIndex];
      const programWeek: IProgramWeek = { id: UidFactory.generateUid(8), name: plannerWeek.name, days: [] };
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        const plannerDay = plannerWeek.days[dayInWeekIndex];
        const programDay: IProgramDay = { id: UidFactory.generateUid(8), name: plannerDay.name, exercises: [] };
        if (day.success) {
          for (const evalExercise of day.data) {
            const key = this.exerciseKey(evalExercise);
            const exercise = Exercise.findByName(evalExercise.name, this.settings.exercises);
            if (!exercise) {
              throw new Error(`Exercise not found: ${evalExercise.name}`);
            }
            const programExercise: IProgramExercise = programExercises[key] || {
              descriptions: [""],
              exerciseType: { id: exercise.id, equipment: evalExercise.equipment || "bodyweight" },
              name: `${evalExercise.label ? `${evalExercise.label}: ` : ""}${evalExercise.name}`,
              id: UidFactory.generateUid(8),
              state: {},
              variations: [],
              variationExpr: "",
              descriptionExpr: "day",
              finishDayExpr: "",
            };
            programExercises[key] = programExercise;
            const newVariations: IProgramExerciseVariation[] = evalExercise.setVariations.map(
              (setVariation, setIndex) => {
                const sets: IProgramSet[] = [];
                for (const set of setVariation.sets) {
                  if (set.repRange != null) {
                    const range = set.repRange;
                    let weightExpr: string = "";
                    if (set.weight) {
                      weightExpr = `${set.weight.value}${set.weight.unit}`;
                    } else if (set.percentage) {
                      weightExpr = `rm1${set.percentage !== 100 ? ` * ${set.percentage / 100}` : ""}`;
                    } else {
                      const rpe = set.rpe || 10;
                      weightExpr = `rm1 * rpeMultiplier(${set.repRange.maxrep}${rpe < 10 ? `, ${rpe}` : ""})`;
                    }
                    for (let i = 0; i < range.numberOfSets; i++) {
                      sets.push({
                        repsExpr: `${range.maxrep}`,
                        minRepsExpr: range.maxrep === range.minrep ? undefined : `${range.minrep}`,
                        weightExpr,
                        isAmrap: range.isAmrap,
                        logRpe: set.logRpe,
                        rpeExpr: set.rpe ? `${set.rpe}` : undefined,
                        timerExpr: set.timer ? `${set.timer}` : undefined,
                      });
                    }
                  }
                }
                variationIndexes[key] = variationIndexes[key] || {};
                variationIndexes[key][dayIndex] = variationIndexes[key][dayIndex] || { count: 0, current: 0 };
                variationIndexes[key][dayIndex].count += 1;
                if (setVariation.isCurrent) {
                  variationIndexes[key][dayIndex].current = setIndex;
                }
                return { sets };
              }
            );
            programExercise.variations = programExercise.variations.concat(newVariations);
            programDay.exercises.push(programExercise);
          }
        }
        programDays.push(programDay);
        programWeek.days.push(programDay);
        dayIndex += 1;
      }
      programWeeks.push(programWeek);
    }

    for (const exerciseKey of Object.keys(programExercises)) {
      const programExercise = programExercises[exerciseKey];
      const variationIndex = variationIndexes[exerciseKey];
      let index = 0;
      programExercise.variationExpr =
        ObjectUtils.keys(variationIndex)
          .map((di) => {
            const expr = `day == ${di + 1} ? ${index + variationIndex[di].current + 1} : `;
            index += variationIndex[di].count;
            return expr;
          })
          .join("") + "1";
    }

    const program: IProgram = {
      id: this.program.id,
      name: this.plannerProgram.name,
      description: "Generated from a Workout Planner",
      url: "",
      author: "",
      nextDay: 1,
      exercises: ObjectUtils.values(programExercises),
      days: programDays,
      weeks: programWeeks,
      isMultiweek: true,
      tags: [],
    };
    console.log(program);
    return program;
  }

  public convertToPlanner(): IPlannerProgram {
    const variationsMap: Record<string, Record<number, [number, number]>> = {};
    const variationsRunningIndex: Record<string, number> = {};

    const evaluatedWeeks = PlannerProgram.evaluate(
      this.plannerProgram,
      this.settings.exercises,
      this.settings.equipment
    );

    let variationsDayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          for (const exercise of day.data) {
            const key = this.exerciseKey(exercise);
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

    const plannerWeeks: IPlannerProgramWeek[] = [];
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
          const key = `${label || ""}-${name || ""}-${programExercise.exerciseType.equipment || "bodyweight"}`;
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
        setStr += set.weightExpr ? ` ${set.weightExpr}` : "";
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

  //   const programDays: IProgramDay[] = [];
  //   const programWeeks: IProgramWeek[] = [];
  //   const programExercises: Record<string, IProgramExercise> = {};
  //   for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
  //     const week = evaluatedWeeks[weekIndex];
  //     const plannerWeek = this.plannerProgram.weeks[weekIndex];
  //     const programWeek: IProgramWeek = { id: UidFactory.generateUid(8), name: plannerWeek.name, days: [] };
  //     for (let dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
  //       const day = week[dayIndex];
  //       const plannerDay = plannerWeek.days[dayIndex];
  //       const programDay: IProgramDay = { id: UidFactory.generateUid(8), name: plannerDay.name, exercises: [] };
  //       if (day.success) {
  //         for (const evalExercise of day.data) {
  //           const key = this.exerciseKey(evalExercise);
  //           const exercise = Exercise.findByName(evalExercise.name, this.settings.exercises);
  //           if (!exercise) {
  //             throw new Error(`Exercise not found: ${evalExercise.name}`);
  //           }
  //           const programExercise: IProgramExercise = programExercises[key] || {
  //             descriptions: [""],
  //             exerciseType: { id: exercise.id, equipment: evalExercise.equipment || "bodyweight" },
  //             name: key,
  //             id: UidFactory.generateUid(8),
  //             state: {},
  //             variations: [],
  //             variationExpr: "day",
  //             descriptionExpr: "day",
  //             finishDayExpr: "",
  //           };
  //           programExercises[key] = programExercise;
  //           const newVariation = {
  //             sets: evalExercise.sets
  //               .map((set: IPlannerProgramExerciseSet) => {
  //                 const sets: IProgramSet[] = [];
  //                 if (set.repRange != null) {
  //                   const range = set.repRange;
  //                   let weightExpr: string = "";
  //                   if (set.weight) {
  //                     weightExpr = `${set.weight.value}${set.weight.unit}`;
  //                   } else if (set.percentage) {
  //                     weightExpr = `rm1${set.percentage !== 100 ? ` * ${set.percentage / 100}` : ""}`;
  //                   } else {
  //                     const rpe = set.rpe || 10;
  //                     weightExpr = `rm1 * rpeMultiplier(${set.repRange.maxrep}${rpe < 10 ? `, ${rpe}` : ""})`;
  //                   }
  //                   for (let i = 0; i < range.numberOfSets; i++) {
  //                     sets.push({
  //                       repsExpr: `${range.maxrep}`,
  //                       minRepsExpr: range.maxrep === range.minrep ? undefined : `${range.minrep}`,
  //                       weightExpr,
  //                       isAmrap: range.isAmrap,
  //                       logRpe: set.logRpe,
  //                       rpeExpr: set.rpe ? `${set.rpe}` : undefined,
  //                     });
  //                   }
  //                 }
  //                 return sets;
  //               })
  //               .flat(),
  //           };
  //           programExercise.variations.push(newVariation);
  //           programDay.exercises.push(programExercise);
  //         }
  //       }
  //       programDays.push(programDay);
  //       programWeek.days.push(programDay);
  //     }
  //     programWeeks.push(programWeek);
  //   }

  //   const program: IProgram = {
  //     id: this.program.id,
  //     name: this.plannerProgram.name,
  //     description: "Generated from a Workout Planner",
  //     url: "",
  //     author: "",
  //     nextDay: 1,
  //     exercises: ObjectUtils.values(programExercises),
  //     days: programDays,
  //     weeks: programWeeks,
  //     isMultiweek: true,
  //     tags: [],
  //   };
  //   return program;
  // }
}
