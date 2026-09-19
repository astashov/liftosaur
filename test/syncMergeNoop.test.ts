import "mocha";
import { expect } from "chai";
import { Storage_getDefault } from "../src/models/storage";
import { IProgram, IStorage } from "../src/types";
import {
  ISyncMergeNoopArgs,
  SyncMergeNoop_counts,
  SyncMergeNoop_hasTombstones,
  SyncMergeNoop_isNoop,
  SyncMergeNoop_row,
  SyncMergeNoop_writeReason,
} from "../lambda/utils/syncMergeNoop";

function program(id: string, extra: Partial<IProgram> = {}): IProgram {
  return { id, clonedAt: 1, name: id, ...extra } as IProgram;
}

describe("SyncMergeNoop", () => {
  const versions: IStorage["_versions"] = {
    settings: { units: 100 },
    history: { items: { 1: 100, 2: { vc: { a: 1 }, t: 200 } }, deleted: {} },
  };
  const row = { settings: { units: "kg" }, tempUserId: "u1" };
  const base: ISyncMergeNoopArgs = {
    storedVersions: versions,
    mergedVersions: JSON.parse(JSON.stringify(versions)),
    storedRow: row,
    mergedRow: JSON.parse(JSON.stringify(row)),
    incomingHistoryIds: [1, 2],
    loadedHistoryIds: [2, 1],
    incomingPrograms: [],
    hasIncomingStats: false,
    hasIncomingTombstones: false,
    storedOriginalId: 555,
  };

  it("is a noop when versions and row match and every incoming record is stored", () => {
    expect(SyncMergeNoop_isNoop(base)).to.equal(true);
  });

  it("writes when the merged versions differ", () => {
    const mergedVersions = { ...versions, settings: { units: 101 } };
    expect(SyncMergeNoop_isNoop({ ...base, mergedVersions })).to.equal(false);
  });

  it("writes when the merged row differs", () => {
    expect(SyncMergeNoop_isNoop({ ...base, mergedRow: { ...row, settings: { units: "lb" } } })).to.equal(false);
  });

  it("writes when an incoming history record has no stored row", () => {
    expect(SyncMergeNoop_isNoop({ ...base, loadedHistoryIds: [1] })).to.equal(false);
  });

  it("writes when the update carries a program", () => {
    expect(SyncMergeNoop_isNoop({ ...base, incomingPrograms: [program("p1")] })).to.equal(false);
  });

  it("writes when the update carries stats", () => {
    expect(SyncMergeNoop_isNoop({ ...base, hasIncomingStats: true })).to.equal(false);
  });

  it("writes when the update carries a tombstone", () => {
    expect(SyncMergeNoop_isNoop({ ...base, hasIncomingTombstones: true })).to.equal(false);
  });

  it("finds tombstones at the top level and inside nested stats collections", () => {
    expect(SyncMergeNoop_hasTombstones(undefined)).to.equal(false);
    expect(SyncMergeNoop_hasTombstones({ history: { items: { 1: 100 } } })).to.equal(false);
    expect(SyncMergeNoop_hasTombstones({ history: { items: {}, deleted: { 7: 100 } } })).to.equal(true);
    expect(
      SyncMergeNoop_hasTombstones({ stats: { weight: { weight: { items: {}, deleted: { 1700: 100 } } } } })
    ).to.equal(true);
    expect(SyncMergeNoop_hasTombstones({ settings: { units: { vc: { a: 1 }, t: 100 } } })).to.equal(false);
  });

  it("ignores tombstones inside settings, which have no rows of their own", () => {
    const settingsOnly = { settings: { exercises: { items: {}, deleted: { custom1: 100 } } } } as IStorage["_versions"];
    expect(SyncMergeNoop_hasTombstones(settingsOnly)).to.equal(false);
  });

  it("writes when the stored row has no originalId", () => {
    expect(SyncMergeNoop_isNoop({ ...base, storedOriginalId: undefined })).to.equal(false);
  });

  it("counts equal-version history puts across plain and vector clock forms", () => {
    const mergedVersions: IStorage["_versions"] = {
      ...versions,
      history: { items: { 1: { vc: { b: 1 }, t: 100 }, 2: { vc: { a: 2 }, t: 300 } }, deleted: {} },
    };
    const counts = SyncMergeNoop_counts({
      ...base,
      mergedVersions,
      incomingPrograms: [program("p1")],
      noop: false,
      historyDeletes: 3,
      statPuts: 4,
      statDeletes: 1,
    });
    expect(counts).to.eql({
      noop: false,
      writeReason: "programs",
      historyPuts: 2,
      historyPutsEqualVersion: 1,
      historyDeletes: 3,
      programPuts: 1,
      statPuts: 4,
      statDeletes: 1,
    });
    expect(SyncMergeNoop_counts({ ...base, noop: true, historyDeletes: 3, statPuts: 4, statDeletes: 1 })).to.eql({
      noop: true,
      historyPuts: 0,
      historyPutsEqualVersion: 2,
      historyDeletes: 0,
      programPuts: 0,
      statPuts: 0,
      statDeletes: 0,
    });
  });

  it("names the first condition that forces a write", () => {
    expect(SyncMergeNoop_writeReason(base)).to.equal(undefined);
    expect(SyncMergeNoop_writeReason({ ...base, storedOriginalId: undefined })).to.equal("no-original-id");
    expect(SyncMergeNoop_writeReason({ ...base, hasIncomingStats: true })).to.equal("stats");
    expect(SyncMergeNoop_writeReason({ ...base, hasIncomingTombstones: true })).to.equal("tombstones");
    expect(SyncMergeNoop_writeReason({ ...base, incomingPrograms: [program("p1")] })).to.equal("programs");
    expect(SyncMergeNoop_writeReason({ ...base, mergedVersions: { settings: { units: 1 } } })).to.equal("versions");
    expect(SyncMergeNoop_writeReason({ ...base, mergedRow: { ...row, tempUserId: "u2" } })).to.equal("row");
    expect(SyncMergeNoop_writeReason({ ...base, loadedHistoryIds: [] })).to.equal("history-missing");
  });

  it("row strips the collections, the originalId and the versions", () => {
    const storage = { ...Storage_getDefault(), originalId: 5, _versions: versions };
    const stripped = SyncMergeNoop_row(storage);
    expect(Object.keys(stripped)).to.not.include.members(["history", "programs", "stats", "originalId", "_versions"]);
    expect(stripped.settings).to.equal(storage.settings);
  });
});
