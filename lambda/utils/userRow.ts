import { deflateSync, inflateSync } from "zlib";
import type { ILimitedUserDao } from "../dao/userDao";
import type { IPartialStorage, IStorage } from "../../src/types";

const PACKED_VERSION_KEYS = ["history", "programs", "stats"];

// Readers ship with this false and deploy first, so a rollback always lands on a build that reads vz
export const UserRow_WRITES_PACKED = false;

export type IUserRowItem = Omit<ILimitedUserDao, "storage"> & {
  storage: Omit<IPartialStorage, "history" | "programs" | "stats">;
  vz?: Uint8Array;
};

type IVersionsRecord = Record<string, unknown>;

export function UserRow_pack(user: ILimitedUserDao, writesPacked: boolean = UserRow_WRITES_PACKED): IUserRowItem {
  const { history: _h, programs: _p, stats: _s, ...storage } = user.storage;
  const versions = storage._versions as IVersionsRecord | undefined;
  if (versions == null || !writesPacked) {
    return { ...user, storage };
  }
  const packed: IVersionsRecord = {};
  const kept: IVersionsRecord = {};
  for (const [key, value] of Object.entries(versions)) {
    if (PACKED_VERSION_KEYS.includes(key)) {
      packed[key] = value;
    } else {
      kept[key] = value;
    }
  }
  if (Object.keys(packed).length === 0) {
    return { ...user, storage };
  }
  const vz = deflateSync(Buffer.from(JSON.stringify(packed)));
  return { ...user, storage: { ...storage, _versions: kept as IStorage["_versions"] }, vz };
}

export function UserRow_unpack(item: IUserRowItem): ILimitedUserDao {
  const { vz, ...rest } = item;
  if (vz == null) {
    return rest;
  }
  const packed = JSON.parse(inflateSync(Buffer.from(vz)).toString()) as IVersionsRecord;
  const versions = { ...packed, ...((rest.storage._versions as IVersionsRecord | undefined) || {}) };
  return { ...rest, storage: { ...rest.storage, _versions: versions as IStorage["_versions"] } };
}
