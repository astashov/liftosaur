import { getLatestMigrationVersion, migrations } from "./migrations";
import { ObjectUtils_keys } from "../utils/object";
import { IPartialStorage, IStorage } from "../types";
import { Storage_partialStorageToStorage } from "../models/storage";
import RB from "rollbar";
declare const Rollbar: RB;

export function unrunMigrations(storage: { version: string }, maxVersion?: string): Array<keyof typeof migrations> {
  const currentVersion = storage.version != null ? parseInt(storage.version.toString(), 10) : 0;
  const keys = ObjectUtils_keys(migrations);
  keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const maxVersionInt = maxVersion != null ? parseInt(maxVersion, 10) : undefined;
  return keys.filter((versionStr) => {
    const version = parseInt(versionStr, 10);
    return version > currentVersion && (maxVersionInt != null ? version <= maxVersionInt : true);
  });
}

export function runMigrations(storage: IStorage | IPartialStorage, maxVersion?: string): IStorage {
  const newVersions = unrunMigrations(storage, maxVersion);
  let result = Storage_partialStorageToStorage(storage);
  for (const version of newVersions) {
    try {
      result = migrations[version](result);
    } catch (error) {
      const e = error as Error;
      console.error(`Error running migration ${version}: ${e}`);
    }
  }
  result = { ...result, version: getLatestMigrationVersion() };
  return result;
}
