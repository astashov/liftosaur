import RNFS from "react-native-fs";

const storageDir = `${RNFS.DocumentDirectoryPath}/LiftosaurStorage`;

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

function filePath(key: string): string {
  return `${storageDir}/${sanitizeKey(key)}.json`;
}

async function ensureDir(): Promise<void> {
  const exists = await RNFS.exists(storageDir);
  if (!exists) {
    await RNFS.mkdir(storageDir);
  }
}

export function IndexedDBUtils_initializeForSafari(): Promise<void> {
  return ensureDir();
}

export async function IndexedDBUtils_getAllKeys(): Promise<string[]> {
  await ensureDir();
  try {
    const files = await RNFS.readDir(storageDir);
    return files
      .filter((f) => f.isFile() && f.name.endsWith(".json"))
      .map((f) => f.name.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export async function IndexedDBUtils_get(key: string): Promise<unknown> {
  try {
    const path = filePath(key);
    const exists = await RNFS.exists(path);
    if (!exists) {
      return undefined;
    }
    const content = await RNFS.readFile(path, "utf8");
    return content;
  } catch {
    return undefined;
  }
}

export async function IndexedDBUtils_remove(key: string): Promise<void> {
  try {
    const path = filePath(key);
    const exists = await RNFS.exists(path);
    if (exists) {
      await RNFS.unlink(path);
    }
  } catch {
    // noop
  }
}

export async function IndexedDBUtils_set(key: string, value?: string): Promise<void> {
  await ensureDir();
  try {
    if (value != null) {
      await RNFS.writeFile(filePath(key), value, "utf8");
    } else {
      await IndexedDBUtils_remove(key);
    }
  } catch (e) {
    console.error("IndexedDBUtils_set error:", e);
  }
}
