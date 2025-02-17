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
  IWeight,
} from "../types";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { Exercise } from "./exercise";
import { IProgramState, IProgramExerciseWarmupSet, IProgramStateMetadata } from "../types";
import { Weight } from "./weight";
import { MathUtils } from "../utils/math";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { CollectionUtils } from "../utils/collection";
import { PlannerKey } from "../pages/planner/plannerKey";
import { PlannerExerciseEvaluator, PlannerSyntaxError } from "../pages/planner/plannerExerciseEvaluator";

export class PlannerToProgram {
  constructor(
    private readonly programId: string,
    private readonly nextDay: number,
    private readonly plannerProgram: IPlannerProgram,
    private readonly settings: ISettings
  ) {}

  public static fnArgsToState(
    fnArgs: string[]
  ): {
    state: IProgramState;
    metadata: IProgramStateMetadata;
  } {
    const state: IProgramState = {};
    const metadata: IProgramStateMetadata = {};
    for (const value of fnArgs) {
      // eslint-disable-next-line prefer-const
      let [fnArgKey, fnArgValStr] = value.split(":").map((v) => v.trim());
      if (fnArgKey.endsWith("+")) {
        fnArgKey = fnArgKey.replace("+", "");
        metadata[fnArgKey] = { userPrompted: true };
      }
      const fnArgVal = fnArgValStr.match(/(lb|kg)/)
        ? Weight.parse(fnArgValStr)
        : fnArgValStr.match(/%/)
        ? Weight.buildPct(parseFloat(fnArgValStr))
        : MathUtils.roundFloat(parseFloat(fnArgValStr), 2);
      state[fnArgKey] = fnArgVal ?? 0;
    }
    return { metadata, state };
  }

