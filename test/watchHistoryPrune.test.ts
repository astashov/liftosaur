import "mocha";
import { expect } from "chai";
import { WatchHistoryPrune_prune } from "../src/utils/watchHistoryPrune";
import { Storage_getDefault, Storage_fillVersions, Storage_updateVersions } from "../src/models/storage";
import { Sync_getStorageUpdate2 } from "../src/utils/sync";
import { ICollectionVersions, isCollectionVersions } from "../src/models/versionTracker/types";
import { IStorage, IHistoryRecord } from "../src/types";

function buildRecord(id: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id,
    date: new Date(id).toISOString(),
    programId: "prog",
    programName: "Program",
    day: 1,
    dayName: "Day",
    entries: [],
    startTime: id,
    endTime: id + 1000,
  };
}

function buildStorage(recordCount: number): IStorage {
  const history: IHistoryRecord[] = [];
  for (let i = recordCount; i >= 1; i -= 1) {
    history.push(buildRecord(i * 1000));
  }
  return Storage_fillVersions({ ...Storage_getDefault(), history }, "watch");
}

function historyItems(storage: IStorage): NonNullable<ICollectionVersions["items"]> {
  const versions = storage._versions?.history;
  return (isCollectionVersions(versions) ? versions.items : undefined) ?? {};
}

function ids(...values: number[]): Set<string> {
  return new Set(values.map((v) => `${v}`));
}

describe("WatchHistoryPrune_prune", () => {
  it("keeps everything when nothing is confirmed", () => {
    const storage = buildStorage(5);

    expect(WatchHistoryPrune_prune(storage, new Set())).to.equal(storage);
  });

  it("drops confirmed records and keeps unconfirmed ones", () => {
    const pruned = WatchHistoryPrune_prune(buildStorage(5), ids(4000, 2000));

    expect(pruned.history.map((r) => r.id)).to.deep.equal([5000, 3000, 1000]);
  });

  it("never drops the newest record even when it is confirmed", () => {
    const pruned = WatchHistoryPrune_prune(buildStorage(3), ids(3000, 2000, 1000));

    expect(pruned.history.map((r) => r.id)).to.deep.equal([3000]);
  });

  it("drops the version entry of every dropped record", () => {
    const pruned = WatchHistoryPrune_prune(buildStorage(5), ids(4000, 2000));

    expect(Object.keys(historyItems(pruned)).sort()).to.deep.equal(["1000", "3000", "5000"]);
  });

  it("preserves deleted and nukedeleted verbatim", () => {
    const storage = buildStorage(5);
    storage._versions = {
      ...storage._versions,
      history: { items: historyItems(storage), deleted: { "77": 5 }, nukedeleted: 3 },
    };

    const versions = WatchHistoryPrune_prune(storage, ids(4000))._versions?.history;

    expect(isCollectionVersions(versions) ? versions.deleted : undefined).to.deep.equal({ "77": 5 });
    expect(isCollectionVersions(versions) ? versions.nukedeleted : undefined).to.equal(3);
  });

  // Documents why the prune bypasses modifyStorage: routed through the normal path it would mark
  // every dropped workout deleted, and the phone and server both honour that.
  it("would tombstone every dropped record if it went through Storage_updateVersions", () => {
    const storage = buildStorage(5);

    const pruned = WatchHistoryPrune_prune(storage, ids(4000, 2000));
    const versions = Storage_updateVersions(storage, pruned, "watch").history;
    const deleted = isCollectionVersions(versions) ? versions.deleted ?? {} : {};

    expect(Object.keys(deleted).sort()).to.deep.equal(["2000", "4000"]);
  });

  it("writes no history tombstone on a later unrelated mutation", () => {
    const pruned = WatchHistoryPrune_prune(buildStorage(5), ids(4000, 2000));
    const changed: IStorage = { ...pruned, currentProgramId: "changed" };

    const versions = Storage_updateVersions(pruned, changed, "watch").history;

    expect(isCollectionVersions(versions) ? versions.deleted ?? {} : {}).to.deep.equal({});
  });

  it("emits no sync update for a dropped record", () => {
    const storage = buildStorage(5);

    const pruned = WatchHistoryPrune_prune(storage, ids(4000, 2000));
    const update = Sync_getStorageUpdate2(pruned, storage, "watch");
    const items = update.versions?.history;

    expect(isCollectionVersions(items) ? Object.keys(items.items ?? {}) : []).to.deep.equal([]);
    expect(update.storage?.history ?? []).to.deep.equal([]);
  });

  it("leaves the source storage untouched", () => {
    const storage = buildStorage(5);
    const before = JSON.stringify(storage);

    WatchHistoryPrune_prune(storage, ids(4000, 2000));

    expect(JSON.stringify(storage)).to.equal(before);
  });
});
