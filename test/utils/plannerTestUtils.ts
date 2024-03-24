import { PlannerToProgram } from "../../src/models/plannerToProgram";
import { Program } from "../../src/models/program";
import { Settings } from "../../src/models/settings";
import { PlannerProgram } from "../../src/pages/planner/models/plannerProgram";
import { IProgram, ISettings, IPlannerProgram } from "../../src/types";
import { UidFactory } from "../../src/utils/generator";

export interface ICompletedEntries {
  completedReps: number[][];
}

export class PlannerTestUtils {
  public static finish(
    text: string,
    completed: ICompletedEntries,
    settings: ISettings = Settings.build()
  ): { program: IProgram } {
    const planner: IPlannerProgram = { name: "MyProgram", weeks: PlannerProgram.evaluateText(text) };
    const program = new PlannerToProgram(UidFactory.generateUid(8), 1, [], planner, settings).convertToProgram();
    const nextHistoryRecord = Program.nextProgramRecord(program, settings);
    for (let entryIndex = 0; entryIndex < completed.completedReps.length; entryIndex++) {
      for (let setIndex = 0; setIndex < completed.completedReps[entryIndex].length; setIndex++) {
        const set = nextHistoryRecord.entries?.[entryIndex]?.sets[setIndex];
        const completedReps = completed.completedReps?.[entryIndex]?.[setIndex];
        if (set != null && completedReps != null) {
          set.completedReps = completedReps;
        }
      }
    }
    const { program: newProgram } = Program.runAllFinishDayScripts(program, nextHistoryRecord, settings);
    return { program: newProgram };
  }
}
