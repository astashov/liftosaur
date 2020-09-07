/* eslint-disable @typescript-eslint/no-explicit-any */

import { IStorage } from "../ducks/reducer";
import { lf } from "../utils/lens";
import { Service } from "../api/service";
import { CollectionUtils } from "../utils/collection";
import { Weight } from "../models/weight";
import { IExcerciseType } from "../models/excercise";

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

export const excerciseMapper: Record<string, IExcerciseType> = {
  benchPress: { id: "benchPress", bar: "barbell" },
  squat: { id: "squat", bar: "barbell" },
  deadlift: { id: "deadlift", bar: "barbell" },
  overheadPress: { id: "overheadPress", bar: "barbell" },
  chinups: { id: "chinUp" },
  barbellRows: { id: "bentOverRow", bar: "barbell" },
  pushups: { id: "pushUp" },
  pullups: { id: "pullUp" },
  dips: { id: "tricepsDip" },
  legRaises: { id: "hangingLegRaise" },
  singleLegSplitSquat: { id: "bulgarianSplitSquat" },
  invertedRows: { id: "invertedRow" },
  dbLateralRaise: { id: "lateralRaise", bar: "dumbbell" },
  inclineDbBenchPress: { id: "inclineBenchPress", bar: "dumbbell" },
  dbInclineFly: { id: "inclineChestFly", bar: "dumbbell" },
  dbArnoldPress: { id: "arnoldPress", bar: "dumbbell" },
  dbBenchPress: { id: "benchPress", bar: "dumbbell" },
  dbShrug: { id: "shrug", bar: "dumbbell" },
  cableCrunch: { id: "cableCrunch" },
  tricepsPushdown: { id: "tricepsPushdown" },
  dbTricepsExtension: { id: "tricepsExtension", bar: "dumbbell" },
  neutralGripChinup: { id: "chinUp" },
  plank: { id: "plank" },
  dbRow: { id: "bentOverRow", bar: "dumbbell" },
  dbOverheadPress: { id: "overheadPress", bar: "dumbbell" },
  dbSingleLegDeadlift: { id: "singleLegDeadlift", bar: "dumbbell" },
  dbGobletSquat: { id: "gobletSquat", bar: "dumbbell" },
  dbCalfRaise: { id: "standingCalfRaise", bar: "dumbbell" },
  bulgarianSplitSquat: { id: "bulgarianSplitSquat", bar: "dumbbell" },
  dbLunge: { id: "lunge", bar: "dumbbell" },
  dbBicepCurl: { id: "bicepCurl", bar: "dumbbell" },
  skullcrusher: { id: "skullcrusher", bar: "ezbar" },
} as const;

export const migrations = {
  "20200604235900_add_bar_weights": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    return lf(aStorage)
      .p("settings")
      .p("bars")
      .set({
        barbell: 45,
        dumbbell: 10,
        ezbar: 20,
      } as any);
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
  "20200723011153_upgrade_to_new_programs": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    if (aStorage.programs != null && aStorage.programs.length > 0) {
      return storage;
    }
    const storageAny: any = storage;

    const service = new Service(client);
    const programs = await service.programs();
    const usedPrograms = new Set<string>();
    for (const record of storage.history) {
      usedPrograms.add(record.programId);
    }
    storage.programs = [];
    for (const programId of usedPrograms) {
      const program = programs.find((p) => p.id === programId)! as any;
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
        historyRecord.day = (historyRecord.day % 10) + 1;
      }
    }
    delete storageAny.programStates;

    return storage;
  },
  "20200728215253_upgrade_to_new_programs": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const historyRecord of storage.history) {
      const program = storage.programs.find((p) => p.id === historyRecord.programId);
      if (program != null) {
        const programDay = program.days[historyRecord.day - 1];
        historyRecord.dayName = programDay?.name || `Day ${historyRecord.day}`;
        historyRecord.programName = program.name;
      } else {
        historyRecord.dayName = `Day ${historyRecord.day}`;
        historyRecord.programName = `Program ${historyRecord.programId}`;
      }
    }
    return storage;
  },
  "20200807000141_convert_to_iweight": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const historyRecord of storage.history) {
      for (const entry of historyRecord.entries) {
        for (const set of entry.sets) {
          if (typeof set.weight === "number") {
            set.weight = Weight.build(set.weight, "lb");
          }
        }
        for (const set of entry.warmupSets) {
          if (typeof set.weight === "number") {
            set.weight = Weight.build(set.weight, "lb");
          }
        }
      }
    }
    storage.settings.plates = [
      { weight: Weight.build(45, "lb"), num: 4 },
      { weight: Weight.build(25, "lb"), num: 4 },
      { weight: Weight.build(10, "lb"), num: 4 },
      { weight: Weight.build(5, "lb"), num: 4 },
      { weight: Weight.build(2.5, "lb"), num: 4 },
      { weight: Weight.build(1.25, "lb"), num: 2 },
      { weight: Weight.build(20, "kg"), num: 4 },
      { weight: Weight.build(10, "kg"), num: 4 },
      { weight: Weight.build(5, "kg"), num: 4 },
      { weight: Weight.build(2.5, "kg"), num: 4 },
      { weight: Weight.build(1.25, "kg"), num: 4 },
      { weight: Weight.build(0.5, "kg"), num: 2 },
    ];
    storage.settings.bars = {
      lb: {
        barbell: Weight.build(45, "lb"),
        ezbar: Weight.build(20, "lb"),
        dumbbell: Weight.build(10, "lb"),
      },
      kg: {
        barbell: Weight.build(20, "kg"),
        ezbar: Weight.build(10, "kg"),
        dumbbell: Weight.build(5, "kg"),
      },
    };
    storage.settings.units = "lb";
    return storage;
  },
  "20200808141059_migrate_excercises": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const historyRecord of storage.history) {
      for (const entry of historyRecord.entries) {
        if (typeof entry.excercise === "string") {
          entry.excercise = excerciseMapper[(entry.excercise as unknown) as string];
        }
      }
    }
    for (const program of storage.programs) {
      for (const day of program.days) {
        for (const excercise of day.excercises) {
          const e = excercise as any;
          if (typeof e.excercise === "string") {
            e.excercise = excerciseMapper[(e.excercise as unknown) as string];
          }
        }
      }
    }
    return storage;
  },
  "20200823225507_add_tags_to_programs": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    for (const program of storage.programs) {
      program.tags = program.tags || [];
    }
    return storage;
  },
  "20200907132922_remove_old_programs": async (client: Window["fetch"], aStorage: IStorage): Promise<IStorage> => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.programs = [];
    return storage;
  },
};
