/* eslint-disable @typescript-eslint/no-explicit-any */

import { CollectionUtils } from "../utils/collection";
import { History } from "../models/history";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { IStorage, IExerciseId, IExerciseType, equipments, ICustomExercise } from "../types";
import { Weight } from "../models/weight";
import { SendMessage } from "../utils/sendMessage";
import { Settings } from "../models/settings";
import { equipmentName, Exercise } from "../models/exercise";
import { ProgramToPlanner } from "../models/programToPlanner";
import { ExerciseImageUtils } from "../models/exerciseImage";
import RB from "rollbar";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { PlannerKey } from "../pages/planner/plannerKey";
import { PP } from "../models/pp";
import { PlannerExerciseEvaluator } from "../pages/planner/plannerExerciseEvaluator";
import { basicBeginnerProgram } from "../programs/basicBeginnerProgram";
import { Program } from "../models/program";
declare let Rollbar: RB;

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
    const historyExercises = ObjectUtils.keys(History.findAllMaxSetsPerId(storage.history));
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
          lb: anyStorage.settings.bars?.lb?.barbell || Weight.build(45, "lb"),
          kg: anyStorage.settings.bars?.kg?.barbell || Weight.build(20, "kg"),
        },
        plates: anyStorage.settings.plates,
        fixed: [],
        isFixed: false,
      },
      trapbar: {
        multiplier: 2,
        bar: {
          lb: anyStorage.settings.bars?.lb?.barbell || Weight.build(45, "lb"),
          kg: anyStorage.settings.bars?.kg?.barbell || Weight.build(20, "kg"),
        },
        plates: anyStorage.settings.plates,
        fixed: [],
        isFixed: false,
      },
      smith: {
        multiplier: 2,
        bar: {
          lb: anyStorage.settings.bars?.lb?.barbell || Weight.build(45, "lb"),
          kg: anyStorage.settings.bars?.kg?.barbell || Weight.build(20, "kg"),
        },
        plates: anyStorage.settings.plates,
        fixed: [],
        isFixed: false,
      },
      dumbbell: {
        multiplier: 2,
        bar: {
          lb: anyStorage.settings.bars?.lb?.dumbbell || Weight.build(10, "lb"),
          kg: anyStorage.settings.bars?.kg?.dumbbell || Weight.build(5, "kg"),
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
          lb: anyStorage.settings.bars?.lb?.ezbar || Weight.build(20, "lb"),
          kg: anyStorage.settings.bars?.kg?.ezbar || Weight.build(10, "kg"),
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
  "20221116230818_add_graph_settings": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.graphsSettings = storage.settings.graphsSettings || {
      isSameXAxis: false,
      isWithBodyweight: false,
      isWithOneRm: true,
    };
    return storage;
  },
  "20230107181335_add_subscriptions": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.subscription = storage.subscription || { apple: {}, google: {} };
    return storage;
  },
  "20230111092752_add_graph_program_lines": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    if (storage.settings.graphsSettings.isWithProgramLines == null) {
      storage.settings.graphsSettings.isWithProgramLines = true;
    }
    return storage;
  },
  "20230121135616_add_exercise_stats_settings": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.exerciseStatsSettings = storage.settings.exerciseStatsSettings || {
      ascendingSort: false,
    };
    return storage;
  },
  "20230226222150_add_review_requests": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.reviewRequests = storage.reviewRequests || [];
    return storage;
  },
  "20230303212519_add_affiliates": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.affiliates = storage.affiliates || {};
    return storage;
  },
  "20230306235731_add_signup_requests": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.signupRequests = storage.signupRequests || [];
    return storage;
  },
  "20230611102656_add_missing_leverage_machine": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.equipment.leverageMachine = storage.settings.equipment.leverageMachine || {
      multiplier: 1,
      bar: {
        lb: Weight.build(0, "lb"),
        kg: Weight.build(0, "kg"),
      },
      plates: [
        { weight: Weight.build(45, "lb"), num: 8 },
        { weight: Weight.build(25, "lb"), num: 4 },
        { weight: Weight.build(10, "lb"), num: 4 },
        { weight: Weight.build(5, "lb"), num: 4 },
        { weight: Weight.build(2.5, "lb"), num: 4 },
        { weight: Weight.build(1.25, "lb"), num: 2 },
        { weight: Weight.build(20, "kg"), num: 8 },
        { weight: Weight.build(10, "kg"), num: 4 },
        { weight: Weight.build(5, "kg"), num: 4 },
        { weight: Weight.build(2.5, "kg"), num: 4 },
        { weight: Weight.build(1.25, "kg"), num: 4 },
        { weight: Weight.build(0.5, "kg"), num: 2 },
      ],
      fixed: [],
      isFixed: false,
    };
    return storage;
  },
  "20230612190339_add_volume_to_settings": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.volume = storage.settings.volume == null ? 1 : storage.settings.volume;
    return storage;
  },
  "20230613211015_migrate_to_descriptions": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      for (const exercise of program.exercises) {
        if (exercise.description) {
          exercise.descriptions = exercise.descriptions || [exercise.description];
        } else {
          exercise.descriptions = exercise.descriptions || [""];
        }
      }
    }
    return storage;
  },
  "20230623155732_add_bodyfat_percentage": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.statsEnabled.percentage = storage.settings.statsEnabled.percentage || { bodyfat: false };
    storage.stats.percentage = storage.stats.percentage || {};
    return storage;
  },
  "20230709112106_fix_empty_program_ids": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      if (program.id === "") {
        program.id = UidFactory.generateUid(8);
      }
    }
    if (storage.programs.length > 0 && storage.currentProgramId === "") {
      storage.currentProgramId = storage.programs[0].id;
    }
    return storage;
  },
  "20230826135508_add_multiweek_support": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      program.isMultiweek = program.isMultiweek ?? false;
      program.weeks = program.weeks ?? [];
      for (const day of program.days) {
        day.id = day.id || UidFactory.generateUid(8);
      }
    }
    return storage;
  },
  "20230922191948_add_graph_options": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.graphOptions = storage.settings.graphOptions || {};
    return storage;
  },
  "20231006165141_fix_null_nextday": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      program.nextDay = program.nextDay ?? 1;
    }
    return storage;
  },
  "20231009191950_clear_caches": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    if (typeof window !== "undefined") {
      SendMessage.toIos({ type: "clearCache" });
      SendMessage.toAndroid({ type: "clearCache" });
    }
    return aStorage;
  },
  "20231126225248_deleted_items": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.deletedHistory = storage.deletedHistory || [];
    storage.deletedPrograms = storage.deletedPrograms || [];
    storage.deletedStats = storage.deletedStats || [];
    return storage;
  },
  "20231127190359_add_cloned_at_to_programs": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      program.clonedAt = program.clonedAt ?? Date.now() - Math.floor(Math.random() * 1000);
    }
    return storage;
  },
  "20231203114534_fix_duplicated_ids_in_weeks": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      const groupByIdWeeks = CollectionUtils.groupByKey(program.weeks, "id");
      const hasDuplicatedIds = ObjectUtils.values(groupByIdWeeks).some((v) => (v?.length || 0) > 1);
      if (hasDuplicatedIds) {
        for (const week of program.weeks) {
          week.id = UidFactory.generateUid(8);
        }
      }
    }
    return storage;
  },
  "20231207095636_fix_duplicated_ids_in_weeks_2": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      const groupByIdWeeks = CollectionUtils.groupByKey(program.weeks, "id");
      const hasDuplicatedIds = ObjectUtils.values(groupByIdWeeks).some((v) => (v?.length || 0) > 1);
      if (hasDuplicatedIds) {
        for (const week of program.weeks) {
          week.id = UidFactory.generateUid(8);
        }
      }
    }
    return storage;
  },
  "20231216161503_fix_broken_storage_for_yrurftmdmt": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    if (storage.tempUserId === "yrurftmdmt") {
      try {
        (storage as any).history[0].userPromptedStateVars.fpbazbvg.rir = 0;
        (storage as any).programs[0].exercises[1].reuseLogic.states.iksjdlyj.rir = 0;
      } catch (e) {
        // noop
      }
      return storage;
    } else {
      return aStorage;
    }
  },
  "20240106145047_split_graphs_by_equipment": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    let equipmentMap: Record<string, Record<string, number>> | undefined = undefined;
    for (const graph of storage.settings.graphs) {
      if (graph.type === "exercise") {
        const exerciseId = graph.id;
        if (exerciseId.indexOf("_") !== -1) {
          continue;
        }
        equipmentMap =
          equipmentMap ||
          storage.history.reduce<Record<string, Record<string, number>>>((memo, hr) => {
            for (const entry of hr.entries) {
              const id = entry.exercise.id;
              const equipment = entry.exercise.equipment || "bodyweight";
              memo[id] = memo[id] || {};
              memo[id]![equipment] = memo[id][equipment] || 0;
              memo[id]![equipment] += 1;
            }
            return memo;
          }, {});
        const usage = equipmentMap[graph.id];
        if (usage == null) {
          continue;
        }
        const popularEquipment = CollectionUtils.sortByExpr(ObjectUtils.entries(usage), (i) => i[1], true)[0]?.[0];
        graph.id = `${graph.id}_${popularEquipment}`;
      }
    }
    return storage;
  },
  "20240106161121_add_exercise_data": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.exerciseData = storage.settings.exerciseData || {};
    return storage;
  },
  "20240123071752_add_planner": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.settings.planner = storage.settings.planner || Settings.buildPlannerSettings();
    return storage;
  },
  "20240229152620_fix_null_state_vars": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs || []) {
      for (const exercise of program.exercises || []) {
        for (const key of ObjectUtils.keys(exercise.state || {})) {
          const value = exercise.state[key];
          if (value != null && typeof value !== "number" && value.value == null) {
            value.value = 0;
          }
        }
      }
    }
    return storage;
  },
  "20240302101133_fix_null_plates": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const equipmentKey of ObjectUtils.keys(storage.settings.equipment)) {
      const equipment = storage.settings.equipment[equipmentKey]!;
      equipment.plates = (equipment.plates || []).filter((p) => p.num != null && p.weight != null);
    }
    return storage;
  },
  "20240419095934_fix_null_1rm": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const exerciseKey of ObjectUtils.keys(storage.settings.exerciseData || {})) {
      const value = storage.settings.exerciseData[exerciseKey];
      const rm1 = value?.rm1;
      if (rm1 && rm1.value == null) {
        rm1.value = 0;
      }
      if (rm1 && rm1.unit == null) {
        rm1.unit = storage.settings.units || "lb";
      }
    }
    return storage;
  },
  "20240419095934_migrate_to_gyms": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    try {
      if (storage.settings.gyms == null) {
        const gymId = UidFactory.generateUid(8);
        storage.settings.gyms = [
          {
            id: gymId,
            name: "Main",
            equipment: ObjectUtils.clone(storage.settings.equipment),
          },
        ];
        storage.settings.currentGymId = gymId;

        const usedCustom: Record<string, IExerciseType> = {};
        for (const record of storage.history) {
          for (const entries of record.entries) {
            const exerciseType = entries.exercise;
            const customExercise = storage.settings.exercises[exerciseType.id];
            if (exerciseType.equipment && equipments.indexOf(exerciseType.equipment as any) === -1) {
              const key = Exercise.toKey(exerciseType);
              usedCustom[key] = exerciseType;
            } else if (customExercise && customExercise.defaultEquipment !== exerciseType.equipment) {
              const key = Exercise.toKey(exerciseType);
              usedCustom[key] = exerciseType;
            } else if (!ExerciseImageUtils.exists(exerciseType, "small")) {
              const key = Exercise.toKey(exerciseType);
              usedCustom[key] = exerciseType;
            }
          }
        }
        for (const program of storage.programs) {
          for (const exercise of program.exercises) {
            const exerciseType = exercise.exerciseType;
            const customExercise = storage.settings.exercises[exerciseType.id];
            if (exerciseType.equipment && equipments.indexOf(exerciseType.equipment as any) === -1) {
              const key = Exercise.toKey(exerciseType);
              usedCustom[key] = exerciseType;
            } else if (customExercise && customExercise.defaultEquipment !== exerciseType.equipment) {
              const key = Exercise.toKey(exerciseType);
              usedCustom[key] = exerciseType;
            } else if (!ExerciseImageUtils.exists(exerciseType, "small")) {
              const key = Exercise.toKey(exerciseType);
              usedCustom[key] = exerciseType;
            }
          }
        }

        const newCustom: Record<string, { type: IExerciseType; exercise: ICustomExercise }> = {};
        for (const key of ObjectUtils.keys(usedCustom)) {
          const exerciseType = usedCustom[key];
          const exercise = Exercise.get(exerciseType, storage.settings.exercises);
          const targetMuscles = Exercise.targetMuscles(exerciseType, storage.settings.exercises);
          const synergistMuscles = Exercise.synergistMuscles(exerciseType, storage.settings.exercises);
          const equipment =
            exerciseType.equipment != null && exerciseType.equipment !== exercise.defaultEquipment
              ? exerciseType.equipment
              : undefined;
          const name = `${exercise.name}${
            equipment ? `, ${equipmentName(equipment, storage.settings.equipment)}` : ""
          }`;
          newCustom[key] = {
            type: exerciseType,
            exercise: {
              id: UidFactory.generateUid(8),
              name,
              isDeleted: false,
              meta: {
                targetMuscles,
                synergistMuscles,
                bodyParts: [],
                sortedEquipment: [],
              },
              types: exercise.types,
            },
          };
        }
        for (const key of ObjectUtils.keys(newCustom)) {
          const { exercise } = newCustom[key];
          storage.settings.exercises[exercise.id] = exercise;
        }

        for (const record of storage.history) {
          for (const entry of record.entries) {
            const exerciseType = entry.exercise;
            const custom = newCustom[Exercise.toKey(exerciseType)];
            if (custom) {
              entry.exercise = { id: custom.exercise.id };
            }
          }
        }

        for (const program of storage.programs) {
          for (const exercise of program.exercises) {
            const exerciseType = exercise.exerciseType;
            const custom = newCustom[Exercise.toKey(exerciseType)];
            if (custom) {
              exercise.exerciseType = { id: custom.exercise.id };
              const { label } = PlannerExerciseEvaluator.extractNameParts(exercise.name, storage.settings);
              const newName = storage.settings.exercises[custom.exercise.id]?.name;
              exercise.name = `${label ? `${label}-` : ""}${newName}`;
            }
          }
        }

        for (let i = 0; i < storage.programs.length; i += 1) {
          try {
            let program = storage.programs[i];
            const plannerProgram = program.planner;
            if (plannerProgram != null) {
              for (const exerciseKey of ObjectUtils.keys(newCustom)) {
                const { evaluatedWeeks } = PlannerProgram.evaluate(plannerProgram!, storage.settings);
                const keys: Set<string> = new Set();
                const custom = newCustom[exerciseKey];
                PP.iterate(evaluatedWeeks, (ex) => {
                  const exercise = Exercise.findByNameAndEquipment(ex.name, storage.settings.exercises);
                  if (exercise) {
                    const exerciseType = { id: exercise.id, equipment: ex.equipment };
                    if (Exercise.eq(exerciseType, custom.type)) {
                      keys.add(PlannerKey.fromPlannerExercise(ex, storage.settings));
                    }
                  }
                });
                const newExerciseType = { id: custom.exercise.id };
                for (const key of keys) {
                  const programResult = PlannerProgram.replaceExercise(program, key, newExerciseType, storage.settings);
                  if (programResult.success) {
                    program = programResult.data;
                  }
                }
              }
              const newPlanner = new ProgramToPlanner(
                Program.evaluate(program, storage.settings),
                storage.settings
              ).convertToPlanner();
              program.planner = newPlanner;
              storage.programs[i] = program;
            }
          } catch (error) {
            const e = error as Error;
            Rollbar.error(e);
            console.error(e);
          }
        }

        for (const record of storage.history) {
          for (const entry of record.entries) {
            const exerciseType = entry.exercise;
            const equipment = exerciseType.equipment;
            if (equipment != null) {
              const key = Exercise.toKey(exerciseType);
              const gym = storage.settings.gyms[0];
              storage.settings.exerciseData[key] = {
                ...storage.settings.exerciseData[key],
                equipment: { [gym.id]: exerciseType.equipment },
              };
            }
          }
        }
      }
      return storage;
    } catch (error) {
      const e = error as Error;
      Rollbar.error(e);
      console.error(e);
      const id = UidFactory.generateUid(8);
      storage.settings.gyms = [
        {
          id,
          name: "Main",
          equipment: ObjectUtils.clone(storage.settings.equipment),
        },
      ];
      storage.settings.currentGymId = id;
      return storage;
    }
  },
  "20240614183557_fix_duplicate_gyms": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    const gymIds = new Set<string>();
    const gyms = storage.settings.gyms || [];
    const newGyms = gyms.filter((g) => {
      if (gymIds.has(g.id)) {
        return false;
      }
      gymIds.add(g.id);
      return true;
    });
    storage.settings.gyms = newGyms;
    return storage;
  },
  "20240614191251_fix_empty_gyms": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    const id = UidFactory.generateUid(8);
    storage.settings.gyms =
      storage.settings.gyms == null || storage.settings.gyms.length === 0
        ? [
            {
              id,
              name: "Main",
              equipment: ObjectUtils.clone(storage.settings.equipment),
            },
          ]
        : storage.settings.gyms;
    storage.settings.currentGymId = storage.settings.currentGymId || id;
    return storage;
  },
  "20240615162837_fix_duplicate_custom_exercises": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    const nameToId: Record<string, string> = {};
    const duplicateIdsToIds: Record<string, string> = {};
    for (const key of ObjectUtils.keys(storage.settings.exercises)) {
      const exercise = storage.settings.exercises[key]!;
      const name = exercise.name;
      if (nameToId[name] == null) {
        nameToId[name] = key;
      } else {
        duplicateIdsToIds[key] = nameToId[name];
        exercise.isDeleted = true;
      }
    }
    if (ObjectUtils.keys(duplicateIdsToIds).length !== 0) {
      for (const history of storage.history) {
        for (const entry of history.entries) {
          const exercise = entry.exercise;
          const id = duplicateIdsToIds[exercise.id];
          if (id) {
            entry.exercise = { id };
          }
        }
      }
      for (const program of storage.programs) {
        for (const exercise of program.exercises) {
          const exerciseType = exercise.exerciseType;
          if (exerciseType) {
            const id = duplicateIdsToIds[exerciseType.id];
            if (id) {
              exercise.exerciseType = { id };
            }
          }
        }
      }
    }
    return storage;
  },
  "20240615164027_switch_history_to_custom_exercises": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const history of storage.history) {
      for (const entry of history.entries) {
        const exerciseType = entry.exercise;
        const exercise = Exercise.get(exerciseType, {});
        const exerciseFullName = Exercise.fullName(exercise, storage.settings);
        const fullExercise = Exercise.findByName(exerciseFullName, storage.settings.exercises);
        const foundCustom = fullExercise ? storage.settings.exercises[fullExercise.id] : undefined;
        if (foundCustom) {
          entry.exercise = { id: foundCustom.id };
        }
      }
    }
    return storage;
  },
  "20240615180323_refill_exerciseData_for_new_postgym_exercises": async (
    client: Window["fetch"],
    aStorage: IStorage
  ): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const key of ObjectUtils.keys(storage.settings.exerciseData)) {
      const exerciseData = storage.settings.exerciseData[key];
      const exerciseType = Exercise.fromKey(key);
      const exercise = Exercise.get(exerciseType, {});
      const exerciseFullName = Exercise.fullName(exercise, storage.settings);
      const fullExercise = Exercise.findByName(exerciseFullName, storage.settings.exercises);
      const foundCustom = fullExercise ? storage.settings.exercises[fullExercise.id] : undefined;
      if (foundCustom) {
        const data = storage.settings.exerciseData[foundCustom.id];
        if (!data) {
          const gym = storage.settings.gyms[0];
          const gymEquipment = (gym.equipment || {})[exerciseType.equipment ?? ""];
          if (gymEquipment) {
            storage.settings.exerciseData[foundCustom.id] = {
              ...exerciseData,
              equipment: { [gym.id]: exerciseType.equipment },
            };
          }
        }
      }
    }
    return storage;
  },
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
};
