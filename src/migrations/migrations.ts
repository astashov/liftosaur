/* eslint-disable @typescript-eslint/no-explicit-any */

import { CollectionUtils } from "../utils/collection";
import { IStorage } from "../models/state";
import { UidFactory } from "../utils/generator";

let latestMigrationVersion: number | undefined;
export function getLatestMigrationVersion(): string {
  if (latestMigrationVersion == null) {
    latestMigrationVersion = CollectionUtils.sort(
      Object.keys(migrations).map((v) => parseInt(v, 10)),
      (a, b) => b - a
    )[0];
  }
  return latestMigrationVersion.toString();
}

export const migrations = {
  "20200929231430_add_helps_to_storage": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: any = JSON.parse(JSON.stringify(aStorage));
    storage.helps = [];
    return storage;
  },
  "20201111073526_rename_exercise_bar_to_exercise_equipment": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const historyRecord of storage.history) {
      for (const entry of historyRecord.entries) {
        if ("bar" in (entry as any).exercise) {
          entry.exercise.equipment = (entry as any).exercise.bar;
          delete (entry as any).exercise.bar;
        }
      }
    }
    for (const program of storage.programs) {
      for (const exercise of program.exercises) {
        if ("bar" in (exercise as any).exerciseType) {
          exercise.exerciseType.equipment = (exercise as any).exerciseType.bar;
          delete (exercise as any).exerciseType.bar;
        }
      }
    }
    return storage;
  },
  "20210125164435_add_temp_user_id": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    (storage as any).tempUserId = storage.tempUserId || UidFactory.generateUid(10);
    return storage;
  },
};