  public convertToProgram(): IProgram {
    const { evaluatedWeeks } = PlannerProgram.evaluate(this.plannerProgram, this.settings);
    let error: PlannerSyntaxError | undefined;
    for (const week of evaluatedWeeks) {
      for (const day of week) {
        if (!day.success) {
          error = day.error;
        }
      }
    }
    const isValid = !error;

    if (!isValid) {
      console.log(this.plannerProgram.name);
      console.log(PlannerProgram.generateFullText(this.plannerProgram.weeks));
      console.log(evaluatedWeeks);
      console.error(error);
      throw error;
    }

    const programDays: IProgramDay[] = [];
    const programWeeks: IProgramWeek[] = [];
    const keyToProgramExercise: Record<string, IProgramExercise> = {};
    const keyToProgramExerciseId: Record<string, string> = {};
    let dayIndex = 0;
    const variationIndexes: Record<string, Record<string, { count: number; current: number }>> = {};
    const descriptionIndexes: Record<string, Record<string, { count: number; current: number }>> = {};
    const lastDayDescriptions: Partial<Record<number, string>> = {};
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      const plannerWeek = this.plannerProgram.weeks[weekIndex];
      const programWeek: IProgramWeek = {
        id: UidFactory.generateUid(8),
        name: plannerWeek.name,
        days: [],
        description: plannerWeek.description,
      };
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        const plannerDay = plannerWeek.days[dayInWeekIndex];
        if (plannerDay.description != null) {
          lastDayDescriptions[dayInWeekIndex] = plannerDay.description;
        }
        const programDay: IProgramDay = {
          id: UidFactory.generateUid(8),
          name: plannerDay.name,
          exercises: [],
          description: plannerDay.description != null ? plannerDay.description : lastDayDescriptions[dayInWeekIndex],
        };
        if (day.success) {
          for (const evalExercise of CollectionUtils.sortBy(day.data, "order")) {
            const key = PlannerKey.fromPlannerExercise(evalExercise, this.settings);
            const exercise = Exercise.findByName(evalExercise.name, this.settings.exercises);
            if (!exercise) {
              throw new Error(`Exercise not found: ${evalExercise.name}`);
            }
            let programExercise: IProgramExercise;
            if (keyToProgramExercise[key]) {
              programExercise = keyToProgramExercise[key];
            } else {
              const name = `${evalExercise.label ? `${evalExercise.label}: ` : ""}${evalExercise.name}`;
              const exerciseType = { id: exercise.id, equipment: evalExercise.equipment || exercise.defaultEquipment };
              const id = key;
              programExercise = {
                descriptions: [""],
                exerciseType,
                name,
                id,
                state: {},
                variations: [],
                variationExpr: "",
                descriptionExpr: "",
                finishDayExpr: "",
              };
            }
            keyToProgramExercise[key] = programExercise;
            keyToProgramExerciseId[key] = programExercise.id;
            const newVariations: IProgramExerciseVariation[] = PlannerProgramExercise.setVariations(evalExercise).map(
              (setVariation, setVarIndex) => {
                let isQuickAddSets = false;
                const sets: IProgramSet[] = [];
                for (const set of PlannerProgramExercise.sets(evalExercise, setVarIndex)) {
                  if (set.repRange != null) {
                    const range = set.repRange;
                    isQuickAddSets = isQuickAddSets || !!set.repRange?.isQuickAddSet;
                    let weightExpr: string = "";
                    if (set.weight) {
                      weightExpr = `${set.weight.value}${set.weight.unit}`;
                    } else if (set.percentage) {
                      weightExpr = `${set.percentage}%`;
                    } else {
                      const rpe = set.rpe || 10;
                      weightExpr = `${MathUtils.roundFloat(Weight.rpeMultiplier(set.repRange.maxrep, rpe) * 100, 2)}%`;
                    }
                    for (let i = 0; i < range.numberOfSets; i++) {
                      sets.push({
                        repsExpr: `${range.maxrep}`,
                        minRepsExpr: range.maxrep === range.minrep ? undefined : `${range.minrep}`,
                        weightExpr,
                        isAmrap: range.isAmrap,
                        logRpe: set.logRpe,
                        askWeight: set.askWeight,
                        rpeExpr: set.rpe != null ? `${set.rpe}` : undefined,
                        timerExpr: set.timer != null ? `${set.timer}` : undefined,
                        label: set.label,
                      });
                    }
                  }
                }
                variationIndexes[key] = variationIndexes[key] || {};
                variationIndexes[key][dayIndex] = variationIndexes[key][dayIndex] || { count: 0, current: 0 };
                variationIndexes[key][dayIndex].count += 1;
                if (setVariation.isCurrent) {
                  variationIndexes[key][dayIndex].current = setVarIndex;
                }
                return { sets, quickAddSets: isQuickAddSets };
              }
            );
            const newDescriptions = evalExercise.descriptions.map((description, descriptionIndex) => {
              descriptionIndexes[key] = descriptionIndexes[key] || {};
              descriptionIndexes[key][dayIndex] = descriptionIndexes[key][dayIndex] || { count: 0, current: 0 };
              descriptionIndexes[key][dayIndex].count += 1;
              if (description.isCurrent) {
                descriptionIndexes[key][dayIndex].current = descriptionIndex;
              }
              return description.value;
            });
            let state: IProgramState = {};
            let metadata: IProgramStateMetadata = {};
            let finishDayExpr = programExercise.finishDayExpr;
            let updateDayExpr = programExercise.updateDayExpr;
            let warmupSets: IProgramExerciseWarmupSet[] | undefined = programExercise.warmupSets;
            if (PlannerProgramExercise.warmups(evalExercise)) {
              const sets: IProgramExerciseWarmupSet[] = [];
              for (const ws of PlannerProgramExercise.warmups(evalExercise) || []) {
                for (let i = 0; i < ws.numberOfSets; i += 1) {
                  let value: IWeight | number | undefined = ws.percentage ? ws.percentage / 100 : undefined;
                  if (value == null) {
                    value = ws.weight;
                  }
                  if (value == null) {
                    value = MathUtils.roundTo0005(Weight.rpeMultiplier(ws.reps, 4));
                  }
                  sets.push({
                    reps: ws.reps,
                    value,
                    threshold: Weight.build(0, this.settings.units),
                  });
                }
              }
              warmupSets = sets;
            }
            let reuseFinishDayScript: string | undefined;
            let reuseUpdateDayScript: string | undefined;
            for (const property of evalExercise.properties) {
              if (property.name === "progress") {
                ({ state, metadata, finishDayExpr, reuseFinishDayScript } = this.getProgress(
                  evalExercise,
                  property,
                  state,
                  metadata,
                  finishDayExpr
                ));
              }
              if (property.name === "update") {
                if (property.fnName === "custom") {
                  if (property.script) {
                    updateDayExpr = property.script ?? "";
                  } else if (property.body) {
                    reuseUpdateDayScript = property.body;
                  }
                }
              }
            }
            programExercise.variations = programExercise.variations.concat(newVariations);
            programExercise.tags = programExercise.tags || evalExercise.tags;
            programExercise.descriptions = programExercise.descriptions.concat(newDescriptions);
            programExercise.state = { ...programExercise.state, ...state };
            programExercise.stateMetadata = { ...programExercise.stateMetadata, ...metadata };
            programExercise.finishDayExpr = finishDayExpr;
            programExercise.updateDayExpr = updateDayExpr;
            programExercise.enableRpe = programExercise.variations.some((v) =>
              v.sets.some((s) => s.rpeExpr != null || !!s.logRpe)
            );
            programExercise.enableRepRanges = programExercise.variations.some((v) =>
              v.sets.some((s) => s.minRepsExpr != null)
            );
            programExercise.warmupSets = warmupSets;
            programExercise.reuseFinishDayScript = programExercise.reuseFinishDayScript || reuseFinishDayScript;
            programExercise.reuseUpdateDayScript = programExercise.reuseUpdateDayScript || reuseUpdateDayScript;
            if (!evalExercise.notused) {
              programDay.exercises.push({ id: programExercise.id });
            }
          }
        }
        programDays.push(programDay);
        programWeek.days.push({ id: programDay.id });
        dayIndex += 1;
      }
      programWeeks.push(programWeek);
    }

    const allExercises = ObjectUtils.values(keyToProgramExercise);
    for (const exerciseKey of Object.keys(keyToProgramExercise)) {
      const programExercise = keyToProgramExercise[exerciseKey];
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

      index = 0;
      const descriptionIndex = descriptionIndexes[exerciseKey];
      programExercise.descriptionExpr =
        ObjectUtils.keys(descriptionIndex || {})
          .map((di) => {
            const expr = `day == ${parseInt(di, 10) + 1} ? ${index + descriptionIndex[di].current + 2} : `;
            index += descriptionIndex[di].count;
            return expr;
          })
          .join("") + "1";

      const reuseFinishDayScript = programExercise.reuseFinishDayScript;
      if (reuseFinishDayScript) {
        programExercise.reuseFinishDayScript = this.labelKeyToExerciseId(reuseFinishDayScript, allExercises);
      }
      const reuseUpdateDayScript = programExercise.reuseUpdateDayScript;
      if (reuseUpdateDayScript) {
        programExercise.reuseUpdateDayScript = this.labelKeyToExerciseId(reuseUpdateDayScript, allExercises);
      }
    }

    const program: IProgram = {
      id: this.programId,
      name: this.plannerProgram.name,
      description: "Generated from a Workout Planner",
      url: "",
      author: "",
      nextDay: this.nextDay,
      exercises: ObjectUtils.values(keyToProgramExercise),
      days: programDays,
      weeks: programWeeks,
      isMultiweek: true,
      tags: [],
      planner: this.plannerProgram,
    };
    return program;
  }

  private labelKeyToExerciseId(key: string, allExercises: IProgramExercise[]): string | undefined {
    // eslint-disable-next-line prefer-const
    let { label, name, equipment } = PlannerExerciseEvaluator.extractNameParts(key, this.settings);
    if (equipment == null) {
      const exercise = Exercise.findByName(name, this.settings.exercises);
      equipment = exercise?.defaultEquipment;
    }
    const programExerciseName = [label, name].filter((p) => p).join(": ");
    const originalProgramExercise = allExercises.find(
      (e) =>
        e.name.toLowerCase() === programExerciseName.toLowerCase() &&
        (equipment == null || e.exerciseType.equipment === equipment)
    );
    return originalProgramExercise?.id;
  }

  private getProgress(
    evalExercise: IPlannerProgramExercise,
    property: IPlannerProgramProperty,
    state: IProgramState,
    metadata: IProgramStateMetadata,
    finishDayExpr: string
  ): {
    state: IProgramState;
    metadata: IProgramStateMetadata;
    finishDayExpr: string;
    reuseFinishDayScript: string | undefined;
  } {
    let reuseFinishDayScript;
    if (property.fnName === "custom") {
      const { state: newState, metadata: newMetadata } = PlannerToProgram.fnArgsToState(property.fnArgs);
      state = { ...state, ...newState };
      metadata = { ...metadata, ...newMetadata };
      if (property.script) {
        finishDayExpr = property.script ?? "";
        if (finishDayExpr) {
          finishDayExpr = this.applyProgressNone(finishDayExpr, evalExercise.skipProgress);
        }
      } else if (property.body) {
        reuseFinishDayScript = property.body;
      }
    } else if (property.fnName === "lp") {
      ({ state, finishDayExpr } = this.addLp(property, this.settings, evalExercise.skipProgress));
    } else if (property.fnName === "dp") {
      ({ state, finishDayExpr } = this.addDp(property, this.settings, evalExercise.skipProgress));
    } else if (property.fnName === "sum") {
      ({ state, finishDayExpr } = this.addSum(property, this.settings, evalExercise.skipProgress));
    }
    return { state, metadata, finishDayExpr, reuseFinishDayScript };
  }

  private applyProgressNone(script: string, skipProgress: IPlannerProgramExercise["skipProgress"]): string {
    if (skipProgress.length === 0) {
      return script;
    }
    const condition = skipProgress.map(({ week, day }) => `(week == ${week} && dayInWeek == ${day})`).join(" || ");
    return `// skip: ${JSON.stringify(
      skipProgress.map((sp) => [sp.week, sp.day])
    )}\nif (!(${condition})) {\n${script}\n}`;
  }

  private addLp(
    property: IPlannerProgramProperty,
    settings: ISettings,
    skipProgress: IPlannerProgramExercise["skipProgress"]
  ): { state: IProgramState; finishDayExpr: string } {
    const increment = property.fnArgs[0] ?? (settings.units === "kg" ? "2.5kg" : "5lb");
    const totalSuccesses = parseInt(property.fnArgs[1] ?? "1", 10);
    const currentSuccesses = parseInt(property.fnArgs[2] ?? "0", 10);
    const decrement = property.fnArgs[3] ?? (settings.units === "kg" ? "5kg" : "10lb");
    const totalFailures = parseInt(property.fnArgs[4] ?? "0", 10);
    const currentFailures = parseInt(property.fnArgs[5] ?? "0", 10);
    const state: IProgramState = {};
    state.successes = currentSuccesses;
    state.failures = currentFailures;
    let finishDayExpr = `// progress: lp(${increment}, ${totalSuccesses}, ${currentSuccesses}, ${decrement}, ${totalFailures}, ${currentFailures})\n`;
    if (totalSuccesses > 0) {
      finishDayExpr += `if (completedReps >= reps && completedRPE <= RPE) {
  state.successes += 1;
  if (state.successes >= ${totalSuccesses}) {
    weights += ${increment}
    state.successes = 0
    state.failures = 0
  }
}`;
    }
    if (totalFailures > 0) {
      finishDayExpr += `\nif (!(completedReps >= minReps && completedRPE <= RPE)) {
  state.failures += 1;
  if (state.failures >= ${totalFailures}) {
    weights -= ${decrement}
    state.failures = 0
    state.successes = 0
  }
}`;
    }
    finishDayExpr = this.applyProgressNone(finishDayExpr, skipProgress);
    return { state, finishDayExpr };
  }

  private addDp(
    property: IPlannerProgramProperty,
    settings: ISettings,
    skipProgress: IPlannerProgramExercise["skipProgress"]
  ): { state: IProgramState; finishDayExpr: string } {
    const increment = property.fnArgs[0] ?? (settings.units === "kg" ? "2.5kg" : "5lb");
    const minReps = parseInt(property.fnArgs[1], 10);
    const maxReps = parseInt(property.fnArgs[2], 10);
    let finishDayExpr = `// progress: ${property.fnName}(${property.fnArgs.join(", ")})\n`;
    finishDayExpr += `if (completedReps >= reps && completedRPE <= RPE) {
  if (reps[ns] < ${maxReps}) {
    reps += 1
  } else {
    reps = ${minReps}
    weights += ${increment}
  }
}`;
    finishDayExpr = this.applyProgressNone(finishDayExpr, skipProgress);
    return { state: {}, finishDayExpr };
  }

  private addSum(
    property: IPlannerProgramProperty,
    settings: ISettings,
    skipProgress: IPlannerProgramExercise["skipProgress"]
  ): { state: IProgramState; finishDayExpr: string } {
    const sumReps = parseInt(property.fnArgs[0], 10);
    const increment = property.fnArgs[1] ?? (settings.units === "kg" ? "2.5kg" : "5lb");
    let finishDayExpr = `// progress: ${property.fnName}(${property.fnArgs.join(", ")})\n`;
    finishDayExpr += `if (sum(completedReps) >= ${sumReps}) {
    weights += ${increment}
  }`;
    finishDayExpr = this.applyProgressNone(finishDayExpr, skipProgress);
    return { state: {}, finishDayExpr };
  }
}
