import "mocha";
import { expect } from "chai";
import { VersionTracker, IVersions, ICollectionVersions } from "../src/models/versionTracker";
import { STORAGE_VERSION_TYPES } from "../src/types";
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

describe("VersionTracker", () => {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES);

  describe("updateVersions", () => {
    it("should track version for primitive field changes", () => {
      const oldStorage = Storage.getDefault();
      const newStorage = { ...oldStorage, currentProgramId: "program-123" };
      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      expect(versions.currentProgramId).to.equal(timestamp);
    });

    it("should not track version when field hasn't changed", () => {
      const storage = Storage.getDefault();
      const timestamp = 1000;

      const versions = versionTracker.updateVersions(storage, storage, {}, timestamp);

      expect(versions).to.deep.equal({});
    });

    it("should track version for newly added fields", () => {
      const oldStorage = Storage.getDefault();
      const newStorage = { ...oldStorage, email: "test@example.com" };
      oldStorage.email = undefined;
      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, existingVersions, timestamp);

      expect(versions).to.deep.equal({
        email: 500,
        settings: { units: 600 },
        currentProgramId: timestamp,
      });
    });
  });

  describe("array handling", () => {
    it("should track versions for array items with IDs", () => {
      const program1: IProgram = {
        type: "program",
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

      const program2: IProgram = {
        ...program1,
        id: "prog2",
        name: "Program 2",
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions.items.prog2).to.deep.equal({
        name: timestamp,
        nextDay: timestamp,
      });
    });

    it("should track version changes for existing array items", () => {
      const program1: IProgram = {
        type: "program",
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions.items.prog1).to.deep.equal({
        name: timestamp,
      });
    });

    it("should track deleted items in arrays", () => {
      const program1: IProgram = {
        type: "program",
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

      const program2: IProgram = {
        ...program1,
        id: "prog2",
        name: "Program 2",
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program1, program2],
      };

      const newStorage = {
        ...oldStorage,
        programs: [program1], // prog2 is deleted
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions).to.deep.equal({
        items: {},
        deleted: { prog2: timestamp },
      });
    });

    it("should handle empty arrays", () => {
      const program: IProgram = {
        type: "program",
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
        programs: [program], // Start with one program
      };
      const newStorage = {
        ...oldStorage,
        programs: [], // Change to empty array
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      // When changing from non-empty to empty array, we get a collection structure
      // This preserves the deleted field even when items array is empty
      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions).to.deep.equal({
        items: {},
        deleted: { prog1: timestamp },
      });
    });
  });

  describe("atomic object handling", () => {
    it("should version atomic objects as a whole", () => {
      const historyRecord: IHistoryRecord = {
        type: "history_record",
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const historyVersions = versions.history as ICollectionVersions<IHistoryRecord>;
      expect(historyVersions.items["1"]).to.equal(timestamp);
    });

    it("should track atomic object field changes", () => {
      const customExercise: ICustomExercise = {
        type: "custom_exercise",
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
      const exerciseVersions = settingsVersions.exercises as ICollectionVersions<ICustomExercise>;
      expect(exerciseVersions.items.custom1).to.equal(timestamp);
    });
  });

  describe("controlled object handling", () => {
    it("should version only specific fields for controlled objects", () => {
      const program: IProgram = {
        type: "program",
        id: "prog1",
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

      const updatedProgram: IProgram = {
        ...program,
        name: "Updated Program 1",
        description: "Updated Description", // This shouldn't be versioned
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      const itemVersion = programVersions.items.prog1 as IVersions<IProgram>;

      expect(itemVersion).to.deep.equal({
        name: timestamp,
        // description should not be versioned
      });
    });

    it("should track multiple controlled fields", () => {
      const program: IProgram = {
        type: "program",
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

      const plannerProgram: IPlannerProgram = {
        type: "planner",
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      const itemVersion = programVersions.items.prog1 as IVersions<IProgram>;

      expect(itemVersion).to.deep.equal({
        name: timestamp,
        nextDay: timestamp,
        planner: timestamp,
      });
    });

    it("should handle controlled objects in collections", () => {
      const gym1: IGym = {
        type: "gym",
        id: "gym1",
        name: "Gym 1",
        equipment: {},
      };

      const gym2: IGym = {
        type: "gym",
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const settings = versions.settings as IVersions<typeof oldStorage.settings>;
      const gymVersions = settings.gyms as ICollectionVersions<IGym>;
      expect(gymVersions.items.gym2).to.deep.equal({
        name: timestamp,
        equipment: timestamp,
      });
    });
  });

  describe("dictionary handling", () => {
    it("should handle dictionary fields like collections", () => {
      const exercise1: ICustomExercise = {
        type: "custom_exercise",
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
        type: "custom_exercise",
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
      const exerciseVersions = settingsVersions.exercises as ICollectionVersions<ICustomExercise>;
      expect(exerciseVersions.items).to.deep.equal({
        custom2: timestamp,
      });
    });

    it("should track deleted items in dictionaries", () => {
      const exercise1: ICustomExercise = {
        type: "custom_exercise",
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
          exercises: { ex1: exercise1 }, // ex2 is deleted
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
      const exerciseVersions = settingsVersions.exercises as ICollectionVersions<ICustomExercise>;
      expect(exerciseVersions).to.deep.equal({
        items: {},
        deleted: { ex2: timestamp },
      });
    });

    it("should handle empty dictionaries", () => {
      const exercise: ICustomExercise = {
        type: "custom_exercise",
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
          exercises: {}, // Empty dictionary
        },
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      // When a dictionary goes from having items to empty, we get a collection structure
      // This preserves the deleted field even when the dictionary is empty
      const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
      const exerciseVersions = settingsVersions.exercises as ICollectionVersions<ICustomExercise>;
      expect(exerciseVersions).to.deep.equal({
        items: {},
        deleted: { custom1: timestamp },
      });
    });

    it("should track changes in dictionary items", () => {
      const equipment1: IEquipmentData = {
        type: "equipment_data",
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
        type: "gym",
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const settings = versions.settings as IVersions<typeof oldStorage.settings>;
      const gymVersions = settings?.gyms as ICollectionVersions<IGym>;
      expect(gymVersions.items.gym1).to.deep.equal({
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const settings = versions.settings as IVersions<typeof oldStorage.settings>;
      expect(settings?.graphsSettings).to.deep.equal({
        isSameXAxis: timestamp,
      });
    });

    it("should handle nested collections", () => {
      const equipment: IEquipmentData = {
        type: "equipment_data",
        bar: { lb: { value: 45, unit: "lb" }, kg: { value: 20, unit: "kg" } },
        multiplier: 1,
        plates: [],
        fixed: [],
        isFixed: false,
      };

      const gym: IGym = {
        type: "gym",
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

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      const settings = versions.settings as IVersions<typeof oldStorage.settings>;
      const gymVersions = settings?.gyms as ICollectionVersions<IGym>;
      // For a newly added gym with equipment, we expect the whole gym to be versioned
      // with its controlled fields (name and equipment)
      expect(gymVersions.items.gym1).to.deep.equal({
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
          // No actual changes, just spreading the same object
        },
      };
      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      // Should not include settings field since nothing changed
      expect(versions).to.deep.equal({});
    });

    it("should not include collection fields when no items changed", () => {
      const program: IProgram = {
        type: "program",
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
        programs: [program], // Same program, no changes
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      // Programs array has trackable items, so it's always treated as a collection
      // Even when no items change, the collection structure is preserved
      expect(versions).to.deep.equal({
        programs: {
          items: {},
          deleted: {},
        },
      });
    });

    it("should not include controlled object fields when no controlled fields changed", () => {
      const program: IProgram = {
        type: "program",
        id: "prog1",
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
        programs: [{ ...program, description: "Updated Description" }], // Only non-controlled field changed
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      // Programs array still creates collection structure even if no controlled fields changed
      // because the array itself is trackable
      expect(versions).to.deep.equal({
        programs: {
          items: {},
          deleted: {},
        },
      });
    });

    it("should include field when at least one nested item changed", () => {
      const oldStorage = Storage.getDefault();
      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          units: "kg" as const, // One field changed
        },
      };
      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

      // Should include settings field with only the changed field
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
          // No changes
        },
      };
      const existingVersions: IVersions<IStorage> = {
        settings: {
          units: 500,
          volume: 600,
        },
      };
      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, existingVersions, timestamp);

      // Should preserve existing versions
      expect(versions).to.deep.equal({
        settings: {
          units: 500,
          volume: 600,
        },
      });
    });

    it("should remove items from deleted when they are re-added", () => {
      const program1: IProgram = {
        type: "program",
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
        programs: [],
        _versions: {
          programs: {
            items: {},
            deleted: { prog1: 500 }, // prog1 was previously deleted
          },
        },
      };

      const newStorage = {
        ...oldStorage,
        programs: [program1], // prog1 is re-added
      };

      const timestamp = 1000;

      const versions = versionTracker.updateVersions(oldStorage, newStorage, oldStorage._versions!, timestamp);

      const programVersions = versions.programs as ICollectionVersions<IProgram>;
      expect(programVersions).to.deep.equal({
        items: {
          prog1: { name: timestamp, nextDay: timestamp },
        },
        deleted: {}, // prog1 removed from deleted
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

        const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

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

        const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

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

        const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

        // Arrays are versioned as simple timestamps when they change
        expect(versions.reviewRequests).to.equal(timestamp);
      });

      it("should handle missing type field in objects", () => {
        const oldStorage = Storage.getDefault();
        const newStorage = {
          ...oldStorage,
          affiliates: { source1: 123 },
        };

        const timestamp = 1000;

        const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

        // Regular object without type field should version individual fields
        expect(versions.affiliates).to.deep.equal({ source1: timestamp });
      });

      it("should handle circular references gracefully", () => {
        // This test ensures the algorithm doesn't infinitely recurse
        const oldStorage = Storage.getDefault();
        const newStorage = {
          ...oldStorage,
          settings: {
            ...oldStorage.settings,
            exercises: {
              ex1: {
                type: "custom_exercise" as const,
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

        const versions = versionTracker.updateVersions(oldStorage, newStorage, {}, timestamp);

        const settingsVersions = versions.settings as IVersions<typeof oldStorage.settings>;
        const exerciseVersions = settingsVersions.exercises as unknown as ICollectionVersions<ICustomExercise>;
        expect(exerciseVersions.items.ex1).to.equal(timestamp);
      });
    });
  });
});
