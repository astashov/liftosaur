import "mocha";
import { expect } from "chai";
import { Storage_getDefault, Storage_fillVersions } from "../src/models/storage";
import { IPersistenceStore, Persistence } from "../src/utils/persistence";
import { IHistoryRecord, IStorage } from "../src/types";
import { ILastSynced, ILocalStorage } from "../src/models/state";

class MemoryStore implements IPersistenceStore {
  public data: Map<string, string> = new Map();
  public writes: string[][] = [];

  public async get(key: string): Promise<unknown> {
    return this.data.get(key);
  }

  public async setMany(pairs: Array<[string, string | undefined]>): Promise<void> {
    this.writes.push(pairs.map(([key]) => key));
    for (const [key, value] of pairs) {
      if (value != null) {
        this.data.set(key, value);
      } else {
        this.data.delete(key);
      }
    }
  }

  public async getAllKeys(): Promise<string[]> {
    return Array.from(this.data.keys());
  }
}

function buildHistoryRecord(id: number): IHistoryRecord {
  return {
    id,
    date: new Date(id).toISOString(),
    programId: "test",
    programName: "Test",
    day: 1,
    dayName: "Day 1",
    startTime: id,
    entries: [],
  } as unknown as IHistoryRecord;
}

function buildStorage(historyIds: number[]): IStorage {
  const storage = Storage_getDefault();
  return Storage_fillVersions({ ...storage, history: historyIds.map(buildHistoryRecord) }, "test-device");
}

function buildBaseline(storage: IStorage, at: number = 1000): ILastSynced {
  return { versions: storage._versions, tempUserId: storage.tempUserId, serverVersionsFetchedAt: at };
}

const BASE_KEY = "liftosaur_testuser";
const BASELINE_KEY = `liftosaurshard:${BASE_KEY}:lastsynced`;
const OLD_BASELINE_KEYS = ["storage", "history", "programs", "stats"].map(
  (name) => `liftosaurshard:${BASE_KEY}:lastsynced_${name}`
);

