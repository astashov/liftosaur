/* eslint-disable @typescript-eslint/no-explicit-any */

import { CollectionUtils } from "../utils/collection";
import { History } from "../models/history";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { IStorage, IExerciseId } from "../types";
import { Weight } from "../models/weight";

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
  "20210130224533_add_settings_graphs": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    const historyExercises = ObjectUtils.keys(History.findAllMaxSets(storage.history));
    const exerciseIds: IExerciseId[] = ["squat", "benchPress", "overheadPress", "deadlift"];
    const graphs: IExerciseId[] = [];
    for (const exerciseId of exerciseIds) {
      if (historyExercises.indexOf(exerciseId) !== -1) {
        graphs.push(exerciseId);
      }
    }
    (storage as any).settings.graphs = storage.settings.graphs || graphs;
    return storage;
  },
  "20210222215108_add_stats": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.statsEnabled = storage.settings.statsEnabled || {
      weight: {
        weight: true,
      },
      length: {
        chest: true,
        shoulders: true,
        bicepLeft: true,
        bicepRight: true,
        waist: true,
        thighLeft: true,
        thighRight: true,
      },
    };
    storage.settings.lengthUnits = storage.settings.lengthUnits || "in";
    storage.settings.graphs = storage.settings.graphs.map((g: any) =>
      typeof g === "string" ? { type: "exercise", id: g } : g
    );
    (storage as any).stats = storage.stats || { weight: {}, length: {} };
    return storage;
  },
  "20210626192422_add_settings_exercises": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.exercises = storage.settings.exercises || {};
    return storage;
  },
  "20210724165526_add_settings_show_friends_history": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.shouldShowFriendsHistory =
      storage.settings.shouldShowFriendsHistory == null ? true : storage.settings.shouldShowFriendsHistory;
    return storage;
  },
  "20220807182403_migrate_plates_to_new_format": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const anyStorage: any = JSON.parse(JSON.stringify(aStorage));
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.equipment = {
      barbell: {
        multiplier: 2,
        bar: {
          lb: anyStorage.settings.bars.lb.barbell,
          kg: anyStorage.settings.bars.kg.barbell,
        },
        plates: anyStorage.settings.plates,
        fixed: [],
        isFixed: false,
      },
      trapbar: {
        multiplier: 2,
        bar: {
          lb: anyStorage.settings.bars.lb.barbell,
          kg: anyStorage.settings.bars.kg.barbell,
        },
        plates: anyStorage.settings.plates,
        fixed: [],
        isFixed: false,
      },
      smith: {
        multiplier: 2,
        bar: {
          lb: anyStorage.settings.bars.lb.barbell,
          kg: anyStorage.settings.bars.kg.barbell,
        },
        plates: anyStorage.settings.plates,
        fixed: [],
        isFixed: false,
      },
      dumbbell: {
        multiplier: 2,
        bar: {
          lb: anyStorage.settings.bars.lb.dumbbell,
          kg: anyStorage.settings.bars.kg.dumbbell,
        },
        plates: anyStorage.settings.plates,
        fixed: [
          Weight.build(10, "lb"),
          Weight.build(15, "lb"),
          Weight.build(20, "lb"),
          Weight.build(25, "lb"),
          Weight.build(30, "lb"),
          Weight.build(35, "lb"),
          Weight.build(40, "lb"),
          Weight.build(4, "kg"),
          Weight.build(6, "kg"),
          Weight.build(8, "kg"),
          Weight.build(10, "kg"),
          Weight.build(12, "kg"),
          Weight.build(14, "kg"),
          Weight.build(20, "kg"),
        ],
        isFixed: false,
      },
      ezbar: {
        multiplier: 2,
        bar: {
          lb: anyStorage.settings.bars.lb.ezbar,
          kg: anyStorage.settings.bars.kg.ezbar,
        },
        plates: anyStorage.settings.plates,
        fixed: [],
        isFixed: false,
      },
      cable: {
        multiplier: 1,
        bar: {
          lb: Weight.build(0, "lb"),
          kg: Weight.build(0, "kg"),
        },
        plates: [{ weight: Weight.build(10, "lb"), num: 20 }],
        fixed: [],
        isFixed: false,
      },
      kettlebell: {
        multiplier: 1,
        bar: {
          lb: Weight.build(0, "lb"),
          kg: Weight.build(0, "kg"),
        },
        plates: [],
        fixed: [
          Weight.build(10, "lb"),
          Weight.build(15, "lb"),
          Weight.build(20, "lb"),
          Weight.build(25, "lb"),
          Weight.build(30, "lb"),
          Weight.build(35, "lb"),
          Weight.build(40, "lb"),
          Weight.build(4, "kg"),
          Weight.build(8, "kg"),
          Weight.build(12, "kg"),
          Weight.build(16, "kg"),
          Weight.build(24, "kg"),
        ],
        isFixed: true,
      },
    };
    delete (storage.settings as any).bars;
    delete (storage.settings as any).plates;

    return storage;
  },
};
