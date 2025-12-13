/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { IVersions, VersionTracker } from "../../src/models/versionTracker";
import { STORAGE_VERSION_TYPES, IProgram, IHistoryRecord } from "../../src/types";

describe("extractByVersions", () => {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES);
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
