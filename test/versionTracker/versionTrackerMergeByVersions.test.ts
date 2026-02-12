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

  describe("deletion-only collections", () => {
    it("should delete all items when receiving empty array with deletions", () => {
      const prog1 = { vtype: "program", id: "prog1", clonedAt: 1, name: "Program 1" };
      const prog2 = { vtype: "program", id: "prog2", clonedAt: 2, name: "Program 2" };

      const fullObj = {
        programs: [prog1, prog2],
      };

      const fullVersions: IVersions<any> = {
        programs: {
          items: {
            "1": 1000,
            "2": 2000,
          },
        },
      };

      // All items deleted, no new items
      const versionDiff: IVersions<any> = {
        programs: {
          items: {},
          deleted: {
            "1": 5000,
            "2": 5000,
          },
        },
      };

      // Empty array from extractByVersions (deletion-only case)
      const extractedObj = {
        programs: [],
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged.programs).to.deep.equal([]);
    });

    it("should delete all items when receiving empty object with deletions (dictionary)", () => {
      const fullObj = {
        settings: {
          exercises: {
            "bench-press": { rm1: 100 },
            squat: { rm1: 150 },
          },
        },
      };

      const fullVersions: IVersions<any> = {
        settings: {
          exercises: {
            items: {
              "bench-press": 1000,
              squat: 2000,
            },
          },
        },
      };

      // All items deleted
      const versionDiff: IVersions<any> = {
        settings: {
          exercises: {
            items: {},
            deleted: {
              "bench-press": 5000,
              squat: 5000,
            },
          },
        },
      };

      // Empty object from extractByVersions
      const extractedObj = {
        settings: {
          exercises: {},
        },
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged.settings.exercises).to.deep.equal({});
    });

    it("should clear progress when workout is discarded (real-world scenario)", () => {
      const progress = {
        vtype: "progress",
        id: 1000,
        startTime: 1000,
        entries: [{ exercise: "bench" }],
        date: "2024-01-01",
        programId: "program1",
        programName: "Test Program",
        dayName: "Day 1",
        day: 1,
      };

      const fullObj = {
        progress: [progress],
      };

      const fullVersions: IVersions<any> = {
        progress: {
          items: {
            "1000": {
              startTime: { vc: { device1: 1 }, t: 1000, value: "1000" },
              entries: 1000,
            },
          },
        },
      };

      // Progress deleted (workout discarded)
      const versionDiff: IVersions<any> = {
        progress: {
          items: {},
          deleted: {
            "1000": 5000,
          },
        },
      };

      // Empty array from extractByVersions
      const extractedObj = {
        progress: [],
      };

      const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

      expect(merged.progress).to.deep.equal([]);
    });
  });

  it("should handle duplicate IDs within collections by keeping first occurrence", () => {
    const set1 = { vtype: "set", id: "s1", reps: 5 };
    const set2 = { vtype: "set", id: "s1", reps: 8 };
    const set3 = { vtype: "set", id: "s1", reps: 10 };

    const fullObj = {
      sets: [
        { vtype: "set", id: "s1", reps: 5 },
        { vtype: "set", id: "s1", reps: 8 },
        { vtype: "set", id: "s1", reps: 10 },
      ],
    };

    const fullVersions: IVersions<any> = {
      sets: {
        items: {
          s1: 1000,
        },
      },
    };

    const versionDiff: IVersions<any> = {
      sets: {
        items: {
          s1: 2000,
        },
      },
    };

    const extractedObj = {
      sets: [set1, set2, set3],
    };

    const merged = versionTracker.mergeByVersions(fullObj, fullVersions, versionDiff, extractedObj);

    expect(merged.sets).to.have.length(1);
    expect(merged.sets[0].reps).to.equal(5);
    expect(merged.sets[0].id).to.equal("s1");
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
