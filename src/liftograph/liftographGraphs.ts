import { equipmentName, Exercise_get } from "../models/exercise";
import { IExerciseSelectedType, IExerciseType, IGraphMuscleGroupSelectedType, ISettings } from "../types";
import { ILiftographWidget } from "./liftographCompile";
import { LiftographWrite_quote } from "./liftographWrite";
import { ILiftographStatsKey } from "./liftographRows";
import { ILiftographSeriesEval, LiftographSeriesEval_compile } from "./liftographSeriesEval";

export type ILiftographGraphWidget = Extract<ILiftographWidget, { kind: "graph" }>;

export function LiftographGraphs_widget(
  evaluation: ILiftographSeriesEval,
  text: string
): ILiftographGraphWidget | undefined {
  const widget = LiftographSeriesEval_compile(evaluation, text).layout[0]?.items[0];
  return widget?.kind === "graph" ? widget : undefined;
}

export function LiftographGraphs_exerciseSource(exerciseType: IExerciseType, settings: ISettings): string {
  const exercise = Exercise_get(exerciseType, settings.exercises);
  const args = [LiftographWrite_quote(exercise.name)];
  if (exerciseType.equipment != null) {
    args.push(LiftographWrite_quote(equipmentName(exerciseType.equipment)));
  }
  return `exercise(${args.join(", ")})`;
}

export function LiftographGraphs_exerciseDocument(
  source: string,
  selectedType: IExerciseSelectedType,
  isWithOneRm: boolean,
  isWithBodyweight: boolean = false
): string {
  const lines = ["graph {"];
  if (selectedType === "volume") {
    lines.push(`  name: Volume / source: ${source} / y: volume`);
  } else {
    lines.push(`  name: Weight / source: ${source} / y: maxWeight`);
    if (isWithOneRm) {
      lines.push(`  name: e1RM / source: ${source} / y: e1rm`);
    }
    if (isWithBodyweight) {
      lines.push("  name: Bodyweight / source: stats(weight) / axis: right");
    }
  }
  lines.push("}");
  return lines.join("\n");
}

export function LiftographGraphs_muscleGroupDocument(group: string, metric?: IGraphMuscleGroupSelectedType): string {
  const lines = ["graph {"];
  if (metric !== "sets") {
    lines.push(`  name: Volume / source: workout / y: muscleVolume(${group}) / group: sum(1w)`);
  }
  if (metric !== "volume") {
    lines.push(`  name: Sets / source: workout / y: muscleSets(${group}) / group: sum(1w)`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function LiftographGraphs_statsDocument(key: ILiftographStatsKey, movingAverageWindowSize?: number): string {
  const lines = ["graph {", `  name: Value / source: stats(${key})`];
  if (movingAverageWindowSize != null) {
    lines.push(`  name: Average / source: stats(${key}) / smooth: avg(${movingAverageWindowSize})`);
  }
  lines.push("}");
  return lines.join("\n");
}
