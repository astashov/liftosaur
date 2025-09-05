/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { VersionTracker, IVersions, ICollectionVersions, IVersionTypes } from "../src/models/versionTracker";
import { IAtomicType, IControlledType, ISubscriptionReceipt, STORAGE_VERSION_TYPES } from "../src/types";
import { Storage } from "../src/models/storage";
import { Settings } from "../src/models/settings";
import {
  IStorage,
  IProgram,
  IHistoryRecord,
  ICustomExercise,
  IGym,
  IEquipmentData,
  IPlannerProgram,
} from "../src/types";
import { Weight } from "../src/models/weight";
import { ObjectUtils } from "../src/utils/object";

describe("VersionTracker", () => {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES);

  describe("updateVersions", () => {
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

        it("should handle missing type field in objects", () => {
          const oldStorage = Storage.getDefault();
          const newStorage = {
            ...oldStorage,
            affiliates: { source1: 123 },
          };

          const timestamp = 1000;

          const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

          expect(versions.affiliates).to.deep.equal({ source1: timestamp });
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

  describe("diffVersions", () => {
    it("should return undefined when no changes", () => {
      const oldVersions: IVersions<any> = {
        name: 1000,
        age: 2000,
      };
      const newVersions: IVersions<any> = {
        name: 1000,
        age: 2000,
      };

      const diff = versionTracker.diffVersions(oldVersions, newVersions);
      expect(diff).to.be.undefined;
    });

    it("should return only changed fields", () => {
      const oldVersions: IVersions<any> = {
        name: 1000,
        age: 2000,
        email: 3000,
      };
      const newVersions: IVersions<any> = {
        name: 1000,
        age: 4000,
        email: 3000,
      };

      const diff = versionTracker.diffVersions(oldVersions, newVersions);
      expect(diff).to.deep.equal({
        age: 4000,
      });
    });

    it("should handle nested version changes", () => {
      const oldVersions: IVersions<any> = {
        settings: {
          theme: 1000,
          language: 2000,
        },
      };
      const newVersions: IVersions<any> = {
        settings: {
          theme: 3000,
          language: 2000,
        },
      };

      const diff = versionTracker.diffVersions(oldVersions, newVersions);
      expect(diff).to.deep.equal({
        settings: {
          theme: 3000,
        },
      });
    });

    it("should handle collection version diffs", () => {
      const oldVersions: IVersions<any> = {
        programs: {
          items: {
            prog1: 1000,
            prog2: 2000,
          },
          deleted: {},
        },
      };
      const newVersions: IVersions<any> = {
        programs: {
          items: {
            prog1: 1000,
            prog2: 3000,
            prog3: 4000,
          },
          deleted: {
            prog4: 5000,
          },
        },
      };

      const diff = versionTracker.diffVersions(oldVersions, newVersions);
      expect(diff).to.deep.equal({
        programs: {
          items: {
            prog2: 3000,
            prog3: 4000,
          },
          deleted: {
            prog4: 5000,
          },
        },
      });
    });

    it("should handle collection with nested version objects", () => {
      const oldVersions: IVersions<any> = {
        programs: {
          items: {
            prog1: { name: 1000, nextDay: 2000 },
          },
          deleted: {},
        },
      };
      const newVersions: IVersions<any> = {
        programs: {
          items: {
            prog1: { name: 3000, nextDay: 2000 },
          },
          deleted: {},
        },
      };

      const diff = versionTracker.diffVersions(oldVersions, newVersions);
      expect(diff).to.deep.equal({
        programs: {
          deleted: {},
          items: {
            prog1: { name: 3000 },
          },
        },
      });
    });

    it("should handle when oldVersions is undefined", () => {
      const newVersions: IVersions<any> = {
        name: 1000,
        settings: {
          theme: 2000,
        },
      };

      const diff = versionTracker.diffVersions(undefined, newVersions);
      expect(diff).to.deep.equal(newVersions);
    });
  });

  describe("extractByVersions", () => {
    it("should extract only fields present in versions", () => {
      const obj = {
        name: "John",
        age: 30,
        email: "john@example.com",
        phone: "123-456-7890",
      };
      const versions: IVersions<any> = {
        name: 1000,
        email: 2000,
      };

      const extracted = versionTracker.extractByVersions(obj, versions);
      expect(extracted).to.deep.equal({
        name: "John",
        email: "john@example.com",
      });
    });

    it("should handle nested objects", () => {
      const obj = {
        name: "John",
        settings: {
          theme: "dark",
          language: "en",
          notifications: true,
        },
      };
      const versions: IVersions<any> = {
        settings: {
          theme: 1000,
          notifications: 2000,
        },
      };

      const extracted = versionTracker.extractByVersions(obj, versions);
      expect(extracted).to.deep.equal({
        settings: {
          theme: "dark",
          notifications: true,
        },
      });
    });

    it("should extract entire controlled object when controlled field is in versions", () => {
      const program: IProgram = {
        vtype: "program",
        id: "prog1",
        name: "Updated Program",
        description: "Full description",
        url: "http://example.com",
        author: "Author",
        nextDay: 2,
        clonedAt: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: ["beginner", "barbell"],
      };

      const obj = {
        programs: [program],
      };

      const versions: IVersions<any> = {
        programs: {
          items: {
            "1": { name: 1000 },
          },
        },
      };

      const extracted = versionTracker.extractByVersions(obj, versions);
      expect(extracted).to.deep.equal({
        programs: [program],
      });
    });

    it("should handle array collections", () => {
      const prog1: IProgram = {
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

      const prog2: IProgram = {
        ...prog1,
        clonedAt: 2,
        id: "prog2",
        name: "Program 2",
      };

      const prog3: IProgram = {
        ...prog1,
        id: "prog3",
        clonedAt: 3,
        name: "Program 3",
      };

      const obj = {
        programs: [prog1, prog2, prog3],
      };

      const versions: IVersions<any> = {
        programs: {
          items: {
            "1": 1000,
            "3": 2000,
          },
        },
      };

      const extracted = versionTracker.extractByVersions(obj, versions);

      expect(extracted).to.deep.equal({
        programs: [prog1, prog3],
      });
    });

    it("should handle dictionary collections", () => {
      const obj = {
        settings: {
          exercises: {
            "bench-press": { rm1: 100, notes: "Good form" },
            squat: { rm1: 150, notes: "Depth check" },
            deadlift: { rm1: 200, notes: "Back straight" },
          },
        },
      };

      const versions: IVersions<any> = {
        settings: {
          exercises: {
            items: {
              "bench-press": 1000,
              deadlift: 2000,
            },
          },
        },
      };

      const extracted = versionTracker.extractByVersions(obj, versions);
      expect(extracted).to.deep.equal({
        settings: {
          exercises: {
            "bench-press": { rm1: 100, notes: "Good form" },
            deadlift: { rm1: 200, notes: "Back straight" },
          },
        },
      });
    });

    it("should handle collections with nested versioned objects", () => {
      const obj = {
        programs: [
          {
            vtype: "program",
            id: "prog1",
            clonedAt: 1,
            name: "Program 1",
            description: "Desc 1",
            nextDay: 1,
          },
        ],
      };

      const versions: IVersions<any> = {
        programs: {
          items: {
            "1": {
              name: 1000,
            },
          },
        },
      };

      const extracted = versionTracker.extractByVersions(obj, versions);
      expect((extracted as any).programs[0]).to.include({
        vtype: "program",
        id: "prog1",
        clonedAt: 1,
        name: "Program 1",
        description: "Desc 1",
        nextDay: 1,
      });
    });

    it("should return empty object when no fields match versions", () => {
      const obj = {
        name: "John",
        age: 30,
      };
      const versions: IVersions<any> = {
        email: 1000,
        phone: 2000,
      };

      const extracted = versionTracker.extractByVersions(obj, versions);
      expect(extracted).to.deep.equal({});
    });

    it("should handle atomic objects", () => {
      const historyRecord: IHistoryRecord = {
        vtype: "history_record",
        id: 123,
        date: "2024-01-01",
        programId: "prog1",
        programName: "Program 1",
        dayName: "Day 1",
        day: 1,
        entries: [],
        startTime: 0,
        endTime: 0,
      };

      const obj = {
        history: [historyRecord],
      };

      const versions: IVersions<any> = {
        history: {
          items: {
            123: 1000,
          },
        },
      };

      const extracted = versionTracker.extractByVersions(obj, versions);
      expect(extracted).to.deep.equal({
        history: [historyRecord],
      });
    });
  });

  describe("mergeByVersions", () => {
    it("should merge simple fields based on version timestamps", () => {
      const fullObj = {
        name: "John",
        age: 30,
        email: "john@old.com",
      };

      const fullVersions: IVersions<any> = {
        name: 1000,
        age: 2000,
        email: 3000,
      };

      const versionDiff: IVersions<any> = {
        name: 5000,
        age: 1500,
        email: 4000,
      };

      const extractedObj = {
        name: "Jane",
        age: 31,
        email: "jane@new.com",
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged).to.deep.equal({
        name: "Jane",
        age: 30,
        email: "jane@new.com",
      });
    });

    it("should merge nested objects", () => {
      const fullObj = {
        settings: {
          theme: "dark",
          language: "en",
          volume: 50,
        },
      };

      const fullVersions: IVersions<any> = {
        settings: {
          theme: 1000,
          language: 2000,
          volume: 3000,
        },
      };

      const versionDiff: IVersions<any> = {
        settings: {
          theme: 4000,
          language: 1500,
        },
      };

      const extractedObj = {
        settings: {
          theme: "light",
          language: "es",
        },
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged).to.deep.equal({
        settings: {
          theme: "light",
          language: "en",
          volume: 50,
        },
      });
    });

    it("should handle controlled objects", () => {
      const fullProgram: IProgram = {
        vtype: "program",
        id: "prog1",
        name: "Old Program",
        description: "Old Description",
        url: "",
        author: "",
        nextDay: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const extractedProgram: IProgram = {
        ...fullProgram,
        name: "New Program",
        description: "New Description",
        nextDay: 2,
      };

      const fullObj = { program: fullProgram };
      const fullVersions: IVersions<any> = {
        program: {
          name: 1000,
          nextDay: 2000,
        },
      };

      const versionDiff: IVersions<any> = {
        program: {
          name: 3000,
          nextDay: 1500,
        },
      };

      const extractedObj = { program: extractedProgram };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged.program).to.deep.equal(extractedProgram);
    });

    it("should merge array collections", () => {
      const prog1 = { vtype: "program", id: "prog1", clonedAt: 1, name: "Program 1" };
      const prog2 = { vtype: "program", id: "prog2", clonedAt: 2, name: "Program 2" };
      const prog3 = { vtype: "program", id: "prog3", clonedAt: 3, name: "Program 3" };
      const prog2Updated = { vtype: "program", id: "prog2", clonedAt: 2, name: "Program 2 Updated" };

      const fullObj = {
        programs: [prog1, prog2, prog3],
      };

      const fullVersions: IVersions<any> = {
        programs: {
          items: {
            "1": 1000,
            "2": 2000,
            "3": 3000,
          },
        },
      };

      const versionDiff: IVersions<any> = {
        programs: {
          items: {
            "2": 4000,
          },
          deleted: {
            "3": 5000,
          },
        },
      };

      const extractedObj = {
        programs: [prog2Updated],
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged.programs).to.have.length(2);
      expect(merged.programs).to.deep.include(prog1);
      expect(merged.programs).to.deep.include(prog2Updated);
    });

    it("should merge dictionary collections", () => {
      const fullObj = {
        settings: {
          exercises: {
            "bench-press": { rm1: 100 },
            squat: { rm1: 150 },
            deadlift: { rm1: 200 },
          },
        },
      };

      const fullVersions: IVersions<any> = {
        settings: {
          exercises: {
            items: {
              "bench-press": 1000,
              squat: 2000,
              deadlift: 3000,
            },
          },
        },
      };

      const versionDiff: IVersions<any> = {
        settings: {
          exercises: {
            items: {
              "bench-press": 4000,
              "overhead-press": 5000,
            },
            deleted: {
              deadlift: 6000,
            },
          },
        },
      };

      const extractedObj = {
        settings: {
          exercises: {
            "bench-press": { rm1: 120 },
            "overhead-press": { rm1: 80 },
          },
        },
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged.settings.exercises).to.deep.equal({
        "bench-press": { rm1: 120 },
        squat: { rm1: 150 },
        "overhead-press": { rm1: 80 },
      });
    });

    it("should handle missing full versions", () => {
      const fullObj = {
        name: "John",
        newField: "should be replaced",
      };

      const fullVersions: IVersions<any> = {
        name: 1000,
      };

      const versionDiff: IVersions<any> = {
        newField: 2000,
      };

      const extractedObj = {
        newField: "new value",
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged).to.deep.equal({
        name: "John",
        newField: "new value",
      });
    });

    it("should handle complex nested structures", () => {
      const fullObj = {
        users: {
          user1: {
            name: "User 1",
            settings: {
              theme: "dark",
              notifications: true,
            },
          },
          user2: {
            name: "User 2",
            settings: {
              theme: "light",
              notifications: false,
            },
          },
        },
      };

      const fullVersions: IVersions<any> = {
        users: {
          user1: {
            settings: {
              theme: 1000,
              notifications: 2000,
            },
          },
          user2: {
            settings: {
              theme: 3000,
              notifications: 4000,
            },
          },
        },
      };

      const versionDiff: IVersions<any> = {
        users: {
          user1: {
            settings: {
              theme: 5000,
            },
          },
          user2: {
            settings: {
              notifications: 3500,
            },
          },
        },
      };

      const extractedObj = {
        users: {
          user1: {
            settings: {
              theme: "blue",
            },
          },
          user2: {
            settings: {
              notifications: true,
            },
          },
        },
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged.users.user1.settings).to.deep.equal({
        theme: "blue",
        notifications: true,
      });

      expect(merged.users.user2.settings).to.deep.equal({
        theme: "light",
        notifications: false,
      });
    });

    it("should handle atomic objects in collections", () => {
      const record1: IHistoryRecord = {
        vtype: "history_record",
        id: 1,
        date: "2024-01-01",
        programId: "prog1",
        programName: "Program 1",
        dayName: "Day 1",
        day: 1,
        entries: [],
        startTime: 0,
        endTime: 0,
      };

      const record1Updated = {
        ...record1,
        dayName: "Day 1 Updated",
        entries: [{ exercise: "bench" }],
      };

      const fullObj = {
        history: [record1],
      };

      const fullVersions: IVersions<any> = {
        history: {
          items: {
            1: 1000,
          },
        },
      };

      const versionDiff: IVersions<any> = {
        history: {
          items: {
            1: 2000,
          },
        },
      };

      const extractedObj = {
        history: [record1Updated],
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged.history[0]).to.deep.equal(record1Updated);
    });
  });

  describe("mergeVersions", () => {
    it("should merge simple timestamp fields taking higher values", () => {
      const fullVersions: IVersions<any> = {
        name: 1000,
        age: 2000,
        email: 3000,
      };

      const versionDiff: IVersions<any> = {
        name: 500,
        age: 2500,
        phone: 4000,
      };

      const merged = versionTracker.mergeVersions(fullVersions, versionDiff);

      expect(merged).to.deep.equal({
        name: 1000,
        age: 2500,
        email: 3000,
        phone: 4000,
      });
    });

    it("should merge nested version objects", () => {
      const fullVersions: IVersions<any> = {
        settings: {
          theme: 1000,
          language: 2000,
        },
        profile: {
          name: 3000,
        },
      };

      const versionDiff: IVersions<any> = {
        settings: {
          theme: 1500,
          volume: 2500,
        },
        profile: {
          name: 2500,
          avatar: 4000,
        },
      };

      const merged = versionTracker.mergeVersions(fullVersions, versionDiff);

      expect(merged).to.deep.equal({
        settings: {
          theme: 1500,
          language: 2000,
          volume: 2500,
        },
        profile: {
          name: 3000,
          avatar: 4000,
        },
      });
    });

    it("should merge collection versions", () => {
      const fullVersions: IVersions<any> = {
        programs: {
          items: {
            prog1: 1000,
            prog2: 2000,
          },
          deleted: {
            prog3: 3000,
            prog8: 6000,
          },
        },
      };

      const versionDiff: IVersions<any> = {
        programs: {
          items: {
            prog1: 1500,
            prog2: 1800,
            prog4: 4000,
          },
          deleted: {
            prog3: 2500,
            prog5: 5000,
          },
        },
      };

      const merged = versionTracker.mergeVersions(fullVersions, versionDiff);

      expect(merged).to.deep.equal({
        programs: {
          items: {
            prog1: 1500,
            prog2: 2000,
            prog4: 4000,
          },
          deleted: {
            prog3: 3000,
            prog5: 5000,
            prog8: 6000,
          },
        },
      });
    });

    it("should nuke 'deleted' with nukedeleted flag", () => {
      const fullVersions: IVersions<any> = {
        programs: {
          items: {
            prog1: 1000,
            prog2: 2000,
          },
          deleted: {
            prog3: 3000,
            prog8: 6000,
          },
          nukedeleted: 0,
        },
      };

      const versionDiff: IVersions<any> = {
        programs: {
          items: {
            prog1: 1500,
            prog2: 1800,
            prog4: 4000,
          },
          deleted: {
            prog3: 2500,
            prog5: 5000,
          },
        },
      };

      const merged = versionTracker.mergeVersions(fullVersions, versionDiff);
      expect(merged).to.deep.equal({
        programs: {
          items: {
            prog1: 1500,
            prog2: 2000,
            prog4: 4000,
          },
          deleted: {},
          nukedeleted: 1,
        },
      });

      const fullVersions2: IVersions<any> = {
        programs: {
          items: {
            prog8: 3000,
          },
          deleted: {
            prog3: 2500,
            prog5: 5000,
          },
        },
      };
      const merged2 = versionTracker.mergeVersions(fullVersions2, merged);
      expect(merged2).to.deep.equal({
        programs: {
          items: {
            prog1: 1500,
            prog2: 2000,
            prog4: 4000,
            prog8: 3000,
          },
          deleted: {},
          nukedeleted: 2,
        },
      });
    });

    it("should merge collections with nested version objects", () => {
      const fullVersions: IVersions<any> = {
        programs: {
          deleted: {},
          items: {
            prog1: {
              name: 1000,
              nextDay: 2000,
            },
          },
        },
      };

      const versionDiff: IVersions<any> = {
        programs: {
          deleted: {},
          items: {
            prog1: {
              name: 1500,
              nextDay: 1800,
              planner: 3000,
            },
            prog2: {
              name: 4000,
            },
          },
        },
      };

      const merged = versionTracker.mergeVersions(fullVersions, versionDiff);

      expect(merged).to.deep.equal({
        programs: {
          deleted: {},
          items: {
            prog1: {
              name: 1500,
              nextDay: 2000,
              planner: 3000,
            },
            prog2: {
              name: 4000,
            },
          },
        },
      });
    });

    it("should handle empty full versions", () => {
      const fullVersions: IVersions<any> = {};

      const versionDiff: IVersions<any> = {
        name: 1000,
        settings: {
          theme: 2000,
        },
        programs: {
          deleted: {},
          items: {
            prog1: 3000,
          },
        },
      };

      const merged = versionTracker.mergeVersions(fullVersions, versionDiff);

      expect(merged).to.deep.equal(versionDiff);
    });

    it("should handle empty diff", () => {
      const fullVersions: IVersions<any> = {
        name: 1000,
        settings: {
          theme: 2000,
        },
      };

      const versionDiff: IVersions<any> = {};

      const merged = versionTracker.mergeVersions(fullVersions, versionDiff);

      expect(merged).to.deep.equal(fullVersions);
    });

    it("should handle deeply nested structures", () => {
      const fullVersions: IVersions<any> = {
        level1: {
          level2: {
            level3: {
              field1: 1000,
              field2: 2000,
            },
          },
        },
      };

      const versionDiff: IVersions<any> = {
        level1: {
          level2: {
            level3: {
              field1: 500,
              field2: 2500,
              field3: 3000,
            },
            newLevel3: {
              field4: 4000,
            },
          },
        },
      };

      const merged = versionTracker.mergeVersions(fullVersions, versionDiff);

      expect(merged).to.deep.equal({
        level1: {
          level2: {
            level3: {
              field1: 1000,
              field2: 2500,
              field3: 3000,
            },
            newLevel3: {
              field4: 4000,
            },
          },
        },
      });
    });

    it("should preserve collection structure when merging", () => {
      const fullVersions: IVersions<any> = {
        exercises: {
          items: {},
          deleted: {},
        },
      };

      const versionDiff: IVersions<any> = {
        exercises: {
          items: {
            ex1: 1000,
          },
          deleted: {
            ex2: 2000,
          },
        },
      };

      const merged = versionTracker.mergeVersions(fullVersions, versionDiff);

      expect(merged).to.deep.equal({
        exercises: {
          items: {
            ex1: 1000,
          },
          deleted: {
            ex2: 2000,
          },
        },
      });
    });
  });

  describe("fillVersions", () => {
    it("should add timestamps for missing primitive fields", () => {
      const storage = Storage.getDefault();
      const fullObj = {
        ...storage,
        currentProgramId: "program-123",
        email: "test@example.com",
      };
      const existingVersions: IVersions<typeof fullObj> = {
        currentProgramId: 1000,
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);

      expect(filled.currentProgramId).to.equal(1000); // Existing version preserved
      expect(filled.email).to.equal(timestamp); // Missing version added
    });

    it("should handle nested objects", () => {
      const fullObj = {
        settings: {
          theme: "dark",
          language: "en",
          notifications: true,
        },
      };
      const existingVersions: IVersions<typeof fullObj> = {
        settings: {
          theme: 1000,
        },
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);

      expect(filled.settings).to.deep.equal({
        theme: 1000, // Existing version preserved
        language: timestamp, // Missing version added
        notifications: timestamp, // Missing version added
      });
    });

    it("should handle array collections with trackable items", () => {
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
      };

      const fullObj = {
        programs: [program1, program2],
      };

      const existingVersions: IVersions<typeof fullObj> = {
        programs: {
          items: {
            "1": { name: 1000 },
          },
          deleted: {},
        },
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);
      const programVersions = filled.programs as ICollectionVersions<IProgram>;

      expect(programVersions.items!["1"]).to.deep.equal({
        name: 1000, // Existing preserved
        nextDay: timestamp, // Missing controlled field added
      });
      expect(programVersions.items!["2"]).to.deep.equal({
        name: timestamp,
        nextDay: timestamp,
      }); // Missing added for controlled fields
    });

    it("should handle dictionary fields", () => {
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

      const fullObj = {
        settings: {
          exercises: {
            ex1: exercise1,
            ex2: exercise2,
          },
        },
      };

      const existingVersions: IVersions<typeof fullObj> = {
        settings: {
          exercises: {
            items: {
              ex1: 1000,
            },
            deleted: {},
          },
        },
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);
      const exerciseVersions = (filled.settings as any).exercises as ICollectionVersions<ICustomExercise>;

      expect(exerciseVersions.items!.ex1).to.equal(1000); // Existing preserved
      expect(exerciseVersions.items!.ex2).to.equal(timestamp); // Missing added
    });

    it("should handle atomic objects", () => {
      const historyRecord: IHistoryRecord = {
        vtype: "history_record",
        id: 123,
        date: "2024-01-01",
        programId: "prog1",
        programName: "Program 1",
        dayName: "Day 1",
        day: 1,
        entries: [],
        startTime: 0,
        endTime: 0,
      };

      const fullObj = {
        history: [historyRecord],
      };

      const existingVersions: IVersions<typeof fullObj> = {
        history: {
          items: {},
          deleted: {},
        },
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);
      const historyVersions = filled.history as ICollectionVersions<IHistoryRecord>;

      expect(historyVersions.items!["123"]).to.equal(timestamp); // Atomic object gets single timestamp
    });

    it("should handle controlled objects with missing fields", () => {
      const gym: IGym = {
        vtype: "gym",
        id: "gym1",
        name: "Gym 1",
        equipment: {
          barbell: {
            vtype: "equipment_data",
            bar: { lb: { value: 45, unit: "lb" }, kg: { value: 20, unit: "kg" } },
            multiplier: 1,
            plates: [],
            fixed: [],
            isFixed: false,
          },
        },
      };

      const fullObj = {
        settings: {
          gyms: [gym],
        },
      };

      const existingVersions: IVersions<typeof fullObj> = {
        settings: {
          gyms: {
            items: {
              gym1: { name: 1000 }, // Only name is versioned
            },
            deleted: {},
          },
        },
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);
      const gymVersions = (filled.settings as any).gyms as ICollectionVersions<IGym>;

      expect(gymVersions.items!.gym1).to.deep.equal({
        name: 1000, // Existing preserved
        equipment: timestamp, // Missing controlled field added
      });
    });

    it("should handle deeply nested structures", () => {
      const fullObj = {
        level1: {
          level2: {
            level3: {
              field1: "value1",
              field2: "value2",
              field3: "value3",
            },
          },
        },
      };

      const existingVersions: IVersions<typeof fullObj> = {
        level1: {
          level2: {
            level3: {
              field1: 1000,
            },
          },
        },
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);

      expect(filled).to.deep.equal({
        level1: {
          level2: {
            level3: {
              field1: 1000, // Existing preserved
              field2: timestamp, // Missing added
              field3: timestamp, // Missing added
            },
          },
        },
      });
    });

    it("should handle empty existing versions", () => {
      const fullObj = {
        name: "John",
        age: 30,
        settings: {
          theme: "dark",
        },
      };

      const existingVersions: IVersions<typeof fullObj> = {};
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);

      expect(filled).to.deep.equal({
        name: timestamp,
        age: timestamp,
        settings: {
          theme: timestamp,
        },
      });
    });

    it("should handle null and undefined values", () => {
      const fullObj = {
        name: "John",
        email: null as any,
        phone: undefined as any,
        age: 30,
      };

      const existingVersions: IVersions<typeof fullObj> = {};
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);

      expect(filled).to.deep.equal({
        name: timestamp,
        age: timestamp,
        // email and phone are not included because they are null/undefined
      });
    });

    it("should handle arrays without trackable items", () => {
      const fullObj = {
        tags: ["tag1", "tag2", "tag3"],
        numbers: [1, 2, 3],
      };

      const existingVersions: IVersions<typeof fullObj> = {
        tags: 1000,
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);

      expect(filled).to.deep.equal({
        tags: 1000, // Existing preserved
        numbers: timestamp, // Missing added
      });
    });

    it("should preserve deleted items in collections", () => {
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

      const fullObj = {
        programs: [program],
      };

      const existingVersions: IVersions<typeof fullObj> = {
        programs: {
          items: {},
          deleted: { prog2: 1500 }, // Deleted item
        },
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);
      const programVersions = filled.programs as ICollectionVersions<IProgram>;

      expect(programVersions.deleted).to.deep.equal({ prog2: 1500 }); // Deleted preserved
      expect(programVersions.items!["1"]).to.deep.equal({
        name: timestamp,
        nextDay: timestamp,
      });
    });

    it("should preserve old items in versions", () => {
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

      const fullObj = {
        programs: [program],
      };

      const existingVersions: IVersions<typeof fullObj> = {
        programs: {
          items: {
            2: { name: 2000 },
            3: 3000,
          },
          deleted: { 4: 1500 },
        },
      };
      const timestamp = 2000;

      const filled = versionTracker.fillVersions(fullObj, existingVersions, timestamp);
      const programVersions = filled.programs as ICollectionVersions<IProgram>;

      expect(programVersions.deleted).to.deep.equal({ 4: 1500 });
      expect(programVersions.items).to.deep.equal({
        1: {
          name: 2000,
          nextDay: 2000,
        },
        2: { name: 2000 },
        3: 3000,
      });
    });
  });

  describe("tombstone compaction", () => {
    it("should compact old tombstones when merging versions", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: {
          "subscription.apple": 14 * 24 * 60 * 60 * 1000,
          "subscription.google": 14 * 24 * 60 * 60 * 1000,
        },
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 15 * 24 * 60 * 60 * 1000;
      const recentTimestamp = now - 5 * 24 * 60 * 60 * 1000;

      const fullVersions: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {
              "old-receipt": oldTimestamp,
              "recent-receipt": recentTimestamp,
            },
          },
        },
      };

      const versionDiff: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {},
          },
        },
      };

      const merged = tracker.mergeVersions(fullVersions, versionDiff);
      const appleDeleted = (merged.subscription as any).apple.deleted;

      expect(appleDeleted["old-receipt"]).to.be.undefined;

      expect(appleDeleted["recent-receipt"]).to.equal(recentTimestamp);
    });

    it("should keep tombstones when no threshold is configured", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: undefined,
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 30 * 24 * 60 * 60 * 1000;

      const fullVersions: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {
              "old-receipt": oldTimestamp,
            },
          },
        },
      };

      const versionDiff: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {},
          },
        },
      };

      const merged = tracker.mergeVersions(fullVersions, versionDiff);
      const appleDeleted = (merged.subscription as any).apple.deleted;

      expect(appleDeleted["old-receipt"]).to.equal(oldTimestamp);
    });

    it("should handle merging new tombstones during compaction", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: {
          "subscription.google": 14 * 24 * 60 * 60 * 1000,
        },
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 20 * 24 * 60 * 60 * 1000;
      const newTimestamp = now - 2 * 24 * 60 * 60 * 1000;

      const fullVersions: IVersions<IStorage> = {
        subscription: {
          google: {
            items: {},
            deleted: {
              "old-receipt": oldTimestamp,
            },
          },
        },
      };

      const versionDiff: IVersions<IStorage> = {
        subscription: {
          google: {
            items: {},
            deleted: {
              "new-receipt": newTimestamp,
            },
          },
        },
      };

      const merged = tracker.mergeVersions(fullVersions, versionDiff);
      const googleDeleted = (merged.subscription as any).google.deleted;

      expect(googleDeleted["old-receipt"]).to.be.undefined;
      expect(googleDeleted["new-receipt"]).to.equal(newTimestamp);
    });

    it("should compact old tombstones during updateVersions when field changes", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: {
          "subscription.apple": 14 * 24 * 60 * 60 * 1000, // 14 days
        },
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 20 * 24 * 60 * 60 * 1000; // 20 days ago
      const recentTimestamp = now - 5 * 24 * 60 * 60 * 1000; // 5 days ago

      // Simulate existing versions with old and recent tombstones
      const currentVersions: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {
              "old-receipt": oldTimestamp,
              "recent-receipt": recentTimestamp,
            },
          },
        },
      };

      const receipt: ISubscriptionReceipt = {
        vtype: "subscription_receipt",
        id: "new-receipt",
        value: "new-receipt-data",
        createdAt: now,
      };

      const oldStorage = Storage.getDefault();
      const newStorage = {
        ...Storage.getDefault(),
        subscription: {
          ...Storage.getDefault().subscription,
          apple: [receipt], // Add a new receipt to trigger field update
        },
      };

      // Update versions with a change that affects the subscription field
      const updatedVersions = tracker.updateVersions(oldStorage, newStorage, currentVersions, {}, now);
      const appleDeleted = (updatedVersions.subscription as any)?.apple?.deleted;

      // Old tombstone should be removed during update
      expect(appleDeleted["old-receipt"]).to.be.undefined;
      // Recent tombstone should be kept
      expect(appleDeleted["recent-receipt"]).to.equal(recentTimestamp);
    });

    it("should compact tombstones when items are deleted", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: {
          "subscription.google": 14 * 24 * 60 * 60 * 1000, // 14 days
        },
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 20 * 24 * 60 * 60 * 1000; // 20 days ago

      // Current versions with an old tombstone
      const currentVersions: IVersions<IStorage> = {
        subscription: {
          google: {
            items: {
              "current-receipt": now - 1 * 24 * 60 * 60 * 1000,
            },
            deleted: {
              "old-receipt": oldTimestamp,
            },
          },
        },
      };

      const receipt: ISubscriptionReceipt = {
        vtype: "subscription_receipt",
        id: "current-receipt",
        value: "receipt-data",
        createdAt: now,
      };

      const oldStorage = {
        ...Storage.getDefault(),
        subscription: {
          ...Storage.getDefault().subscription,
          google: [receipt],
        },
      };

      const newStorage = {
        ...Storage.getDefault(),
        subscription: {
          ...Storage.getDefault().subscription,
          google: [], // Deleted the receipt
        },
      };

      const updatedVersions = tracker.updateVersions(oldStorage, newStorage, currentVersions, {}, now);
      const googleDeleted = (updatedVersions.subscription as any)?.google?.deleted;

      // Old tombstone should be removed
      expect(googleDeleted["old-receipt"]).to.be.undefined;
      // New deletion should be tracked
      expect(googleDeleted["current-receipt"]).to.equal(now);
    });
  });
});
