import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import {
  IPlannerProgram,
  IProgram,
  IProgramExercise,
  ISettings,
  IProgramSet,
  IProgramDay,
  IProgramWeek,
  IProgramExerciseVariation,
} from "../types";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { Exercise } from "./exercise";
import { IProgramState } from "../types";
import { Weight } from "./weight";
import { MathUtils } from "../utils/math";

export class PlannerToProgram2 {
  constructor(
    private readonly programId: string,
    private readonly plannerProgram: IPlannerProgram,
    private readonly settings: ISettings
  ) {}

  public static plannerExerciseKey(exercise: IPlannerProgramExercise): string {
    return `${exercise.label || ""}-${exercise.name}-${exercise.equipment || "bodyweight"}`;
  }

  public convertToProgram(): IProgram {
    const evaluatedWeeks = PlannerProgram.evaluate(this.plannerProgram, this.settings);
    const isValid = evaluatedWeeks.every((week) => week.every((day) => day.success));

    if (!isValid) {
      throw new Error("Invalid program");
    }

    const programDays: IProgramDay[] = [];
    const programWeeks: IProgramWeek[] = [];
    const programExercises: Record<string, IProgramExercise> = {};
    let dayIndex = 0;
    const variationIndexes: Record<string, Record<string, { count: number; current: number }>> = {};
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
            const key = PlannerToProgram2.plannerExerciseKey(evalExercise);
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
            const state: IProgramState = {};
            let finishDayExpr = programExercise.finishDayExpr;
            for (const property of evalExercise.properties) {
              if (property.name === "progress") {
                if (property.fnName === "custom") {
                  for (const value of property.fnArgs) {
                    const [fnArgKey, fnArgValStr] = value.split(":").map((v) => v.trim());
                    const fnArgVal = fnArgValStr.match(/(lb|kg)/)
                      ? Weight.parse(fnArgValStr)
                      : MathUtils.roundFloat(parseFloat(fnArgValStr), 2);
                    state[fnArgKey] = fnArgVal ?? 0;
                  }
                  finishDayExpr = property.script ?? "";
                }
              }
            }
            programExercise.variations = programExercise.variations.concat(newVariations);
            programExercise.state = state;
            programExercise.finishDayExpr = finishDayExpr;
            programExercise.enableRpe = programExercise.variations.some((v) =>
              v.sets.some((s) => s.rpeExpr != null || !!s.logRpe)
            );
            programExercise.enableRepRanges = programExercise.variations.some((v) =>
              v.sets.some((s) => s.minRepsExpr != null)
            );
            programDay.exercises.push({ id: programExercise.id });
          }
        }
        programDays.push(programDay);
        programWeek.days.push({ id: programDay.id });
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
            const expr = `day == ${parseInt(di, 10) + 1} ? ${index + variationIndex[di].current + 1} : `;
            index += variationIndex[di].count;
            return expr;
          })
          .join("") + "1";
    }

    const program: IProgram = {
      id: this.programId,
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
      planner: this.plannerProgram,
    };
    return program;
  }
}
