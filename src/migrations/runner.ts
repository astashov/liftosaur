import { IStorage } from "../ducks/reducer";
import { migrations } from "./migrations";
import { ObjectUtils } from "../utils/object";

export async function runMigrations(client: Window["fetch"], storage: IStorage): Promise<IStorage> {
  const currentVersion = storage.version != null ? parseInt(storage.version.toString(), 10) : 0;
  const keys = ObjectUtils.keys(migrations);
  keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const newVersions = keys.filter((versionStr) => {
    const version = parseInt(versionStr, 10);
    return version > currentVersion;
  });
  let result = storage;
  for (const version of newVersions) {
    result = await migrations[version](client, result);
  }
  return result;
}
