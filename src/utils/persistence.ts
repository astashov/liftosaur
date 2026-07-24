import { IndexedDBUtils_get, IndexedDBUtils_getAllKeys, IndexedDBUtils_setMany } from "./indexeddb";
import type { IStorage, IPartialStorage } from "../types";
import type { ILocalStorage } from "../models/state";
import { lg } from "./posthog";

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
  lastSyncedStorage?: IStorage;
}

type ILastSyncedStatus = "absent" | "partial" | "complete";

interface IAssembled {
  storage: IStorage;
  lastSyncedStorage?: IStorage;
  lastSyncedStatus: ILastSyncedStatus;
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
const ALL_SHARD_NAMES = [
  "storage",
  "history",
  "programs",
  "stats",
  "lastsynced_storage",
  "lastsynced_history",
  "lastsynced_programs",
  "lastsynced_stats",
];

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
  return JSON.stringify({ storage: data.storage, lastSyncedStorage: data.lastSyncedStorage });
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

  constructor(
    private readonly store: IPersistenceStore = indexedDBStore,
    private readonly mode: IPersistenceMode = "sharded"
  ) {}

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

    const lastSynced = data.lastSyncedStorage;
    if (lastSynced == null) {
      if (prev == null || prev.lastSyncedStorage != null) {
        for (const name of BIG_FIELDS) {
          pairs.push([shardKey(baseKey, `lastsynced_${name}`), undefined]);
          removed.push(`lastsynced_${name}`);
        }
        pairs.push([shardKey(baseKey, "lastsynced_storage"), undefined]);
        removed.push("lastsynced_storage");
      }
    } else {
      for (const name of BIG_FIELDS) {
        if (prev?.lastSyncedStorage == null || prev.lastSyncedStorage[name] !== lastSynced[name]) {
          pushShard(`lastsynced_${name}`, lastSynced[name]);
        }
      }
      if (prev?.lastSyncedStorage !== lastSynced) {
        pushShard("lastsynced_storage", extractPartial(lastSynced));
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
    this.writeCache[baseKey] = { storage, lastSyncedStorage: lastSynced };
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
        return this.withLastSyncedFallback(baseKey, assembledWithoutManifest, legacy);
      }
      if (legacy == null) {
        return undefined;
      }
      try {
        return JSON.parse(legacy) as ILocalStorage;
      } catch {
        return undefined;
      }
    }

    const assembled = await this.assemble(baseKey);
    if (assembled == null) {
      lg("ls-persistence-shards-unreadable");
      if (legacy == null) {
        return undefined;
      }
      try {
        return JSON.parse(legacy) as ILocalStorage;
      } catch {
        return undefined;
      }
    }

    return this.withLastSyncedFallback(baseKey, assembled, legacy);
  }

  // A non-atomic multi-shard save (MMKV has no transaction) can crash mid-write and leave a PARTIAL
  // lastsynced_* shard set, which assemble() can't turn into a baseline. Sync then can't diff, so it
  // stays in its never-synced fetch path and — if the re-fetch doesn't cleanly reseed — stops
  // uploading entirely. The dual-mode legacy blob still carries a valid (at worst slightly stale,
  // which sync reconciles) lastSyncedStorage, so recover it from there. Crucially, this only fires on
  // a "partial" set: an "absent" set is a legitimate no-baseline state (logout / not_authorized clear
  // all four shards) and must NOT resurrect the stale frozen blob. writeCache is seeded as if no
  // lastsynced shards exist, so the next save rewrites the full set and heals disk — also lifting the
  // dependency on the blob for the future frozen-blob "sharded" mode.
  private withLastSyncedFallback(baseKey: string, assembled: IAssembled, legacy: string | undefined): ILocalStorage {
    const passthrough = { storage: assembled.storage, lastSyncedStorage: assembled.lastSyncedStorage };
    if (assembled.lastSyncedStatus !== "partial" || legacy == null) {
      this.writeCache[baseKey] = passthrough;
      return passthrough;
    }
    let blobLastSynced: IStorage | undefined;
    try {
      blobLastSynced = (JSON.parse(legacy) as ILocalStorage).lastSyncedStorage;
    } catch {
      blobLastSynced = undefined;
    }
    if (blobLastSynced == null) {
      this.writeCache[baseKey] = { storage: assembled.storage, lastSyncedStorage: undefined };
      return { storage: assembled.storage, lastSyncedStorage: undefined };
    }
    lg("ls-persistence-lastsynced-blob-fallback");
    this.writeCache[baseKey] = { storage: assembled.storage, lastSyncedStorage: undefined };
    return { storage: assembled.storage, lastSyncedStorage: blobLastSynced };
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
    const [partialRaw, historyRaw, programsRaw, statsRaw, lsPartialRaw, lsHistoryRaw, lsProgramsRaw, lsStatsRaw] =
      await Promise.all([
        this.store.get(shardKey(baseKey, "storage")),
        this.store.get(shardKey(baseKey, "history")),
        this.store.get(shardKey(baseKey, "programs")),
        this.store.get(shardKey(baseKey, "stats")),
        this.store.get(shardKey(baseKey, "lastsynced_storage")),
        this.store.get(shardKey(baseKey, "lastsynced_history")),
        this.store.get(shardKey(baseKey, "lastsynced_programs")),
        this.store.get(shardKey(baseKey, "lastsynced_stats")),
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
      // The lastsynced_* group is tri-state: "complete" (all 4) → real baseline; "absent" (0) → a
      // legitimate no-baseline state (logout / not_authorized deliberately clear all four); "partial"
      // (1-3) → a crash mid non-atomic save. Only "partial" is corruption to repair from the blob -
      // "absent" must NOT resurrect a stale frozen blob, or it'd undo those clears.
      const presentCount = [lsPartialRaw, lsHistoryRaw, lsProgramsRaw, lsStatsRaw].filter(
        (r) => typeof r === "string"
      ).length;
      const lastSyncedStatus: ILastSyncedStatus =
        presentCount === 0 ? "absent" : presentCount === 4 ? "complete" : "partial";
      const lastSyncedStorage =
        lastSyncedStatus === "complete" &&
        typeof lsPartialRaw === "string" &&
        typeof lsHistoryRaw === "string" &&
        typeof lsProgramsRaw === "string" &&
        typeof lsStatsRaw === "string"
          ? assembleStorage(lsPartialRaw, lsHistoryRaw, lsProgramsRaw, lsStatsRaw)
          : undefined;
      return { storage, lastSyncedStorage, lastSyncedStatus };
    } catch (e) {
      lg("ls-persistence-assemble-error", { error: String(e) });
      return undefined;
    }
  }
}
