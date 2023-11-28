import { getLatestMigrationVersion, migrations } from "./migrations";
import { ObjectUtils } from "../utils/object";
import { IStorage } from "../types";

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
  storage: IStorage,
  maxVersion?: string
): Promise<IStorage> {
  const newVersions = unrunMigrations(storage, maxVersion);
  let result = storage;
  for (const version of newVersions) {
    result = await migrations[version](client, result);
  }
  result = { ...result, version: getLatestMigrationVersion() };
  return result;
}
