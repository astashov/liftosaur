import "mocha";
import { expect } from "chai";
import {
  HistoryDelta_apply,
  HistoryDelta_missingIds,
  HistoryDelta_sortNewestFirst,
  HistoryDelta_unresolvedIds,
} from "../src/utils/historyDelta";
import { Storage_getDefault } from "../src/models/storage";
import { IHistoryRecord, IStorage } from "../src/types";
import { IVersions } from "../src/models/versionTracker";

function record(id: number): IHistoryRecord {
  return { id } as IHistoryRecord;
}

function versions(items: Record<string, unknown>, deleted: Record<string, number> = {}): IVersions<IStorage> {
  return { history: { items, deleted } } as IVersions<IStorage>;
}

describe("HistoryDelta_missingIds", () => {
  const server = versions({ 3: { vc: { a: 2 }, t: 300 }, 2: 200, 1: 100 });

  it("fetches a record the phone does not have", () => {
    const local = { history: [record(1), record(2)], versions: versions({ 2: 200, 1: 100 }) };
    expect(HistoryDelta_missingIds(local, server, [])).to.eql([3]);
  });

  it("skips records with equal versions and records already in the answer", () => {
    const local = {
      history: [record(1), record(2), record(3)],
      versions: versions({ 3: { vc: { a: 2 }, t: 300 }, 2: 200, 1: 100 }),
    };
    expect(HistoryDelta_missingIds(local, server, [])).to.eql([]);
    const behind = {
      history: [record(1), record(2), record(3)],
      versions: versions({ 3: { vc: { a: 1 }, t: 250 }, 2: 200, 1: 100 }),
    };
    expect(HistoryDelta_missingIds(behind, server, [record(3)])).to.eql([]);
  });

  it("treats a timestamp and a vector clock with the same t as equal", () => {
    const local = { history: [record(1)], versions: versions({ 1: { vc: { a: 1 }, t: 100 } }) };
    expect(HistoryDelta_missingIds(local, versions({ 1: 100 }), [])).to.eql([]);
  });

  it("fetches records the server has newer or concurrent versions for, newest first", () => {
    const local = {
      history: [record(1), record(2), record(3)],
      versions: versions({ 3: { vc: { a: 1 }, t: 250 }, 2: { vc: { b: 1 }, t: 210 }, 1: 100 }),
    };
    expect(HistoryDelta_missingIds(local, server, [])).to.eql([3, 2]);
  });

  it("fetches a record whose version is known but whose data is gone", () => {
    const local = { history: [record(1)], versions: versions({ 2: 200, 1: 100 }) };
    expect(HistoryDelta_missingIds(local, server, [])).to.eql([3, 2]);
  });

  it("never fetches a record the server deleted", () => {
    const local = { history: [record(1)], versions: versions({ 1: 100 }) };
    expect(HistoryDelta_missingIds(local, versions({ 1: 100, 2: 200 }, { 2: 500 }), [])).to.eql([]);
  });

  it("returns undefined when the server versions are not a collection map", () => {
    const local = { history: [], versions: undefined };
    expect(HistoryDelta_missingIds(local, undefined, [])).to.equal(undefined);
    expect(HistoryDelta_missingIds(local, { history: 123 } as unknown as IVersions<IStorage>, [])).to.equal(undefined);
  });
});

describe("HistoryDelta_apply", () => {
  function storageWith(history: IHistoryRecord[], v: IVersions<IStorage>): IStorage {
    return { ...Storage_getDefault(), history, _versions: v };
  }

  it("appends the fetched records once and leaves the versions alone", () => {
    const storage = storageWith([record(3)], versions({ 3: 300, 2: 200 }));
    const applied = HistoryDelta_apply(storage, [record(2), record(3)]);
    expect(applied.history.map((r) => r.id)).to.eql([3, 2]);
    expect(applied._versions).to.equal(storage._versions);
  });
});

describe("HistoryDelta_unresolvedIds", () => {
  it("names the requested ids that did not come back", () => {
    expect(HistoryDelta_unresolvedIds([3, 2, 1], [record(2)])).to.eql([3, 1]);
    expect(HistoryDelta_unresolvedIds([2], [record(2)])).to.eql([]);
  });
});

describe("HistoryDelta_sortNewestFirst", () => {
  it("orders by id descending without touching the input", () => {
    const input = [record(2), record(5), record(1)];
    expect(HistoryDelta_sortNewestFirst(input).map((r) => r.id)).to.eql([5, 2, 1]);
    expect(input.map((r) => r.id)).to.eql([2, 5, 1]);
  });
});
