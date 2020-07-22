/* eslint-disable @typescript-eslint/no-explicit-any */

import { IStorage } from "../ducks/reducer";
import { lf } from "../utils/lens";
import { Service } from "../api/service";
import { CollectionUtils } from "../utils/collection";

let latestMigrationVersion: number | undefined;
export function getLatestMigrationVersion(): number {
  if (latestMigrationVersion == null) {
    latestMigrationVersion = CollectionUtils.sort(
      Object.keys(migrations).map((v) => parseInt(v, 10)),
      (a, b) => b - a
    )[0];
  }
  return latestMigrationVersion;
}

export const migrations = {
  "20200604235900_add_bar_weights": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    return lf(aStorage).p("settings").p("bars").set({
      barbell: 45,
      dumbbell: 10,
      ezbar: 20,
    });
  },
  "20200609000400_remove_old_amraps": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.history.forEach((record) => {
      record.entries.forEach((entry) => {
        entry.sets.forEach((set) => {
          if ((set.reps as unknown) === "amrap") {
            set.isAmrap = true;
            set.reps = 1;
          }
        });
      });
    });
    return storage;
  },
  "20200721221513_upgrade_to_new_programs": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    const storageAny: any = storage;

    const service = new Service(client);
    const programs = await service.programs();
    const usedPrograms = new Set<string>();
    for (const record of storage.history) {
      usedPrograms.add(record.programId);
    }
    storage.programs = [];
    for (const programId of usedPrograms) {
      const program = programs.find((p) => p.id === programId)!;
      delete (program as any).initialState;
      delete (program as any).isProgram2;
      storage.programs = storage.programs || [];
      if (storage.programs.findIndex((p) => p.id === programId) === -1) {
        storage.programs.push(program);
      }

      if (programId === "the5314b") {
        program.state.benchPressTM = storageAny.programStates.the5314b.main.benchPress.trainingMax;
        program.state.overheadPressTM = storageAny.programStates.the5314b.main.overheadPress.trainingMax;
        program.state.deadliftTM = storageAny.programStates.the5314b.main.deadlift.trainingMax;
        program.state.squatTM = storageAny.programStates.the5314b.main.squat.trainingMax;
      }
    }
    for (const historyRecord of storage.history) {
      if (historyRecord.programId === "the5314b") {
        historyRecord.day = historyRecord.day % 10;
      }
    }
    delete storageAny.programStates;

    return storage;
  },
};
