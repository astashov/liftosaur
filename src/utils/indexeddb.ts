import { MMKV } from "react-native-mmkv";

export namespace IndexedDBUtils {
  export async function initializeForSafari(): Promise<void> {}

  export async function getAllKeys(): Promise<IDBValidKey[]> {
    const db = new MMKV();
    return db.getAllKeys();
  }

  export async function get(key: string): Promise<unknown> {
    const db = new MMKV();
    return db.getString(key);
  }

  export async function remove(key: string): Promise<void> {
    const db = new MMKV();
    db.delete(key);
  }

  export async function set(key: string, value?: string): Promise<void> {
    const db = new MMKV();
    db.set(key, value ?? "");
  }
}
