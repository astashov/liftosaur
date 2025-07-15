import { IOSStorage } from "./iosStorage";
import { ObjectUtils } from "./object";
import { lg } from "./posthog";

export let iosStorage: IOSStorage | undefined;

export namespace IndexedDBUtils {
  export function initializeForSafari(): Promise<void> {
    return new Promise((resolve) => {
      if (iosStorage == null && IOSStorage.isAvailable()) {
        iosStorage = new IOSStorage();
      }
      const connection = window.indexedDB.open("keyval-store");
      const handler = (): void => {
        if (connection.result != null) {
          connection.result.close();
        }
        resolve();
      };
      connection.addEventListener("success", handler);
      connection.addEventListener("error", handler);
      connection.addEventListener("blocked", handler);
      connection.addEventListener("upgradeneeded", (event) => {
        const request = event.target as IDBOpenDBRequest;
        if (request?.result) {
          request.result.createObjectStore("keyval");
        }
      });
    });
  }

  export function initialize(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (iosStorage == null && IOSStorage.isAvailable()) {
        iosStorage = new IOSStorage();
      }

      const connection = window.indexedDB.open("keyval-store");
      connection.addEventListener("success", (event) => {
        const request = event.target as IDBOpenDBRequest;
        resolve(request.result);
      });
      connection.addEventListener("error", (event) => {
        reject(event);
      });
      connection.addEventListener("blocked", (event) => {
        reject(new Error("IndexedDB initialization blocked"));
      });
      connection.addEventListener("upgradeneeded", (event) => {
        const request = event.target as IDBOpenDBRequest;
        request.result.createObjectStore("keyval");
      });
    });
  }

  export function getAllKeys(): Promise<IDBValidKey[]> {
    return new Promise(async (resolve, reject) => {
      const db = await initialize();
      const transaction = db.transaction("keyval", "readonly");
      const objectStore = transaction.objectStore("keyval");
      const request = objectStore.getAllKeys();
      request.addEventListener("success", (e) => {
        const keys = request.result;
        db.close();
        resolve(keys);
      });
      request.addEventListener("error", (e) => {
        db.close();
        reject(e);
      });
    });
  }

  export async function get(key: string): Promise<unknown> {
    const result = await new Promise(async (resolve, reject) => {
      const db = await initialize();
      const transaction = db.transaction("keyval", "readonly");
      const objectStore = transaction.objectStore("keyval");
      const request = objectStore.getAll(key);
      request.addEventListener("success", (e) => {
        const result = request.result[0];
        db.close();
        resolve(result);
      });
      request.addEventListener("error", (e) => {
        db.close();
        reject(e);
      });
    });
    let iosStorageData: unknown = undefined;
    if (iosStorage != null) {
      try {
        iosStorageData = await iosStorage.get(key);
      } catch (e) {
        lg("ls-ios-storage-get-error", { error: `${e}` });
      }
    }
    if (iosStorageData != null) {
      let isEqual = false;
      if (typeof iosStorageData === "string" && typeof result === "string") {
        isEqual = iosStorageData === result;
      } else if (typeof result === "object" && typeof iosStorageData === "string") {
        isEqual = ObjectUtils.isEqual(result, JSON.parse(iosStorageData));
      }
      lg("ls-ios-storage-get", { isEqual: isEqual ? "true" : "false" });
    }
    return result;
  }

  export async function remove(key: string): Promise<void> {
    await new Promise(async (resolve, reject) => {
      const db = await initialize();
      const transaction = db.transaction("keyval", "readwrite");
      const objectStore = transaction.objectStore("keyval");
      const request = objectStore.delete(key);
      request.addEventListener("success", (e) => {
        db.close();
        resolve(void 0);
      });
      request.addEventListener("error", (e) => {
        db.close();
        reject(e);
      });
    });
    await iosStorage?.delete(key);
  }

  export async function set(key: string, value?: string): Promise<void> {
    await new Promise(async (resolve, reject) => {
      const db = await initialize();
      const transaction = db.transaction("keyval", "readwrite");
      const objectStore = transaction.objectStore("keyval");
      const request = objectStore.put(value, key);
      request.addEventListener("success", (e) => {
        db.close();
        resolve(void 0);
      });
      request.addEventListener("error", (e) => {
        db.close();
        reject(e);
      });
    });
    await iosStorage?.set(key, value);
  }
}
