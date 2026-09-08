import "mocha";
import { expect } from "chai";
import {
  WatchStorageFilter_filterForPhone,
  WatchStorageFilter_filterForPhoneJson,
} from "../src/utils/watchStorageFilter";
import { Storage_getDefault, Storage_fillVersions, Storage_mergeStorage } from "../src/models/storage";
import { isCollectionVersions } from "../src/models/versionTracker/types";
import { IStorage, IHistoryRecord } from "../src/types";

const UNLIMITED = Number.MAX_SAFE_INTEGER;

function buildRecord(id: number, padding: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id,
    date: new Date(id).toISOString(),
    programId: "prog",
    programName: "Program",
    day: 1,
    dayName: `Day ${id}`.padEnd(padding, "x"),
    entries: [],
    startTime: id,
    endTime: id + 1000,
  };
}

function buildStorage(recordCount: number, padding: number): IStorage {
  const history: IHistoryRecord[] = [];
  for (let i = recordCount; i >= 1; i -= 1) {
    history.push(buildRecord(i * 1000, padding));
  }
  return Storage_fillVersions({ ...Storage_getDefault(), history }, "watch");
}

function historyIds(filtered: IStorage): number[] {
  return filtered.history.map((r) => r.id);
}

function versionItems(filtered: IStorage, field: "history" | "programs"): Record<string, unknown> {
  const versions = filtered._versions?.[field];
  return (isCollectionVersions(versions) ? versions.items : undefined) ?? {};
}

function baseLength(storage: IStorage): number {
  return JSON.stringify(WatchStorageFilter_filterForPhone(storage, 0, UNLIMITED)).length;
}

describe("WatchStorageFilter_filterForPhone", () => {
  it("passes history through whole when it fits the budget", () => {
    const storage = buildStorage(3, 10);

    const filtered = WatchStorageFilter_filterForPhone(storage, 1_000_000, UNLIMITED);

    expect(historyIds(filtered)).to.deep.equal([3000, 2000, 1000]);
  });

  it("admits records newest first and stops at the budget", () => {
    const storage = buildStorage(20, 400);

    const filtered = WatchStorageFilter_filterForPhone(storage, baseLength(storage) + 1200, UNLIMITED);
    const ids = historyIds(filtered);

    expect(ids.length).to.be.greaterThan(0);
    expect(ids.length).to.be.lessThan(20);
    expect(ids).to.deep.equal(storage.history.slice(0, ids.length).map((r) => r.id));
  });

  it("keeps the serialized payload at or under the length it was given", () => {
    const storage = buildStorage(20, 400);
    const maxJsonLength = baseLength(storage) + 1200;

    expect(WatchStorageFilter_filterForPhoneJson(storage, maxJsonLength, UNLIMITED).length).to.be.at.most(
      maxJsonLength
    );
  });

  it("stays under the length even when every record is one byte over a boundary", () => {
    for (let padding = 40; padding < 60; padding += 1) {
      const storage = buildStorage(12, padding);
      for (let extra = 0; extra < 40; extra += 1) {
        const maxJsonLength = baseLength(storage) + extra;
        const json = WatchStorageFilter_filterForPhoneJson(storage, maxJsonLength, UNLIMITED);
        expect(json.length, `padding=${padding} extra=${extra}`).to.be.at.most(maxJsonLength);
      }
    }
  });

  it("admits only the newest record when capped to one", () => {
    const storage = buildStorage(20, 400);

    const filtered = WatchStorageFilter_filterForPhone(storage, 1_000_000, 1);

    expect(historyIds(filtered)).to.deep.equal([20000]);
    expect(Object.keys(versionItems(filtered, "history"))).to.deep.equal(["20000"]);
  });

  it("carries a version entry for every admitted record and none for excluded ones", () => {
    const storage = buildStorage(20, 400);

    const filtered = WatchStorageFilter_filterForPhone(storage, baseLength(storage) + 1200, UNLIMITED);
    const admittedIds = historyIds(filtered).map((id) => `${id}`);
    const itemKeys = Object.keys(versionItems(filtered, "history"));

    expect(itemKeys.sort()).to.deep.equal(admittedIds.slice().sort());
    expect(admittedIds.length).to.be.lessThan(20);
  });

  it("never emits deleted or nukedeleted for history or programs", () => {
    const storage = buildStorage(5, 10);
    storage._versions = {
      ...storage._versions,
      history: { items: {}, deleted: { "1000": 1 }, nukedeleted: 2 },
      programs: { items: {}, deleted: { "42": 1 }, nukedeleted: 2 },
    };

    const versions = WatchStorageFilter_filterForPhone(storage, 1_000_000, UNLIMITED)._versions;

    expect(versions?.history).to.not.have.property("deleted");
    expect(versions?.history).to.not.have.property("nukedeleted");
    expect(versions?.programs).to.not.have.property("deleted");
    expect(versions?.programs).to.not.have.property("nukedeleted");
  });

  it("yields an empty history and no items when capped to zero records", () => {
    const storage = buildStorage(5, 10);

    const filtered = WatchStorageFilter_filterForPhone(storage, 1_000_000, 0);

    expect(filtered.history).to.deep.equal([]);
    expect(versionItems(filtered, "history")).to.deep.equal({});
  });

  it("leaves the source storage untouched", () => {
    const storage = buildStorage(5, 10);
    const before = JSON.stringify(storage);

    WatchStorageFilter_filterForPhone(storage, 0, UNLIMITED);

    expect(JSON.stringify(storage)).to.equal(before);
  });

  it("keeps every phone record when the phone merges a truncated payload", () => {
    const watch = buildStorage(20, 400);
    const phone = Storage_fillVersions({ ...Storage_getDefault(), history: watch.history.slice() }, "phone");
    const truncated = JSON.parse(
      WatchStorageFilter_filterForPhoneJson(watch, baseLength(watch) + 1200, UNLIMITED)
    ) as IStorage;

    expect(truncated.history.length).to.be.lessThan(20);

    const merged = Storage_mergeStorage(phone, truncated, "phone");

    expect(merged.history.map((r) => r.id)).to.have.members(phone.history.map((r) => r.id));
    expect(merged.history.length).to.equal(phone.history.length);
  });

  it("keeps a phone-only record the watch never had", () => {
    const watch = buildStorage(2, 10);
    const phoneOnly = buildRecord(9000, 10);
    const phone = Storage_fillVersions(
      { ...Storage_getDefault(), history: [phoneOnly, ...watch.history] },
      "phone"
    );
    const payload = JSON.parse(WatchStorageFilter_filterForPhoneJson(watch, 1_000_000, UNLIMITED)) as IStorage;

    const merged = Storage_mergeStorage(phone, payload, "phone");

    expect(merged.history.map((r) => r.id)).to.have.members([9000, 2000, 1000]);
  });

  // Pins the reordering documented in memory/bugs/sync-merge-history-order.md: the merge emits incoming
  // records first, so history[0] stops being the newest workout. Consumers resolve by id instead.
  it("moves a phone-only newest record out of position, which consumers must not depend on", () => {
    const watch = buildStorage(2, 10);
    const phoneOnly = buildRecord(9000, 10);
    const phone = Storage_fillVersions(
      { ...Storage_getDefault(), history: [phoneOnly, ...watch.history] },
      "phone"
    );
    const payload = JSON.parse(WatchStorageFilter_filterForPhoneJson(watch, 1_000_000, UNLIMITED)) as IStorage;

    const merged = Storage_mergeStorage(phone, payload, "phone");

    expect(merged.history.map((r) => r.id)).to.deep.equal([2000, 1000, 9000]);
  });
});
