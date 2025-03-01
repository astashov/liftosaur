import { Program } from "../../src/models/program";
import { Settings } from "../../src/models/settings";
import { PlannerProgram } from "../../src/pages/planner/models/plannerProgram";
import { IProgram, ISettings, IPlannerProgram, IExerciseType } from "../../src/types";
import { IWeightChange, ProgramExercise } from "../../src/models/programExercise";
import { PlannerKey } from "../../src/pages/planner/plannerKey";

export interface ICompletedEntries {
  completedReps: number[][];
}

export class PlannerTestUtils {
  public static get(text: string): { program: IProgram; planner: IPlannerProgram } {
    const planner = { name: "MyProgram", weeks: PlannerProgram.evaluateText(text) };
    const program: IProgram = { ...Program.create("MyProgram"), planner };
    return { program, planner };
  }

  public static changeWeight(programText: string, cb: (weightChanges: IWeightChange[]) => IWeightChange[]): string {
    const { program } = PlannerTestUtils.get(programText);
    const settings = Settings.build();
    const evaluatedProgram = Program.evaluate(program, settings);
    const programExercise = evaluatedProgram.weeks[0].days[0].exercises[0];
    const weightChanges = ProgramExercise.weightChanges(programExercise);
    const newWeightChanges = cb(weightChanges);
    const newEvaluatedProgram = PlannerProgram.replaceWeight(evaluatedProgram, programExercise.key, newWeightChanges);
    const newProgram = Program.applyEvaluatedProgram(program, newEvaluatedProgram, settings);
    return PlannerProgram.generateFullText(newProgram.planner?.weeks || []);
  }

  public static changeExercise(programText: string, oldExercise: string, newExercise: IExerciseType): string {
    const { program } = PlannerTestUtils.get(programText);
    const settings = Settings.build();
    const key = PlannerKey.fromFullName(oldExercise, settings);
    const result = PlannerProgram.replaceExercise(program, key, newExercise, settings);
    if (result.success) {
      return PlannerProgram.generateFullText(result.data.planner?.weeks || []);
    } else {
      throw result.error;
    }
  }

  public static finish(
    text: string,
    completed: ICompletedEntries,
    settings: ISettings = Settings.build()
  ): { program: IProgram } {
    const { program } = PlannerTestUtils.get(text);
    const nextHistoryRecord = Program.nextHistoryRecord(program, settings);
    for (let entryIndex = 0; entryIndex < completed.completedReps.length; entryIndex++) {
      for (let setIndex = 0; setIndex < completed.completedReps[entryIndex].length; setIndex++) {
        const set = nextHistoryRecord.entries?.[entryIndex]?.sets[setIndex];
        const completedReps = completed.completedReps?.[entryIndex]?.[setIndex];
        if (set != null && completedReps != null) {
          set.completedReps = completedReps;
        }
      }
    }
    const evaluatedProgram = Program.evaluate(program, settings);
    const { program: newProgram } = Program.runAllFinishDayScripts(
      program,
      evaluatedProgram,
      nextHistoryRecord,
      settings
    );
    return { program: newProgram };
  }
}
