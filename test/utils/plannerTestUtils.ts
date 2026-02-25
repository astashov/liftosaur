import {
  Program_create,
  Program_evaluate,
  Program_applyEvaluatedProgram,
  Program_nextHistoryRecord,
  Program_runAllFinishDayScripts,
} from "../../src/models/program";
import { Settings_build } from "../../src/models/settings";
import { PlannerProgram } from "../../src/pages/planner/models/plannerProgram";
import { IProgram, ISettings, IPlannerProgram, IExerciseType, IStats } from "../../src/types";
import { IWeightChange, ProgramExercise_weightChanges } from "../../src/models/programExercise";
import { PlannerKey } from "../../src/pages/planner/plannerKey";
import { Stats_getEmpty } from "../../src/models/stats";

export interface ICompletedEntries {
  completedReps: number[][];
}

export class PlannerTestUtils {
  public static get(text: string): { program: IProgram; planner: IPlannerProgram } {
    const planner: IPlannerProgram = { vtype: "planner", name: "MyProgram", weeks: PlannerProgram.evaluateText(text) };
    const program: IProgram = { ...Program_create("MyProgram"), planner };
    return { program, planner };
  }

  public static changeWeight(programText: string, cb: (weightChanges: IWeightChange[]) => IWeightChange[]): string {
    const { program } = PlannerTestUtils.get(programText);
    const settings = Settings_build();
    const evaluatedProgram = Program_evaluate(program, settings);
    const programExercise = evaluatedProgram.weeks[0].days[0].exercises[0];
    const weightChanges = ProgramExercise_weightChanges(evaluatedProgram, programExercise.key);
    const newWeightChanges = cb(weightChanges);
    const newEvaluatedProgram = PlannerProgram.replaceWeight(evaluatedProgram, programExercise.key, newWeightChanges);
    const newProgram = Program_applyEvaluatedProgram(program, newEvaluatedProgram, settings);
    return PlannerProgram.generateFullText(newProgram.planner?.weeks || []);
  }

  public static changeExercise(programText: string, oldExercise: string, newExercise: IExerciseType): string {
    const { program } = PlannerTestUtils.get(programText);
    const settings = Settings_build();
    const key = PlannerKey.fromFullName(oldExercise, settings.exercises);
    const result = PlannerProgram.replaceAndValidateExercise(program, key, newExercise, settings);
    if (result.success) {
      return PlannerProgram.generateFullText(result.data.planner?.weeks || []);
    } else {
      throw result.error;
    }
  }

  public static finish(
    text: string,
    completed: ICompletedEntries,
    settings: ISettings = Settings_build(),
    stats: IStats = Stats_getEmpty(),
    dayIndex?: number
  ): { program: IProgram } {
    const { program } = PlannerTestUtils.get(text);
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
}
