/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { IVersions, VersionTracker } from "../../src/models/versionTracker";
import { IProgram, IHistoryRecord, STORAGE_VERSION_TYPES } from "../../src/types";

describe("mergeByVersions", () => {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES);

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
      clonedAt: 1,
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

    expect(merged.program).to.deep.equal({
      vtype: "program",
      id: "prog1",
      name: "New Program",
      description: "Old Description",
      url: "",
      author: "",
      clonedAt: 1,
      nextDay: 1,
      days: [],
      weeks: [],
      exercises: [],
      isMultiweek: false,
      tags: [],
    });
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
