import { getLatestMigrationVersion, migrations } from "./migrations";
import { ObjectUtils } from "../utils/object";
import { IPartialStorage, IStorage } from "../types";
import { Storage } from "../models/storage";
import RB from "rollbar";
declare const Rollbar: RB;

export function unrunMigrations(storage: { version: string }, maxVersion?: string): Array<keyof typeof migrations> {
  const currentVersion = storage.version != null ? parseInt(storage.version.toString(), 10) : 0;
  const keys = ObjectUtils.keys(migrations);
  keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const maxVersionInt = maxVersion != null ? parseInt(maxVersion, 10) : undefined;
  return keys.filter((versionStr) => {
    const version = parseInt(versionStr, 10);
    return version > currentVersion && (maxVersionInt != null ? version <= maxVersionInt : true);
  });
}

export async function runMigrations(
  client: Window["fetch"],
  storage: IStorage | IPartialStorage,
  maxVersion?: string
): Promise<IStorage> {
  const newVersions = unrunMigrations(storage, maxVersion);
  let result = Storage.partialStorageToStorage(storage);
  for (const version of newVersions) {
    try {
      result = await migrations[version](client, result);
    } catch (e) {
      console.error(`Error running migration ${version}: ${e}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== "undefined" && (window as any).Rollbar != null) {
        Rollbar.error(e);
      }
    }
  }
  result = { ...result, version: getLatestMigrationVersion() };
  return result;
}
