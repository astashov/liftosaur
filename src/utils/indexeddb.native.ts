import { createMMKV } from "react-native-mmkv";
import RNFS from "react-native-fs";

const mmkv = createMMKV();
const legacyStorageDir = `${RNFS.DocumentDirectoryPath}/LiftosaurStorage`;

function sanitizeKey(key: string): string {
  return key
    .replace(/\//g, "_")
    .replace(/\\/g, "_")
    .replace(/:/g, "_")
    .replace(/\*/g, "_")
    .replace(/\?/g, "_")
    .replace(/"/g, "_")
    .replace(/</g, "_")
    .replace(/>/g, "_")
    .replace(/\|/g, "_");
}

async function migrateFromLegacy(key: string): Promise<string | undefined> {
  try {
    const path = `${legacyStorageDir}/${sanitizeKey(key)}.json`;
    const exists = await RNFS.exists(path);
    if (!exists) {
      return undefined;
    }
    const content = await RNFS.readFile(path, "utf8");
    mmkv.set(key, content);
    return content;
  } catch {
    return undefined;
  }
}

export function IndexedDBUtils_initializeForSafari(): Promise<void> {
  return Promise.resolve();
}

export async function IndexedDBUtils_getAllKeys(): Promise<string[]> {
  const keys = mmkv.getAllKeys();
  if (keys.length > 0) {
    return keys;
  }
  try {
    const exists = await RNFS.exists(legacyStorageDir);
    if (!exists) {
      return [];
    }
    const files = await RNFS.readDir(legacyStorageDir);
    return files.filter((f) => f.isFile() && f.name.endsWith(".json")).map((f) => f.name.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export async function IndexedDBUtils_get(key: string): Promise<unknown> {
  const value = mmkv.getString(key);
  if (value != null) {
    return value;
  }
  return migrateFromLegacy(key);
}

export async function IndexedDBUtils_remove(key: string): Promise<void> {
  mmkv.remove(key);
}

export async function IndexedDBUtils_set(key: string, value?: string): Promise<void> {
  if (value != null) {
    mmkv.set(key, value);
  } else {
    mmkv.remove(key);
  }
}
