import { IStorage } from "../ducks/reducer";
import { migrations } from "./migrations";
import { ObjectUtils } from "../utils/object";

export function runMigrations(storage: IStorage): IStorage {
  const currentVersion = storage.version != null ? parseInt(storage.version, 10) : 0;
  const keys = ObjectUtils.keys(migrations);
  keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const newVersions = keys.filter((versionStr) => {
    const version = parseInt(versionStr, 10);
    return version > currentVersion;
  });
  return newVersions.reduce((s, version) => migrations[version](s), storage);
}
