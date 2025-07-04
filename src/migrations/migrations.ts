/* eslint-disable @typescript-eslint/no-explicit-any */

import { CollectionUtils } from "../utils/collection";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { IStorage } from "../types";
import { Weight } from "../models/weight";
import { PlannerExerciseEvaluator } from "../pages/planner/plannerExerciseEvaluator";
import { basicBeginnerProgram } from "../programs/basicBeginnerProgram";

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
  "20240720152051_fix_null_entries_set_weights": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const historyRecord of storage.history) {
      for (const entry of historyRecord.entries) {
        for (const set of entry.sets) {
          if (set.weight?.value == null) {
            set.weight = Weight.build(0, storage.settings.units || "lb");
          }
        }
      }
    }
    return storage;
  },
  "20240906074315_add_original_weight_to_sets": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const historyRecord of storage.history) {
      for (const entry of historyRecord.entries) {
        for (const set of entry.sets) {
          set.originalWeight = ObjectUtils.clone(set.weight);
        }
        for (const set of entry.warmupSets) {
          set.originalWeight = ObjectUtils.clone(set.weight);
        }
      }
    }
    return storage;
  },
  "20241101192254_add_deleted_gyms": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.deletedGyms = storage.settings.deletedGyms || [];
    return storage;
  },
  "20241207120042_add_reminder_timer": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.timers.reminder = storage.settings.timers.reminder ?? 900;
    return storage;
  },
  "20250211073832_switch_to_planner_programs": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    const currentProgram = storage.programs.find((p) => p.id === storage.currentProgramId);
    if (currentProgram && currentProgram.planner == null) {
      const plannerProgram = storage.programs.find((p) => p.planner != null) || {
        ...basicBeginnerProgram,
        id: UidFactory.generateUid(8),
      };
      storage.programs.push(plannerProgram);
      storage.currentProgramId = plannerProgram.id;
      alert(`Old-style programs are not supported anymore, your current program now is '${plannerProgram.name}'`);
    }
    return storage;
  },
  "20250305183455_cleanup_custom_exercises": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const customExerciseKey of ObjectUtils.keys(storage.settings.exercises)) {
      const customExercise = storage.settings.exercises[customExerciseKey]!;
      delete customExercise.defaultEquipment;
      for (const record of storage.history) {
        for (const entry of record.entries) {
          if (entry.exercise.id === customExerciseKey) {
            entry.exercise = { id: customExerciseKey };
            record.updatedAt = Date.now();
          }
        }
      }
      for (const key of ObjectUtils.keys(storage.settings.exerciseData)) {
        if (key.includes(customExerciseKey)) {
          if (!storage.settings.exerciseData[customExerciseKey]) {
            const value = storage.settings.exerciseData[key];
            delete storage.settings.exerciseData[key];
            storage.settings.exerciseData[customExercise.id] = value;
          }
        }
      }
    }
    return storage;
  },
  "20250306192146_fix_empty_graphs": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const customExerciseKey of ObjectUtils.keys(storage.settings.exercises)) {
      for (const graph of storage.settings.graphs) {
        if (graph.type === "exercise" && graph.id.includes(customExerciseKey) && graph.id !== customExerciseKey) {
          graph.id = customExerciseKey;
        }
      }
    }
    return storage;
  },
  "20250322014249_add_is_completed": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const record of storage.history) {
      for (const entry of record.entries) {
        for (const set of entry.sets) {
          if (set.completedReps != null) {
            set.isCompleted = set.isCompleted ?? true;
            set.completedWeight = set.completedWeight ?? ObjectUtils.clone(set.weight);
          }
        }
      }
    }
    return storage;
  },
  "20250329092730_add_workout_settings": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.workoutSettings = storage.settings.workoutSettings || {
      targetType: "target",
    };
    return storage;
  },
  "20250331001906_migrate_weights_to_completed_weights": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      for (const week of program.planner?.weeks || []) {
        for (const day of week.days) {
          const newExerciseStr = PlannerExerciseEvaluator.changeWeightsToCompletedWeights(day.exerciseText);
          if (newExerciseStr !== day.exerciseText) {
            day.exerciseText = newExerciseStr;
          }
        }
      }
    }
    return storage;
  },
  "20250429083937_add_ids_to_planner_weeks_and_days": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      for (const week of program.planner?.weeks || []) {
        week.id = week.id || UidFactory.generateUid(8);
        for (const day of week.days) {
          day.id = day.id || UidFactory.generateUid(8);
        }
      }
    }
    return storage;
  },
  "20250704123128_add_vtypes_and_restructure_subscriptions": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    if (storage.subscription) {
      if (!Array.isArray(storage.subscription.apple)) {
        storage.subscription.apple = ObjectUtils.keys(storage.subscription.apple as Record<string, null>).map(
          (key) => ({
            vtype: "subscription_receipt",
            value: key,
            id: UidFactory.generateUid(6),
            createdAt: Date.now(),
          })
        );
      }
      if (!Array.isArray(storage.subscription.google)) {
        storage.subscription.google = ObjectUtils.keys(storage.subscription.google as Record<string, null>).map(
          (key) => ({
            vtype: "subscription_receipt",
            value: key,
            id: UidFactory.generateUid(6),
            createdAt: Date.now(),
          })
        );
      }
    }

    for (const program of storage.programs) {
      program.vtype = program.vtype ?? "program";
      if (program.planner) {
        program.planner.vtype = program.planner.vtype ?? "planner";
      }
    }
    for (const record of storage.history) {
      record.vtype = record.vtype ?? "history_record";
    }
    for (const key of ObjectUtils.keys(storage.stats?.weight || {})) {
      for (const record of storage.stats?.weight[key] || []) {
        record.vtype = record.vtype ?? "stat";
      }
    }
    for (const key of ObjectUtils.keys(storage.stats?.length || {})) {
      for (const record of storage.stats?.length[key] || []) {
        record.vtype = record.vtype ?? "stat";
      }
    }
    for (const key of ObjectUtils.keys(storage.stats?.percentage || {})) {
      for (const record of storage.stats?.percentage[key] || []) {
        record.vtype = record.vtype ?? "stat";
      }
    }
    for (const gym of storage.settings.gyms) {
      gym.vtype = gym.vtype ?? "gym";
      for (const equipment of ObjectUtils.values(gym.equipment)) {
        if (equipment) {
          equipment.vtype = equipment.vtype ?? "equipment_data";
        }
      }
    }
    for (const exercise of ObjectUtils.values(storage.settings.exercises)) {
      if (exercise) {
        exercise.vtype = exercise.vtype ?? "custom_exercise";
      }
    }
    for (const graph of storage.settings.graphs) {
      graph.vtype = graph.vtype ?? "graph";
    }

    return storage;
  },
};
