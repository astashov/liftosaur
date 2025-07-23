import { NativeStorage } from "./nativeStorage";
import { ObjectUtils } from "./object";
import { lg } from "./posthog";
import { SendMessage } from "./sendMessage";

type ITransactionMode = "readonly" | "readwrite";

export let nativeStorage: NativeStorage | undefined;

export namespace IndexedDBUtils {
  async function withTransaction<T>(
    mode: ITransactionMode,
    operation: (objectStore: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const db = await initialize();
      const transaction = db.transaction("keyval", mode);
      const objectStore = transaction.objectStore("keyval");

      let result: T;

      try {
        const request = operation(objectStore);

        request.addEventListener("success", () => {
          result = request.result;
        });

        request.addEventListener("error", (e) => {
          const error = (e.target as IDBRequest)?.error;
          reject(error || new Error("IndexedDB request failed"));
        });
      } catch (e) {
        db.close();
        reject(e);
        return;
      }

      transaction.addEventListener("complete", () => {
        db.close();
        resolve(result);
      });

      transaction.addEventListener("error", (e) => {
        db.close();
        const error = (e.target as IDBTransaction)?.error;
        reject(error || new Error("IndexedDB transaction failed"));
      });

      transaction.addEventListener("abort", (e) => {
        db.close();
        const error = (e.target as IDBTransaction)?.error;
        reject(error || new Error("IndexedDB transaction aborted"));
      });
    });
  }

  export function initializeForSafari(): Promise<void> {
    return new Promise((resolve) => {
      if (nativeStorage == null && NativeStorage.isAvailable()) {
        nativeStorage = new NativeStorage();
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
      if (nativeStorage == null && NativeStorage.isAvailable()) {
        nativeStorage = new NativeStorage();
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
    return withTransaction("readonly", (objectStore) => objectStore.getAllKeys());
  }

  export async function get(key: string): Promise<unknown> {
    const result = await withTransaction("readonly", (objectStore) => objectStore.getAll(key)).then(
      (results: unknown[]) => {
        return results[0];
      }
    );
    let nativeStorageData: unknown = undefined;
    const prefix = SendMessage.isIos() ? "ios" : "android";
    if (nativeStorage != null) {
      try {
        nativeStorageData = await nativeStorage.get(key);
      } catch (e) {
        lg(`ls-${prefix}-storage-get-error`, { error: `${e}` });
      }
    }
    if (nativeStorageData != null) {
      let isEqual = false;
      if (typeof nativeStorageData === "string" && typeof result === "string") {
        isEqual = nativeStorageData === result;
      } else if (typeof result === "object" && typeof nativeStorageData === "string") {
        isEqual = ObjectUtils.isEqual(result, JSON.parse(nativeStorageData));
      }
      lg(`ls-${prefix}-storage-get`, { isEqual: isEqual ? "true" : "false" });
    }
    return result;
  }

  export async function remove(key: string): Promise<void> {
    await withTransaction("readwrite", (objectStore) => objectStore.delete(key));
    await nativeStorage?.delete(key);
  }

  export async function set(key: string, value?: string): Promise<void> {
    await withTransaction("readwrite", (objectStore) => {
      return objectStore.put(value, key);
    });
    await nativeStorage?.set(key, value);
  }
}
