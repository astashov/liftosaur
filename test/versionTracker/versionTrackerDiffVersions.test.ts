/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { IVersions, VersionTracker } from "../../src/models/versionTracker";
import { STORAGE_VERSION_TYPES } from "../../src/types";

describe("diffVersions", () => {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES);
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
