import { PlannerToProgram } from "../../src/models/plannerToProgram";
import { Program } from "../../src/models/program";
import { Settings } from "../../src/models/settings";
import { PlannerProgram } from "../../src/pages/planner/models/plannerProgram";
import { IProgram, ISettings, IPlannerProgram, IExerciseType } from "../../src/types";
import { UidFactory } from "../../src/utils/generator";
import { IWeightChange, ProgramExercise } from "../../src/models/programExercise";
import { CollectionUtils } from "../../src/utils/collection";
import { ProgramToPlanner } from "../../src/models/programToPlanner";
import { PlannerKey } from "../../src/pages/planner/plannerKey";

export interface ICompletedEntries {
  completedReps: number[][];
}

export class PlannerTestUtils {
  public static get(
    text: string,
    settings: ISettings = Settings.build()
  ): { program: IProgram; planner: IPlannerProgram } {
    const planner: IPlannerProgram = { name: "MyProgram", weeks: PlannerProgram.evaluateText(text) };
    const program = new PlannerToProgram(UidFactory.generateUid(8), 1, planner, settings).convertToProgram();
    return { program, planner };
  }

  public static changeWeight(programText: string, cb: (weightChanges: IWeightChange[]) => IWeightChange[]): string {
    const { planner, program } = PlannerTestUtils.get(programText);
    const programExercise = program.exercises[0];
    const dayData = { week: 1, day: 1, dayInWeek: 1 };
    const settings = Settings.build();
    const weightChanges = ProgramExercise.weightChanges(dayData, programExercise, program.exercises, settings);
    const newWeightChanges = cb(weightChanges);
    const newProgramExercise = PlannerProgram.replaceWeight(programExercise, newWeightChanges);
    const newProgram = {
      ...program,
      exercises: CollectionUtils.setBy(program.exercises, "id", programExercise.id, newProgramExercise),
    };
    const newPlanner = new ProgramToPlanner(newProgram, planner, settings, {}, {}).convertToPlanner();
    newProgram.planner = newPlanner;
    return PlannerProgram.generateFullText(newPlanner.weeks);
  }

  public static changeExercise(programText: string, oldExercise: string, newExercise: IExerciseType): string {
    const { planner } = PlannerTestUtils.get(programText);
    const settings = Settings.build();
    const key = PlannerKey.fromFullName(oldExercise, settings);
    const result = PlannerProgram.replaceExercise(planner, key, newExercise, settings);
    if (result.success) {
      return PlannerProgram.generateFullText(result.data.weeks);
    } else {
      throw result.error;
    }
  }

  public static finish(
    text: string,
    completed: ICompletedEntries,
    settings: ISettings = Settings.build()
  ): { program: IProgram } {
    const { program } = PlannerTestUtils.get(text, settings);
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
