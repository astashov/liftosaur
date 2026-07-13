import "mocha";
import { expect } from "chai";
import { Storage_getDefault, Storage_fillVersions } from "../src/models/storage";
import { IPersistenceStore, Persistence } from "../src/utils/persistence";
import { IHistoryRecord, IStorage } from "../src/types";
import { ILocalStorage } from "../src/models/state";

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

const BASE_KEY = "liftosaur_testuser";

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
    const stats1 = await persistence.save(BASE_KEY, { storage, lastSyncedStorage: storage });
    expect(stats1.shards).to.include.members([
      "history",
      "programs",
      "stats",
      "storage",
      "lastsynced_history",
      "lastsynced_programs",
      "lastsynced_stats",
      "lastsynced_storage",
    ]);
    expect(store.data.has(`liftosaurshard:${BASE_KEY}:manifest`)).to.equal(true);
    // First sharded save also bootstraps the legacy-blob disaster spare...
    expect(stats1.shards).to.include("legacy");
    const blobAfterFirstSave = store.data.get(BASE_KEY);
    expect(blobAfterFirstSave).to.be.a("string");

    const changedStorage: IStorage = { ...storage, email: "new@example.com" };
    const stats2 = await persistence.save(BASE_KEY, { storage: changedStorage, lastSyncedStorage: storage });
    expect(stats2.shards).to.eql(["storage"]);
    expect(stats2.bytes).to.be.lessThan(stats1.bytes / 2);
    // ...but steady-state saves never rewrite it
    expect(store.data.get(BASE_KEY)).to.equal(blobAfterFirstSave);
  });

  it("in dual mode also writes a current legacy blob alongside shards", async () => {
    const dualPersistence = new Persistence(store, "dual");
    const storage = buildStorage([1]);
    const stats = await dualPersistence.save(BASE_KEY, { storage, lastSyncedStorage: storage });
    expect(stats.shards).to.include.members(["history", "storage", "legacy"]);
    const legacy = JSON.parse(store.data.get(BASE_KEY)!) as ILocalStorage;
    expect(legacy.storage?.history.map((r) => r.id)).to.eql([1]);
    expect(legacy.lastSyncedStorage?.history.map((r) => r.id)).to.eql([1]);

    const changedStorage: IStorage = { ...storage, email: "new@example.com" };
    await dualPersistence.save(BASE_KEY, { storage: changedStorage, lastSyncedStorage: storage });
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

  it("skips lastsynced big shards when they share references with previous write", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage, lastSyncedStorage: undefined });
    const synced: IStorage = { ...storage, email: "synced@example.com" };
    const stats = await persistence.save(BASE_KEY, { storage: synced, lastSyncedStorage: synced });
    expect(stats.shards).to.include.members(["storage", "lastsynced_storage"]);
    expect(stats.shards).to.not.include.members(["history", "lastsynced_history"]);
  });

  it("round-trips through save and load", async () => {
    const storage = buildStorage([1, 2]);
    const synced = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage, lastSyncedStorage: synced });
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1, 2]);
    expect(loaded?.storage?.tempUserId).to.equal(storage.tempUserId);
    expect(loaded?.lastSyncedStorage?.history.map((r) => r.id)).to.eql([1]);
  });

  it("migrates lazily: load only reads the legacy blob, the first save creates shards", async () => {
    const dualPersistence = new Persistence(store, "dual");
    const storage = buildStorage([1]);
    const legacy: ILocalStorage = { storage, lastSyncedStorage: storage };
    store.data.set(BASE_KEY, JSON.stringify(legacy));

    const writesBefore = store.writes.length;
    const loaded = await dualPersistence.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
    expect(store.writes.length).to.equal(writesBefore);
    expect(store.data.has(`liftosaurshard:${BASE_KEY}:manifest`)).to.equal(false);

    await dualPersistence.save(BASE_KEY, { storage: loaded!.storage!, lastSyncedStorage: loaded!.lastSyncedStorage });
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

  it("recovers lastSyncedStorage from the legacy blob when its shard group is incomplete", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage, lastSyncedStorage: storage });
    store.data.delete(`liftosaurshard:${BASE_KEY}:lastsynced_history`);
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
    // A partial shard set (native saves aren't atomic) must not strand sync without a baseline -
    // the blob still holds a valid one, so recover from it instead of returning undefined.
    expect(loaded?.lastSyncedStorage?.history.map((r) => r.id)).to.eql([1]);
  });

  it("degrades lastSyncedStorage to undefined when its shard group is incomplete and no blob exists", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage, lastSyncedStorage: storage });
    store.data.delete(`liftosaurshard:${BASE_KEY}:lastsynced_history`);
    store.data.delete(BASE_KEY);
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
    expect(loaded?.lastSyncedStorage).to.equal(undefined);
  });

  it("does not restore lastSyncedStorage from the blob when a clear removed all lastsynced shards", async () => {
    const storage = buildStorage([1]);
    // First save establishes the shards + a frozen bootstrap blob that still holds a baseline.
    await persistence.save(BASE_KEY, { storage, lastSyncedStorage: storage });
    // A logout / not_authorized clear removes all four lastsynced_* shards; in sharded mode the
    // frozen blob is left untouched (and thus stale).
    await persistence.save(BASE_KEY, { storage, lastSyncedStorage: undefined });
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.storage?.history.map((r) => r.id)).to.eql([1]);
    // "all absent" is a legitimate no-baseline state - it must NOT resurrect the stale frozen blob.
    expect(loaded?.lastSyncedStorage).to.equal(undefined);
  });

  // Documents an ACCEPTED narrow edge case: a torn clear leaves the SAME partial-shard signature as
  // a torn baseline write, so load() can't tell them apart and recovers from the blob - briefly
  // undoing the intended no-baseline state. It requires a crash mid non-atomic MMKV clear loop, and
  // the resurrected baseline is neutralized downstream (tempUserId re-fetch on account switch;
  // idempotent version-reconciled re-sync for same-user logout / not_authorized). See discussion in
  // withLastSyncedFallback. If this ever needs closing, order save() so the blob (which reflects the
  // cleared lastSynced) is written before the lastsynced_* shard mutations.
  it("resurrects the baseline on a torn clear (partial shards) - accepted edge case", async () => {
    const storage = buildStorage([1]);
    // Establish the shards + a frozen blob that still holds the baseline.
    await persistence.save(BASE_KEY, { storage, lastSyncedStorage: storage });
    // A clear that crashed mid-loop: some lastsynced_* shards removed, the rest (and the blob) stale.
    store.data.delete(`liftosaurshard:${BASE_KEY}:lastsynced_history`);
    store.data.delete(`liftosaurshard:${BASE_KEY}:lastsynced_programs`);
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.lastSyncedStorage?.history.map((r) => r.id)).to.eql([1]);
  });

  it("heals the lastsynced shard set on the next save after a blob fallback", async () => {
    const storage = buildStorage([1]);
    await persistence.save(BASE_KEY, { storage, lastSyncedStorage: storage });
    store.data.delete(`liftosaurshard:${BASE_KEY}:lastsynced_history`);
    const freshBoot = new Persistence(store, "sharded");
    const loaded = await freshBoot.load(BASE_KEY);
    expect(loaded?.lastSyncedStorage?.history.map((r) => r.id)).to.eql([1]);
    // The next save must rewrite the full lastsynced_* group so disk stops depending on the blob.
    await freshBoot.save(BASE_KEY, { storage, lastSyncedStorage: loaded!.lastSyncedStorage });
    store.data.delete(BASE_KEY);
    const reboot = new Persistence(store, "sharded");
    const reloaded = await reboot.load(BASE_KEY);
    expect(reloaded?.lastSyncedStorage?.history.map((r) => r.id)).to.eql([1]);
  });

  it("deletes legacy blob, all shards and manifest", async () => {
    const dualPersistence = new Persistence(store, "dual");
    const storage = buildStorage([1]);
    await dualPersistence.save(BASE_KEY, { storage, lastSyncedStorage: storage });
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
});
