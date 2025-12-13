/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { Storage } from "../../src/models/storage";
import { Settings } from "../../src/models/settings";
import { VersionTracker, IVersions, ICollectionVersions } from "../../src/models/versionTracker";
import { Weight } from "../../src/models/weight";
import {
  STORAGE_VERSION_TYPES,
  IStorage,
  IProgram,
  IHistoryRecord,
  ICustomExercise,
  IPlannerProgram,
  IGym,
  IEquipmentData,
} from "../../src/types";
import { ObjectUtils } from "../../src/utils/object";

describe("updateVersions", () => {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES);

  it("should track version for primitive field changes", () => {
    const oldStorage = Storage.getDefault();
    const newStorage = { ...oldStorage, currentProgramId: "program-123" };
    const timestamp = 1000;

    const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

    expect(versions.currentProgramId).to.equal(timestamp);
  });

  it("should not track version when field hasn't changed", () => {
    const storage = Storage.getDefault();
    const timestamp = 1000;

    const versions = versionTracker.updateVersions(storage, storage, {}, {}, timestamp);

    expect(versions).to.deep.equal({});
  });

  it("should track version for newly added fields", () => {
    const oldStorage = Storage.getDefault();
    const newStorage = { ...oldStorage, email: "test@example.com" };
    oldStorage.email = undefined;
    const timestamp = 1000;

    const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

    expect(versions.email).to.equal(timestamp);
  });

  it("should track versions for nested object changes", () => {
    const oldStorage = Storage.getDefault();
    const newStorage = {
      ...oldStorage,
      settings: {
        ...oldStorage.settings,
        volume: 1234,
      },
    };
    const timestamp = 1000;

    const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

    expect(versions.settings).to.deep.equal({ volume: timestamp });
  });

  it("should preserve existing versions", () => {
    const oldStorage = Storage.getDefault();
    const newStorage = {
      ...oldStorage,
      currentProgramId: "program-123",
    };
    const existingVersions: IVersions<IStorage> = {
      email: 500,
      settings: { units: 600 },
    };
    const timestamp = 1000;

    const versions = versionTracker.updateVersions(oldStorage, newStorage, existingVersions, {}, timestamp);

    expect(versions).to.deep.equal({
      email: 500,
      settings: { units: 600 },
      currentProgramId: timestamp,
    });
  });

  describe("array handling", () => {
    it("should track versions for array items with IDs", () => {
      const program1: IProgram = {
        vtype: "program",
        id: "prog1",
        clonedAt: 1,
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const program2: IProgram = {
        ...program1,
        id: "prog2",
        clonedAt: 2,
        name: "Program 2",
        nextDay: 2,
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program1],
      };

      const newStorage = {
        ...oldStorage,
        programs: [program1, program2],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions.items!["2"]).to.deep.equal({
        name: timestamp,
        nextDay: timestamp,
      });
    });

    it("should track version changes for existing array items", () => {
      const program1: IProgram = {
        vtype: "program",
        id: "prog1",
        clonedAt: 1,
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const updatedProgram1: IProgram = {
        ...program1,
        name: "Updated Program 1",
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program1],
      };

      const newStorage = {
        ...oldStorage,
        programs: [updatedProgram1],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions.items!["1"]).to.deep.equal({
        name: timestamp,
      });
    });

    it("should track deleted items in arrays", () => {
      const program1: IProgram = {
        vtype: "program",
        id: "prog1",
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        clonedAt: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const program2: IProgram = {
        ...program1,
        id: "prog2",
        clonedAt: 2,
        name: "Program 2",
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program1, program2],
      };

      const newStorage = {
        ...oldStorage,
        programs: [program1],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions).to.deep.equal({
        items: {},
        deleted: { "2": timestamp },
      });
    });

    it("should handle empty arrays", () => {
      const program: IProgram = {
        vtype: "program",
        id: "prog1",
        clonedAt: 1,
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program],
      };
      const newStorage = {
        ...oldStorage,
        programs: [],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions).to.deep.equal({
        items: {},
        deleted: { "1": timestamp },
      });
    });
  });

  it("should handle not enough versions", () => {
    const storage = ObjectUtils.clone(Storage.getDefault());
    storage.settings.exercises = {
      nflszmyn: {
        types: ["pull", "lower"],
        isDeleted: false,
        vtype: "custom_exercise",
        meta: {
          synergistMuscles: [],
          targetMuscles: [],
          bodyParts: [],
          sortedEquipment: [],
        },
        name: "Deficit deadlift, thick bar",
        id: "nflszmyn",
      },
      uspiaeyg: {
        name: "Internal Shoulder Rotation, Butterfly",
        types: ["upper"],
        id: "uspiaeyg",
        isDeleted: false,
        vtype: "custom_exercise",
        meta: {
          synergistMuscles: [],
          targetMuscles: [],
          bodyParts: [],
          sortedEquipment: [],
        },
      },
      hpemxfdg: {
        name: "Farmer's walk",
        types: [],
        id: "hpemxfdg",
        isDeleted: false,
        vtype: "custom_exercise",
        meta: {
          synergistMuscles: [],
          targetMuscles: [],
          bodyParts: [],
          sortedEquipment: [],
        },
      },
    };

    const versionTracker2 = new VersionTracker(STORAGE_VERSION_TYPES);
    const merged = versionTracker2.mergeByVersions(
      storage,
      {},
      { settings: { exercises: { boo: 300 } } },
      {
        settings: {
          exercises: {
            boo: {
              name: "Farmer's walk",
              types: [],
              id: "hpemxfdg",
              isDeleted: false,
              vtype: "custom_exercise",
              meta: {
                synergistMuscles: [],
                targetMuscles: [],
                bodyParts: [],
                sortedEquipment: [],
              },
            },
          },
        } as any,
      }
    ).settings.exercises;
    expect(Object.keys(merged)).to.deep.equal(["nflszmyn", "uspiaeyg", "hpemxfdg", "boo"]);
  });

  describe("atomic object handling", () => {
    it("should version atomic objects as a whole", () => {
      const historyRecord: IHistoryRecord = {
        vtype: "history_record",
        id: 1,
        date: "2023-01-01",
        programId: "prog1",
        programName: "Test Program",
        day: 1,
        dayName: "Day 1",
        entries: [],
        startTime: Date.now(),
      };

      const oldStorage = {
        ...Storage.getDefault(),
        history: [],
      };

      const newStorage = {
        ...oldStorage,
        history: [historyRecord],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const historyVersions = versions.history as ICollectionVersions<IHistoryRecord>;
      expect(historyVersions.items!["1"]).to.equal(timestamp);
    });

    it("should track atomic object field changes", () => {
      const customExercise: ICustomExercise = {
        vtype: "custom_exercise",
        id: "custom1",
        name: "Custom Exercise",
        isDeleted: false,
        meta: {
          bodyParts: [],
          targetMuscles: [],
          synergistMuscles: [],
        },
      };

      const updatedExercise: ICustomExercise = {
        ...customExercise,
        name: "Updated Custom Exercise",
      };

      const oldStorage = {
        ...Storage.getDefault(),
        settings: {
          ...Settings.build(),
          exercises: { custom1: customExercise },
        },
      };

      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          exercises: { custom1: updatedExercise },
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
      const exerciseVersions = settingsVersions.exercises as ICollectionVersions<ICustomExercise>;
      expect(exerciseVersions.items!.custom1).to.equal(timestamp);
    });
  });

  describe("controlled object handling", () => {
    it("should version only specific fields for controlled objects", () => {
      const program: IProgram = {
        vtype: "program",
        id: "prog1",
        name: "Program 1",
        description: "Description",
        url: "",
        author: "",
        nextDay: 1,
        clonedAt: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const updatedProgram: IProgram = {
        ...program,
        name: "Updated Program 1",
        description: "Updated Description",
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program],
      };

      const newStorage = {
        ...oldStorage,
        programs: [updatedProgram],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      const itemVersion = programVersions!.items!["1"] as IVersions<IProgram>;

      expect(itemVersion).to.deep.equal({
        name: timestamp,
      });
    });

    it("should track multiple controlled fields", () => {
      const program: IProgram = {
        vtype: "program",
        id: "prog1",
        clonedAt: 1,
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const plannerProgram: IPlannerProgram = {
        vtype: "planner",
        name: "Planner",
        weeks: [],
      };

      const updatedProgram: IProgram = {
        ...program,
        name: "Updated Program 1",
        nextDay: 2,
        planner: plannerProgram,
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program],
      };

      const newStorage = {
        ...oldStorage,
        programs: [updatedProgram],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      const itemVersion = programVersions!.items!["1"] as IVersions<IProgram>;

      expect(itemVersion).to.deep.equal({
        name: timestamp,
        nextDay: timestamp,
        planner: timestamp,
      });
    });

    it("should handle controlled objects in collections", () => {
      const gym1: IGym = {
        vtype: "gym",
        id: "gym1",
        name: "Gym 1",
        equipment: {},
      };

      const gym2: IGym = {
        vtype: "gym",
        id: "gym2",
        name: "Gym 2",
        equipment: {},
      };

      const oldStorage = {
        ...Storage.getDefault(),
        settings: {
          ...Settings.build(),
          gyms: [gym1],
        },
      };

      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          gyms: [gym1, gym2],
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const settings = versions.settings as IVersions<typeof oldStorage.settings>;
      const gymVersions = settings.gyms as ICollectionVersions<IGym>;
      expect(gymVersions.items!.gym2).to.deep.equal({
        name: timestamp,
        equipment: timestamp,
      });
    });
  });

  describe("dictionary handling", () => {
    it("should handle dictionary fields like collections", () => {
      const exercise1: ICustomExercise = {
        vtype: "custom_exercise",
        id: "custom1",
        name: "Exercise 1",
        isDeleted: false,
        meta: {
          bodyParts: [],
          targetMuscles: [],
          synergistMuscles: [],
        },
      };

      const exercise2: ICustomExercise = {
        vtype: "custom_exercise",
        id: "custom2",
        name: "Exercise 2",
        isDeleted: false,
        meta: {
          bodyParts: [],
          targetMuscles: [],
          synergistMuscles: [],
        },
      };

      const oldStorage = {
        ...Storage.getDefault(),
        settings: {
          ...Settings.build(),
          exercises: { custom1: exercise1 },
        },
      };

      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          exercises: {
            custom1: exercise1,
            custom2: exercise2,
          },
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
      const exerciseVersions = settingsVersions.exercises as ICollectionVersions<ICustomExercise>;
      expect(exerciseVersions.items).to.deep.equal({
        custom2: timestamp,
      });
    });

    it("should track deleted items in dictionaries", () => {
      const exercise1: ICustomExercise = {
        vtype: "custom_exercise",
        id: "ex1",
        name: "Exercise 1",
        isDeleted: false,
        meta: {
          bodyParts: [],
          targetMuscles: [],
          synergistMuscles: [],
        },
      };

      const exercise2: ICustomExercise = {
        ...exercise1,
        id: "ex2",
        name: "Exercise 2",
      };

      const oldStorage = {
        ...Storage.getDefault(),
        settings: {
          ...Settings.build(),
          exercises: { ex1: exercise1, ex2: exercise2 },
        },
      };

      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          exercises: { ex1: exercise1 },
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
      const exerciseVersions = settingsVersions.exercises as ICollectionVersions<ICustomExercise>;
      expect(exerciseVersions).to.deep.equal({
        items: {},
        deleted: { ex2: timestamp },
      });
    });

    it("should handle empty dictionaries", () => {
      const exercise: ICustomExercise = {
        vtype: "custom_exercise",
        id: "custom1",
        name: "Exercise 1",
        isDeleted: false,
        meta: {
          bodyParts: [],
          targetMuscles: [],
          synergistMuscles: [],
        },
      };

      const oldStorage = {
        ...Storage.getDefault(),
        settings: {
          ...Settings.build(),
          exercises: { custom1: exercise },
        },
      };

      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          exercises: {},
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
      const exerciseVersions = settingsVersions.exercises as ICollectionVersions<ICustomExercise>;
      expect(exerciseVersions).to.deep.equal({
        items: {},
        deleted: { custom1: timestamp },
      });
    });

    it("should track changes in dictionary items", () => {
      const equipment1: IEquipmentData = {
        vtype: "equipment_data",
        bar: { lb: { value: 45, unit: "lb" }, kg: { value: 20, unit: "kg" } },
        multiplier: 1,
        plates: [],
        fixed: [],
        isFixed: false,
      };

      const updatedEquipment1: IEquipmentData = {
        ...equipment1,
        multiplier: 2,
      };

      const gym: IGym = {
        vtype: "gym",
        id: "gym1",
        name: "Gym 1",
        equipment: { barbell: equipment1 },
      };

      const updatedGym: IGym = {
        ...gym,
        equipment: { barbell: updatedEquipment1 },
      };

      const oldStorage = {
        ...Storage.getDefault(),
        settings: {
          ...Settings.build(),
          gyms: [gym],
        },
      };

      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          gyms: [updatedGym],
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const settings = versions.settings as IVersions<typeof oldStorage.settings>;
      const gymVersions = settings?.gyms as ICollectionVersions<IGym>;
      expect(gymVersions.items!.gym1).to.deep.equal({
        equipment: timestamp,
      });
    });
  });

  describe("nested object handling", () => {
    it("should handle deeply nested objects", () => {
      const oldStorage = Storage.getDefault();
      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          graphsSettings: {
            ...oldStorage.settings.graphsSettings,
            isSameXAxis: true,
          },
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const settings = versions.settings as IVersions<typeof oldStorage.settings>;
      expect(settings?.graphsSettings).to.deep.equal({
        isSameXAxis: timestamp,
      });
    });

    it("should handle nested collections", () => {
      const equipment: IEquipmentData = {
        vtype: "equipment_data",
        bar: { lb: { value: 45, unit: "lb" }, kg: { value: 20, unit: "kg" } },
        multiplier: 1,
        plates: [],
        fixed: [],
        isFixed: false,
      };

      const gym: IGym = {
        vtype: "gym",
        id: "gym1",
        name: "Gym 1",
        equipment: { barbell: equipment },
      };

      const oldStorage = {
        ...Storage.getDefault(),
        settings: {
          ...Settings.build(),
          gyms: [],
        },
      };

      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          gyms: [gym],
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const settings = versions.settings as IVersions<typeof oldStorage.settings>;
      const gymVersions = settings?.gyms as ICollectionVersions<IGym>;

      expect(gymVersions.items!.gym1).to.deep.equal({
        name: timestamp,
        equipment: timestamp,
      });
    });
  });

  describe("empty object handling", () => {
    it("should not include fields when no nested items changed", () => {
      const oldStorage = Storage.getDefault();
      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
        },
      };
      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      expect(versions).to.deep.equal({});
    });

    it("should not include collection fields when no items changed", () => {
      const program: IProgram = {
        vtype: "program",
        id: "prog1",
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program],
      };

      const newStorage = {
        ...oldStorage,
        programs: [program],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      expect(versions).to.deep.equal({});
    });

    it("should not include controlled object fields when no controlled fields changed", () => {
      const program: IProgram = {
        vtype: "program",
        id: "prog1",
        clonedAt: 1,
        name: "Program 1",
        description: "Description",
        url: "",
        author: "",
        nextDay: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program],
      };

      const newStorage = {
        ...oldStorage,
        programs: [{ ...program, description: "Updated Description" }],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      expect(versions).to.deep.equal({});
    });

    it("should include field when at least one nested item changed", () => {
      const oldStorage = Storage.getDefault();
      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          units: "kg" as const,
        },
      };
      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      expect(versions).to.deep.equal({
        settings: {
          units: timestamp,
        },
      });
    });

    it("should preserve existing versions even if no new changes", () => {
      const oldStorage = Storage.getDefault();
      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
        },
      };
      const existingVersions: IVersions<IStorage> = {
        settings: {
          units: 500,
          volume: 600,
        },
      };
      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, existingVersions, {}, timestamp);

      expect(versions).to.deep.equal({
        settings: {
          units: 500,
          volume: 600,
        },
      });
    });

    it("should remove items from deleted when they are re-added", () => {
      const program1: IProgram = {
        vtype: "program",
        id: "prog1",
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        clonedAt: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [],
        _versions: {
          programs: {
            items: {},
            deleted: { "1": 500 },
          },
        },
      };

      const newStorage = {
        ...oldStorage,
        programs: [program1],
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, oldStorage._versions!, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions).to.deep.equal({
        items: {
          "1": { name: timestamp, nextDay: timestamp },
        },
        deleted: {},
      });
    });

    it("should preserve collection structure when deleting all items from array", () => {
      const program1: IProgram = {
        vtype: "program",
        id: "prog1",
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        clonedAt: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const program2: IProgram = {
        ...program1,
        clonedAt: 2,
        id: "prog2",
        name: "Program 2",
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program1, program2],
      };

      const newStorage = {
        ...oldStorage,
        programs: [],
      };

      const timestamp = 1000;
      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions).to.deep.equal({
        items: {},
        deleted: {
          "1": timestamp,
          "2": timestamp,
        },
      });
    });

    it("should preserve collection structure when deleting all items from dictionary", () => {
      const oldStorage = Storage.getDefault();
      const newStorage: IStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          exerciseData: {
            "bench-press": { rm1: Weight.build(100, "lb") },
            squat: { rm1: Weight.build(150, "lb") },
          },
        },
      };

      const timestamp1 = 1000;
      const versions1 = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp1);

      const storageWithEmptyDict = {
        ...newStorage,
        settings: {
          ...newStorage.settings,
          exerciseData: {},
        },
      };

      const timestamp2 = 2000;
      const versions2 = versionTracker.updateVersions(newStorage, storageWithEmptyDict, versions1, {}, timestamp2);

      const exercisesVersions = (versions2.settings as IVersions<any>).exerciseData as ICollectionVersions<any>;
      expect(exercisesVersions).to.deep.equal({
        items: {},
        deleted: {
          "bench-press": timestamp2,
          squat: timestamp2,
        },
      });
    });

    describe("edge cases", () => {
      it("should handle null to object transitions", () => {
        const oldStorage: IStorage = {
          ...Storage.getDefault(),
          currentProgramId: undefined,
        };

        const newStorage: IStorage = {
          ...oldStorage,
          currentProgramId: "program-123",
        };

        const timestamp = 1000;

        const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

        expect(versions.currentProgramId).to.equal(timestamp);
      });

      it("should handle object to null transitions", () => {
        const oldStorage: IStorage = {
          ...Storage.getDefault(),
          currentProgramId: "program-123",
        };

        const newStorage: IStorage = {
          ...oldStorage,
          currentProgramId: undefined,
        };

        const timestamp = 1000;

        const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

        expect(versions.currentProgramId).to.equal(timestamp);
      });

      it("should handle items without IDs in arrays", () => {
        const oldStorage = {
          ...Storage.getDefault(),
          reviewRequests: [1, 2, 3],
        };

        const newStorage = {
          ...oldStorage,
          reviewRequests: [1, 2, 3, 4],
        };

        const timestamp = 1000;

        const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

        expect(versions.reviewRequests).to.equal(timestamp);
      });

      it("should handle circular references gracefully", () => {
        const oldStorage = Storage.getDefault();
        const newStorage = {
          ...oldStorage,
          settings: {
            ...oldStorage.settings,
            exercises: {
              ex1: {
                vtype: "custom_exercise" as const,
                id: "ex1",
                name: "Exercise 1",
                isDeleted: false,
                meta: {
                  bodyParts: [],
                  targetMuscles: [],
                  synergistMuscles: [],
                },
              },
            },
          },
        };

        const timestamp = 1000;

        const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

        const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
        const exerciseVersions = settingsVersions.exercises as unknown as ICollectionVersions<ICustomExercise>;
        expect(exerciseVersions.items!.ex1).to.equal(timestamp);
      });
    });
  });
});
