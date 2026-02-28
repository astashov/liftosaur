import {
  Program_create,
  Program_evaluate,
  Program_applyEvaluatedProgram,
  Program_nextHistoryRecord,
  Program_runAllFinishDayScripts,
} from "../../src/models/program";
import { Settings_build } from "../../src/models/settings";
import {
  PlannerProgram_evaluateText,
  PlannerProgram_replaceWeight,
  PlannerProgram_generateFullText,
  PlannerProgram_replaceAndValidateExercise,
} from "../../src/pages/planner/models/plannerProgram";
import { IProgram, ISettings, IPlannerProgram, IExerciseType, IStats } from "../../src/types";
import { IWeightChange, ProgramExercise_weightChanges } from "../../src/models/programExercise";
import { PlannerKey_fromFullName } from "../../src/pages/planner/plannerKey";
import { Stats_getEmpty } from "../../src/models/stats";

export interface ICompletedEntries {
  completedReps: number[][];
}

export function PlannerTestUtils_get(text: string): { program: IProgram; planner: IPlannerProgram } {
  const planner: IPlannerProgram = { vtype: "planner", name: "MyProgram", weeks: PlannerProgram_evaluateText(text) };
  const program: IProgram = { ...Program_create("MyProgram"), planner };
  return { program, planner };
}

export function PlannerTestUtils_changeWeight(
  programText: string,
  cb: (weightChanges: IWeightChange[]) => IWeightChange[]
): string {
  const { program } = PlannerTestUtils_get(programText);
  const settings = Settings_build();
  const evaluatedProgram = Program_evaluate(program, settings);
  const programExercise = evaluatedProgram.weeks[0].days[0].exercises[0];
  const weightChanges = ProgramExercise_weightChanges(evaluatedProgram, programExercise.key);
  const newWeightChanges = cb(weightChanges);
  const newEvaluatedProgram = PlannerProgram_replaceWeight(evaluatedProgram, programExercise.key, newWeightChanges);
  const newProgram = Program_applyEvaluatedProgram(program, newEvaluatedProgram, settings);
  return PlannerProgram_generateFullText(newProgram.planner?.weeks || []);
}

export function PlannerTestUtils_changeExercise(
  programText: string,
  oldExercise: string,
  newExercise: IExerciseType
): string {
  const { program } = PlannerTestUtils_get(programText);
  const settings = Settings_build();
  const key = PlannerKey_fromFullName(oldExercise, settings.exercises);
  const result = PlannerProgram_replaceAndValidateExercise(program, key, newExercise, settings);
  if (result.success) {
    return PlannerProgram_generateFullText(result.data.planner?.weeks || []);
  } else {
    throw result.error;
  }
}

export function PlannerTestUtils_finish(
  text: string,
  completed: ICompletedEntries,
  settings: ISettings = Settings_build(),
  stats: IStats = Stats_getEmpty(),
  dayIndex?: number
): { program: IProgram } {
  const { program } = PlannerTestUtils_get(text);
  const nextHistoryRecord = Program_nextHistoryRecord(program, settings, Stats_getEmpty(), dayIndex);
  for (let entryIndex = 0; entryIndex < completed.completedReps.length; entryIndex++) {
    for (let setIndex = 0; setIndex < completed.completedReps[entryIndex].length; setIndex++) {
      const set = nextHistoryRecord.entries?.[entryIndex]?.sets[setIndex];
      const completedReps = completed.completedReps?.[entryIndex]?.[setIndex];
      if (set != null && completedReps != null) {
        set.completedReps = completedReps;
        set.completedWeight = set.weight;
        set.isCompleted = true;
      }
    }
  }
  const { program: newProgram } = Program_runAllFinishDayScripts(program, nextHistoryRecord, stats, settings);
  return { program: newProgram };
}
