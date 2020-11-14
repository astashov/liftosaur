/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProgramModel } from "../models/program";

export const migrations = {
  "20201111073526_rename_exercise_bar_to_exercise_equipment": async (): Promise<void> => {
    const version = 20201111073526;
    const programs = (await ProgramModel.getAll())
      .filter((p) => p.version == null || p.version < version)
      .map((p) => p.program);
    for (const program of programs) {
      for (const exercise of program.exercises) {
        if ("bar" in (exercise as any).exerciseType) {
          exercise.exerciseType.equipment = (exercise as any).exerciseType.bar;
          delete (exercise as any).exerciseType.bar;
        }
      }
    }
    await ProgramModel.storeAll(programs, version);
  },
};
