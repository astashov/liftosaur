/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { IVersions, VersionTracker } from "../../src/models/versionTracker";
import { STORAGE_VERSION_TYPES } from "../../src/types";

describe("mergeVersions", () => {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES);
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