describe("Persistence", () => {
  let store: MemoryStore;
  let persistence: Persistence;

  beforeEach(() => {
    store = new MemoryStore();
    persistence = new Persistence(store, "sharded");
  });

  it("writes a single legacy blob in legacy mode", async () => {
    const legacyPersistence = new Persistence(store, "legacy");
    const storage = buildStorage([1]);
    await legacyPersistence.save(BASE_KEY, { storage });
    expect(Array.from(store.data.keys())).to.eql([BASE_KEY]);
    const parsed = JSON.parse(store.data.get(BASE_KEY)!);
    expect(parsed.storage.history).to.have.length(1);
  });

  it("writes all shards and manifest on first save, only changed shards after", async () => {
    const storage = buildStorage([1]);
    const lastSynced = buildBaseline(storage);
    const stats1 = await persistence.save(BASE_KEY, { storage, lastSynced });
    expect(stats1.shards).to.include.members(["history", "programs", "stats", "storage", "lastsynced"]);
    expect(store.data.has(`liftosaurshard:${BASE_KEY}:manifest`)).to.equal(true);
    // First sharded save also bootstraps the legacy-blob disaster spare...
    expect(stats1.shards).to.include("legacy");
    const blobAfterFirstSave = store.data.get(BASE_KEY);
    expect(blobAfterFirstSave).to.be.a("string");

    const changedStorage: IStorage = { ...storage, email: "new@example.com" };
    const stats2 = await persistence.save(BASE_KEY, { storage: changedStorage, lastSynced });
    expect(stats2.shards).to.eql(["storage"]);
    expect(stats2.bytes).to.be.lessThan(stats1.bytes / 2);
    // ...but steady-state saves never rewrite it
    expect(store.data.get(BASE_KEY)).to.equal(blobAfterFirstSave);
  });

  it("in dual mode also writes a current legacy blob alongside shards", async () => {
    const dualPersistence = new Persistence(store, "dual");
    const storage = buildStorage([1]);
    const lastSynced = buildBaseline(storage);
    const stats = await dualPersistence.save(BASE_KEY, { storage, lastSynced });
    expect(stats.shards).to.include.members(["history", "storage", "legacy"]);
    const legacy = JSON.parse(store.data.get(BASE_KEY)!) as ILocalStorage;
    expect(legacy.storage?.history.map((r) => r.id)).to.eql([1]);
    expect(legacy.lastSynced?.tempUserId).to.equal(storage.tempUserId);

    const changedStorage: IStorage = { ...storage, email: "new@example.com" };
    await dualPersistence.save(BASE_KEY, { storage: changedStorage, lastSynced });
    const legacy2 = JSON.parse(store.data.get(BASE_KEY)!) as ILocalStorage;
    expect(legacy2.storage?.email).to.equal("new@example.com");
  });

  it("does not rewrite anything on load after dual-mode saves", async () => {
    const dualPersistence = new Persistence(store, "dual");
    const storage = buildStorage([1]);
    await dualPersistence.save(BASE_KEY, { storage });

    const freshBoot = new Persistence(store, "dual");
    const writesBefore = store.writes.length;
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
    expect(store.writes.length).to.equal(writesBefore);
  });

  it("writes the baseline shard only when the baseline reference changes", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage, lastSynced: undefined });
    const synced: IStorage = { ...storage, email: "synced@example.com" };
    const lastSynced = buildBaseline(synced);
    const stats = await persistence.save(BASE_KEY, { storage: synced, lastSynced });
    expect(stats.shards).to.eql(["storage", "lastsynced"]);
    const again = await persistence.save(BASE_KEY, { storage: synced, lastSynced });
    expect(again.shards).to.eql([]);
  });

  it("removes the baseline shard when the baseline is cleared", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage, lastSynced: buildBaseline(storage) });
    expect(store.data.has(BASELINE_KEY)).to.equal(true);
    const stats = await persistence.save(BASE_KEY, { storage, lastSynced: undefined });
    expect(stats.shards).to.eql(["-lastsynced"]);
    expect(store.data.has(BASELINE_KEY)).to.equal(false);
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.lastSynced).to.equal(undefined);
  });

  it("round-trips through save and load", async () => {
    const storage = buildStorage([1, 2]);
    const lastSynced = buildBaseline(buildStorage([1]), 4242);
    await persistence.save(BASE_KEY, { storage, lastSynced });
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1, 2]);
    expect(loaded?.storage?.tempUserId).to.equal(storage.tempUserId);
    expect(loaded?.lastSynced).to.eql(lastSynced);
  });

  it("loads storage and no baseline when the baseline shard is corrupt", async () => {
    const storage = buildStorage([1, 2]);
    await persistence.save(BASE_KEY, { storage, lastSynced: buildBaseline(storage) });
    store.data.set(BASELINE_KEY, "corrupted{{{");
    store.data.delete(BASE_KEY);
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1, 2]);
    expect(loaded?.lastSynced).to.equal(undefined);
  });

  it("ignores the old lastsynced_* shards on load and deletes them on the next save", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage });
    for (const key of OLD_BASELINE_KEYS) {
      store.data.set(key, JSON.stringify({ stale: true }));
    }
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.lastSynced).to.equal(undefined);
    const stats = await freshBoot.save(BASE_KEY, { storage: loaded!.storage!, lastSynced: buildBaseline(storage) });
    expect(stats.shards).to.include.members([
      "lastsynced",
      "-lastsynced_storage",
      "-lastsynced_history",
      "-lastsynced_programs",
      "-lastsynced_stats",
    ]);
    for (const key of OLD_BASELINE_KEYS) {
      expect(store.data.has(key)).to.equal(false);
    }
    const again = await freshBoot.save(BASE_KEY, { storage: loaded!.storage!, lastSynced: buildBaseline(storage) });
    expect(again.shards).to.eql(["lastsynced"]);
  });

  it("deletes the old lastsynced_* shards even when the first save after load is saveFull", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage });
    for (const key of OLD_BASELINE_KEYS) {
      store.data.set(key, JSON.stringify({ stale: true }));
    }
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    await freshBoot.saveFull(BASE_KEY, { storage: loaded!.storage! });
    for (const key of OLD_BASELINE_KEYS) {
      expect(store.data.has(key)).to.equal(false);
    }
  });

  it("ignores the old lastSyncedStorage field inside a legacy blob and keeps its other fields", async () => {
    const storage = buildStorage([1]);
    store.data.set(BASE_KEY, JSON.stringify({ storage, lastSyncedStorage: storage, progress: { id: 7 } }));
    const loaded = await persistence.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
    expect(loaded?.lastSynced).to.equal(undefined);
    expect((loaded as { progress?: { id: number } })?.progress?.id).to.equal(7);
    expect("lastSyncedStorage" in (loaded || {})).to.equal(false);
  });

  it("migrates lazily: load only reads the legacy blob, the first save creates shards", async () => {
    const dualPersistence = new Persistence(store, "dual");
    const storage = buildStorage([1]);
    const legacy: ILocalStorage = { storage, lastSynced: buildBaseline(storage) };
    store.data.set(BASE_KEY, JSON.stringify(legacy));

    const writesBefore = store.writes.length;
    const loaded = await dualPersistence.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
    expect(loaded?.lastSynced).to.eql(legacy.lastSynced);
    expect(store.writes.length).to.equal(writesBefore);
    expect(store.data.has(`liftosaurshard:${BASE_KEY}:manifest`)).to.equal(false);

    await dualPersistence.save(BASE_KEY, { storage: loaded!.storage!, lastSynced: loaded!.lastSynced });
    expect(store.data.has(BASE_KEY)).to.equal(true);
    expect(store.data.has(`liftosaurshard:${BASE_KEY}:manifest`)).to.equal(true);
    expect(store.data.has(`liftosaurshard:${BASE_KEY}:history`)).to.equal(true);
  });

  it("retries shards on the next save after a failed write instead of skipping them as unchanged", async () => {
    let failNext = false;
    const failingStore: IPersistenceStore = {
      get: (key) => store.get(key),
      getAllKeys: () => store.getAllKeys(),
      setMany: async (pairs) => {
        if (failNext) {
          failNext = false;
          throw new Error("QuotaExceededError");
        }
        return store.setMany(pairs);
      },
    };
    const failingPersistence = new Persistence(failingStore, "sharded");
    const storage = buildStorage([1]);
    await failingPersistence.save(BASE_KEY, { storage });

    const withNewWorkout: IStorage = { ...storage, history: [buildHistoryRecord(1), buildHistoryRecord(2)] };
    failNext = true;
    let failed = false;
    try {
      await failingPersistence.save(BASE_KEY, { storage: withNewWorkout });
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);

    const stats = await failingPersistence.save(BASE_KEY, { storage: withNewWorkout });
    expect(stats.shards).to.include.members(["history"]);
    const historyShard = JSON.parse(store.data.get(`liftosaurshard:${BASE_KEY}:history`)!);
    expect(historyShard).to.have.length(2);
  });

  it("assembles from shards even when the manifest is corrupt", async () => {
    const storage = buildStorage([1, 2]);
    await persistence.save(BASE_KEY, { storage });
    store.data.set(`liftosaurshard:${BASE_KEY}:manifest`, "corrupted{{{");
    store.data.set(BASE_KEY, JSON.stringify({ storage: buildStorage([]) }));

    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1, 2]);
  });

  it("ignores the legacy blob once a manifest exists (shards win)", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage });
    const newerStorage: IStorage = { ...storage, history: [buildHistoryRecord(1), buildHistoryRecord(2)] };
    store.data.set(BASE_KEY, JSON.stringify({ storage: newerStorage }));

    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
  });

  it("falls back to the legacy blob when shards are unreadable", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage });
    store.data.set(`liftosaurshard:${BASE_KEY}:storage`, "corrupted{{{");
    store.data.set(BASE_KEY, JSON.stringify({ storage }));
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
  });

  it("falls back to the legacy blob when a required shard is missing, never default-fills", async () => {
    const storage = buildStorage([1, 2]);
    await persistence.save(BASE_KEY, { storage });
    store.data.delete(`liftosaurshard:${BASE_KEY}:history`);
    store.data.set(BASE_KEY, JSON.stringify({ storage }));
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1, 2]);
  });

  it("recovers from a lost manifest key by preferring valid shards over the blob", async () => {
    const storage = buildStorage([1, 2]);
    await persistence.save(BASE_KEY, { storage });
    store.data.delete(`liftosaurshard:${BASE_KEY}:manifest`);
    store.data.set(BASE_KEY, JSON.stringify({ storage: buildStorage([1]) }));

    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1, 2]);

    const noBlobStore = store;
    noBlobStore.data.delete(BASE_KEY);
    const anotherBoot = new Persistence(noBlobStore, "sharded");
    const loadedNoBlob = await anotherBoot.load(BASE_KEY);
    expect(loadedNoBlob?.storage?.history.map((r) => r.id)).to.eql([1, 2]);
  });

  it("does not restore a cleared baseline from the frozen blob", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage, lastSynced: buildBaseline(storage) });
    await persistence.save(BASE_KEY, { storage, lastSynced: undefined });
    expect((JSON.parse(store.data.get(BASE_KEY)!) as ILocalStorage).lastSynced).to.not.equal(undefined);
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
    expect(loaded?.lastSynced).to.equal(undefined);
  });

  it("deletes legacy blob, all shards, old baseline shards and manifest", async () => {
    const dualPersistence = new Persistence(store, "dual");
    const storage = buildStorage([1]);
    await dualPersistence.save(BASE_KEY, { storage, lastSynced: buildBaseline(storage) });
    for (const key of OLD_BASELINE_KEYS) {
      store.data.set(key, "{}");
    }
    await dualPersistence.delete(BASE_KEY);
    expect(store.data.size).to.equal(0);
  });

  it("lists account summaries from manifests and legacy blobs", async () => {
    const shardedStorage = { ...buildStorage([1, 2]), email: "sharded@example.com" };
    await persistence.save("liftosaur_sharded", { storage: shardedStorage });
    const legacyStorage = { ...buildStorage([1]), email: "legacy@example.com" };
    store.data.set("liftosaur_legacy", JSON.stringify({ storage: legacyStorage }));
    store.data.set("liftosaur_device_id_app", "not-json");

    const summaries = await persistence.getAccountSummaries();
    const byId = summaries.reduce<Record<string, (typeof summaries)[number]>>((memo, s) => {
      memo[s.id] = s;
      return memo;
    }, {});
    expect(byId.sharded?.email).to.equal("sharded@example.com");
    expect(byId.sharded?.numberOfWorkouts).to.equal(2);
    expect(byId.legacy?.email).to.equal("legacy@example.com");
    expect(byId.legacy?.numberOfWorkouts).to.equal(1);
    expect(byId.device_id_app).to.equal(undefined);
  });

  it("saveFull rewrites everything even when references are unchanged", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage });
    const stats = await persistence.saveFull(BASE_KEY, { storage });
    expect(stats.shards).to.include.members(["history", "programs", "stats", "storage"]);
  });

  describe("scheduleSave", () => {
    it("writes the data it was given, not whatever is current when the timer runs", async () => {
      const scheduler = new Persistence(store, "sharded", 0);
      scheduler.scheduleSave("acc", { storage: buildStorage([1]) });
      scheduler.scheduleSave("acc", { storage: buildStorage([1, 2]) });
      await scheduler.flushSave();
      const written = await store.get("liftosaurshard:liftosaur_acc:history");
      expect(JSON.parse(written as string)).to.have.length(2);
    });

    it("collapses a burst into one write", async () => {
      const scheduler = new Persistence(store, "sharded", 0);
      scheduler.scheduleSave("acc", { storage: buildStorage([1]) });
      scheduler.scheduleSave("acc", { storage: buildStorage([1, 2]) });
      scheduler.scheduleSave("acc", { storage: buildStorage([1, 2, 3]) });
      store.writes = [];
      await scheduler.flushSave();
      const shardWrites = store.writes.filter((keys) => keys.some((k) => k.startsWith("liftosaurshard:")));
      expect(shardWrites).to.have.length(1);
    });

    it("writes nothing after cancelSave", async () => {
      const scheduler = new Persistence(store, "sharded", 0);
      scheduler.scheduleSave("acc", { storage: buildStorage([1]) });
      scheduler.cancelSave();
      store.writes = [];
      await scheduler.flushSave();
      expect(store.writes).to.have.length(0);
    });

    it("still saves the workout when the account pointer write fails", async () => {
      const failingPointer: IPersistenceStore = {
        get: (key) => store.get(key),
        getAllKeys: () => store.getAllKeys(),
        setMany: async (pairs) => {
          if (pairs.some(([key]) => key === "current_account")) {
            throw new Error("quota exceeded");
          }
          return store.setMany(pairs);
        },
      };
      const scheduler = new Persistence(failingPointer, "sharded", 0);
      scheduler.scheduleSave("acc", { storage: buildStorage([1]) });
      await scheduler.flushSave();
      expect(await store.get("liftosaurshard:liftosaur_acc:history")).to.not.equal(undefined);
    });

    it("keeps two stores independent, so one cannot drop the other's save", async () => {
      const first = new Persistence(store, "sharded", 0);
      const second = new Persistence(store, "sharded", 0);
      first.scheduleSave("first", { storage: buildStorage([1]) });
      second.scheduleSave("second", { storage: buildStorage([2]) });
      await first.flushSave();
      await second.flushSave();
      expect(await store.get("liftosaurshard:liftosaur_first:history")).to.not.equal(undefined);
      expect(await store.get("liftosaurshard:liftosaur_second:history")).to.not.equal(undefined);
    });
  });
});
