import { IndexedDBUtils_get, IndexedDBUtils_getAllKeys, IndexedDBUtils_setMany } from "./indexeddb";
import type { IStorage, IPartialStorage } from "../types";
import type { ILastSynced, ILocalStorage } from "../models/state";
import { lg } from "./posthog";
import { PerfProbe_isTarget } from "./perfSetCompleteProbe";

export interface IPersistenceStore {
  get(key: string): Promise<unknown>;
  setMany(pairs: Array<[string, string | undefined]>): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export interface IPersistenceAccount {
  id: string;
  email?: string;
  name?: string;
  numberOfPrograms: number;
  numberOfWorkouts: number;
  affiliateEnabled?: boolean;
}

interface IPersistenceManifest {
  formatVersion: number;
  account: Omit<IPersistenceAccount, "id">;
}

export interface IPersistenceSaveStats {
  bytes: number;
  stringifyMs: number;
  writeMs: number;
  shards: string[];
}

interface IWriteCacheEntry {
  storage?: IStorage;
  lastSynced?: ILastSynced;
}

interface IAssembled {
  storage: IStorage;
  lastSynced?: ILastSynced;
  oldBaselineShardsPresent: boolean;
}

// Rollout ladder: "legacy" (single blob, as before) → "dual" (shards + legacy blob on
// every save, so any rollback or stale tab still finds a current blob) → "sharded"
// (shards only; the legacy blob stays frozen as a disaster spare, and is still written
// once per cold key — see save()). Flipped to "sharded" on 2026-07-17 after 5 days of
// dual-mode bake at ~77% adoption with zero read-path errors. Rolling back to a
// dual-mode build remains safe: dual reads shards natively and re-freshes the blob.
export type IPersistenceMode = "legacy" | "dual" | "sharded";

const PERSISTENCE_FORMAT_VERSION = 1;
const BIG_FIELDS = ["history", "programs", "stats"] as const;
const BASELINE_SHARD = "lastsynced";
const OLD_BASELINE_SHARD_NAMES = [
  "lastsynced_storage",
  "lastsynced_history",
  "lastsynced_programs",
  "lastsynced_stats",
];
const ALL_SHARD_NAMES = ["storage", "history", "programs", "stats", BASELINE_SHARD, ...OLD_BASELINE_SHARD_NAMES];

const indexedDBStore: IPersistenceStore = {
  get: (key) => IndexedDBUtils_get(key),
  setMany: (pairs) => IndexedDBUtils_setMany(pairs),
  getAllKeys: () => IndexedDBUtils_getAllKeys(),
};

function shardKey(baseKey: string, name: string): string {
  return `liftosaurshard:${baseKey}:${name}`;
}

function manifestKey(baseKey: string): string {
  return shardKey(baseKey, "manifest");
}

function serializeLegacy(data: ILocalStorage): string {
  return JSON.stringify({ storage: data.storage, lastSynced: data.lastSynced });
}

function parseLegacy(raw: string): ILocalStorage | undefined {
  try {
    const {
      lastSyncedStorage: _old,
      lastSynced,
      ...rest
    } = JSON.parse(raw) as ILocalStorage & {
      lastSyncedStorage?: unknown;
    };
    return { ...rest, lastSynced: asBaseline(lastSynced) };
  } catch {
    return undefined;
  }
}

function asBaseline(value: unknown): ILastSynced | undefined {
  const candidate = value as Partial<ILastSynced> | null | undefined;
  if (
    candidate != null &&
    typeof candidate.tempUserId === "string" &&
    typeof candidate.serverVersionsFetchedAt === "number"
  ) {
    return {
      versions: candidate.versions,
      tempUserId: candidate.tempUserId,
      serverVersionsFetchedAt: candidate.serverVersionsFetchedAt,
    };
  }
  return undefined;
}

function parseBaseline(raw: unknown): ILastSynced | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  try {
    return asBaseline(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function extractPartial(storage: IStorage): IPartialStorage {
  const { history: _history, programs: _programs, stats: _stats, ...partial } = storage;
  return partial;
}

function parseManifest(raw: unknown): IPersistenceManifest | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  try {
    const manifest = JSON.parse(raw) as IPersistenceManifest;
    if (manifest != null && typeof manifest.formatVersion === "number") {
      return manifest;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function buildManifest(storage: IStorage): IPersistenceManifest {
  return {
    formatVersion: PERSISTENCE_FORMAT_VERSION,
    account: {
      email: storage.email,
      name: storage.settings.nickname,
      numberOfPrograms: storage.programs.length,
      numberOfWorkouts: storage.history.length,
      affiliateEnabled: storage.settings.affiliateEnabled,
    },
  };
}

function assembleStorage(partialRaw: string, historyRaw: string, programsRaw: string, statsRaw: string): IStorage {
  const partial = JSON.parse(partialRaw) as IPartialStorage;
  return {
    ...partial,
    history: JSON.parse(historyRaw),
    programs: JSON.parse(programsRaw),
    stats: JSON.parse(statsRaw),
  } as IStorage;
}

export class Persistence {
  private writeCache: Partial<Record<string, IWriteCacheEntry>> = {};
  private readonly oldBaselineShardsToDelete = new Set<string>();
  private scheduled: { accountId: string; data: ILocalStorage } | undefined = undefined;
  private scheduledTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor(
    private readonly store: IPersistenceStore = indexedDBStore,
    private readonly mode: IPersistenceMode = "sharded",
    private readonly saveDelayMs: number = 100
  ) {}

  public scheduleSave(accountId: string, data: ILocalStorage): void {
    this.scheduled = { accountId, data };
    if (this.scheduledTimer != null) {
      clearTimeout(this.scheduledTimer);
    }
    this.scheduledTimer = setTimeout(() => {
      this.flushSave().catch(() => undefined);
    }, this.saveDelayMs);
  }

  public async flushSave(): Promise<void> {
    if (this.scheduledTimer != null) {
      clearTimeout(this.scheduledTimer);
      this.scheduledTimer = undefined;
    }
    const pending = this.scheduled;
    if (pending == null) {
      return;
    }
    this.scheduled = undefined;
    try {
      // The account pointer is best-effort. IndexedDBUtils_setMany rejects on a failed
      // transaction, and a failed pointer write must not stop the workout data from being saved.
      await this.store.setMany([["current_account", pending.accountId]]);
    } catch (e) {
      lg("ls-persistence-account-pointer-error", { error: String(e) });
    }
    try {
      const stats = await this.save(`liftosaur_${pending.accountId}`, pending.data);
      if (PerfProbe_isTarget()) {
        lg("perf-persist", {
          stringify_ms: stats.stringifyMs,
          write_ms: stats.writeMs,
          bytes: stats.bytes,
          shards: stats.shards.join(","),
        });
      }
    } catch (e) {
      // Write failed (e.g. quota) — the write cache wasn't updated, so the next
      // save retries these shards instead of skipping them as "unchanged"
      lg("ls-persistence-save-error", { error: String(e) });
    }
  }

  public cancelSave(): void {
    if (this.scheduledTimer != null) {
      clearTimeout(this.scheduledTimer);
      this.scheduledTimer = undefined;
    }
    this.scheduled = undefined;
  }

  public async save(baseKey: string, data: ILocalStorage): Promise<IPersistenceSaveStats> {
    const t0 = Date.now();
    if (this.mode === "legacy") {
      const json = serializeLegacy(data);
      const t1 = Date.now();
      await this.store.setMany([[baseKey, json]]);
      return { bytes: json.length, stringifyMs: t1 - t0, writeMs: Date.now() - t1, shards: ["legacy"] };
    }
    const storage = data.storage;
    if (storage == null) {
      return { bytes: 0, stringifyMs: 0, writeMs: 0, shards: [] };
    }
    const prev = this.writeCache[baseKey];
    const pairs: Array<[string, string | undefined]> = [];
    const written: string[] = [];
    const removed: string[] = [];
    let bytes = 0;
    const pushShard = (name: string, value: unknown): void => {
      const json = JSON.stringify(value);
      bytes += json.length;
      pairs.push([shardKey(baseKey, name), json]);
      written.push(name);
    };

    for (const name of BIG_FIELDS) {
      if (prev?.storage == null || prev.storage[name] !== storage[name]) {
        pushShard(name, storage[name]);
      }
    }
    if (prev?.storage !== storage) {
      pushShard("storage", extractPartial(storage));
    }

    const lastSynced = data.lastSynced;
    if (lastSynced == null) {
      if (prev == null || prev.lastSynced != null) {
        pairs.push([shardKey(baseKey, BASELINE_SHARD), undefined]);
        removed.push(BASELINE_SHARD);
      }
    } else if (prev?.lastSynced !== lastSynced) {
      pushShard(BASELINE_SHARD, lastSynced);
    }
    if (this.oldBaselineShardsToDelete.has(baseKey)) {
      for (const name of OLD_BASELINE_SHARD_NAMES) {
        pairs.push([shardKey(baseKey, name), undefined]);
        removed.push(name);
      }
    }

    if (pairs.length === 0) {
      return { bytes: 0, stringifyMs: Date.now() - t0, writeMs: 0, shards: [] };
    }
    // In sharded mode the blob is still (re)written on the first save per key: for
    // post-cutover installs it bootstraps the disaster spare that preserves tempUserId
    // continuity (unreadable shards + no blob would mint a fresh tempUserId, orphaning the
    // user's server storage), and after a corrupt-shard recovery boot (cache unseeded) it
    // refreshes the spare from live state. Steady-state saves never touch it.
    if (this.mode === "dual" || (this.mode === "sharded" && prev == null)) {
      const legacyJson = serializeLegacy(data);
      bytes += legacyJson.length;
      pairs.push([baseKey, legacyJson]);
      written.push("legacy");
    }
    pairs.push([manifestKey(baseKey), JSON.stringify(buildManifest(storage))]);
    const t1 = Date.now();
    await this.store.setMany(pairs);
    this.writeCache[baseKey] = { storage, lastSynced };
    this.oldBaselineShardsToDelete.delete(baseKey);
    return {
      bytes,
      stringifyMs: t1 - t0,
      writeMs: Date.now() - t1,
      shards: written.concat(removed.map((name) => `-${name}`)),
    };
  }

  public async saveFull(baseKey: string, data: ILocalStorage): Promise<IPersistenceSaveStats> {
    delete this.writeCache[baseKey];
    return this.save(baseKey, data);
  }

  // Migration is lazy: load never writes. A legacy-only account gets its shards +
  // manifest created by the first regular save (empty writeCache → full write), which
  // works from live post-getInitialState state — so ancient blob fields that
  // getInitialState folds into storage (e.g. top-level `progress`) aren't lost by an
  // eager parse→reshard at boot.
  public async load(baseKey: string): Promise<ILocalStorage | undefined> {
    const [manifestRaw, legacyRaw] = await Promise.all([this.store.get(manifestKey(baseKey)), this.store.get(baseKey)]);
    const legacy = typeof legacyRaw === "string" ? legacyRaw : undefined;

    // Key presence (not parseability) marks a migrated account, so a corrupt manifest
    // can't hide valid shards behind a stale frozen blob.
    if (typeof manifestRaw !== "string") {
      // Shards are only ever written together with a manifest, so a complete shard set
      // without one means the manifest key was lost — the shards are newer than the
      // (possibly stale or absent) blob and must win.
      const assembledWithoutManifest = await this.assemble(baseKey);
      if (assembledWithoutManifest != null) {
        lg("ls-persistence-manifest-missing");
        return this.seedCache(baseKey, assembledWithoutManifest);
      }
      return legacy != null ? parseLegacy(legacy) : undefined;
    }

    const assembled = await this.assemble(baseKey);
    if (assembled == null) {
      lg("ls-persistence-shards-unreadable");
      return legacy != null ? parseLegacy(legacy) : undefined;
    }

    return this.seedCache(baseKey, assembled);
  }

  private seedCache(baseKey: string, assembled: IAssembled): ILocalStorage {
    const loaded = { storage: assembled.storage, lastSynced: assembled.lastSynced };
    this.writeCache[baseKey] = loaded;
    if (assembled.oldBaselineShardsPresent) {
      this.oldBaselineShardsToDelete.add(baseKey);
    }
    return loaded;
  }

  public async delete(baseKey: string): Promise<void> {
    delete this.writeCache[baseKey];
    // Manifest first: a crash mid-deletion must not leave a manifest that resurrects a
    // partially-deleted account on the next boot
    const pairs: Array<[string, string | undefined]> = [[manifestKey(baseKey), undefined]];
    for (const name of ALL_SHARD_NAMES) {
      pairs.push([shardKey(baseKey, name), undefined]);
    }
    pairs.push([baseKey, undefined]);
    await this.store.setMany(pairs);
  }

  public async getAccountSummaries(): Promise<IPersistenceAccount[]> {
    const allKeys = await this.store.getAllKeys();
    const ids = new Set<string>();
    for (const key of allKeys) {
      if (key.startsWith("liftosaur_")) {
        ids.add(key.replace("liftosaur_", ""));
      } else {
        const match = key.match(/^liftosaurshard:liftosaur_(.+):manifest$/);
        if (match) {
          ids.add(match[1]);
        }
      }
    }
    const results: IPersistenceAccount[] = [];
    for (const id of ids) {
      const baseKey = `liftosaur_${id}`;
      const manifest = parseManifest(await this.store.get(manifestKey(baseKey)));
      if (manifest != null) {
        results.push({ id, ...manifest.account });
      } else {
        const raw = await this.store.get(baseKey);
        if (typeof raw === "string") {
          try {
            const storage = (JSON.parse(raw) as ILocalStorage)?.storage;
            if (storage != null) {
              results.push({
                id,
                email: storage.email,
                name: storage.settings?.nickname,
                numberOfPrograms: storage.programs?.length || 0,
                numberOfWorkouts: storage.history?.length || 0,
                affiliateEnabled: storage.settings?.affiliateEnabled,
              });
            }
          } catch {
            continue;
          }
        }
      }
    }
    return results;
  }

  private async assemble(baseKey: string): Promise<IAssembled | undefined> {
    const [partialRaw, historyRaw, programsRaw, statsRaw, baselineRaw, ...oldBaselineRaws] = await Promise.all([
      this.store.get(shardKey(baseKey, "storage")),
      this.store.get(shardKey(baseKey, "history")),
      this.store.get(shardKey(baseKey, "programs")),
      this.store.get(shardKey(baseKey, "stats")),
      this.store.get(shardKey(baseKey, BASELINE_SHARD)),
      ...OLD_BASELINE_SHARD_NAMES.map((name) => this.store.get(shardKey(baseKey, name))),
    ]);
    // A manifest is only ever written in the same batch as ALL four storage shards, so a
    // missing shard means corruption. Refusing to assemble (→ legacy blob fallback) beats
    // default-filling the gap, which would boot a user with silently empty history.
    if (
      typeof partialRaw !== "string" ||
      typeof historyRaw !== "string" ||
      typeof programsRaw !== "string" ||
      typeof statsRaw !== "string"
    ) {
      return undefined;
    }
    try {
      const storage = assembleStorage(partialRaw, historyRaw, programsRaw, statsRaw);
      return {
        storage,
        lastSynced: parseBaseline(baselineRaw),
        oldBaselineShardsPresent: oldBaselineRaws.some((raw) => raw != null),
      };
    } catch (e) {
      lg("ls-persistence-assemble-error", { error: String(e) });
      return undefined;
    }
  }
}
