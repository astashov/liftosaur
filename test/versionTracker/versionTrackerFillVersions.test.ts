/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { ICollectionVersions, IVersions, VersionTracker } from "../../src/models/versionTracker";
import { Storage } from "../../src/models/storage";
import { ICustomExercise, IGym, IHistoryRecord, IProgram, STORAGE_VERSION_TYPES } from "../../src/types";

describe("fillVersions", () => {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES);
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
      name: 1000, // Existing preserved (missing fields not added since partial versions exist)
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
      name: 1000, // Existing preserved (missing fields not added since partial versions exist)
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
