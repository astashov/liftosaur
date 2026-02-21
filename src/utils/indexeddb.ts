import { NativeStorage } from "./nativeStorage";
import { lg } from "./posthog";

type ITransactionMode = "readonly" | "readwrite";

export let nativeStorage: NativeStorage | undefined;

export namespace IndexedDBUtils {
  async function withTransaction<T>(
    mode: ITransactionMode,
    operation: (objectStore: IDBObjectStore) => IDBRequest<T>
  ): Promise<T | undefined> {
    const promise = new Promise<T>(async (resolve, reject) => {
      const db = await initialize();
      if (db == null) {
        lg("ls-indexeddb-empty");
        return;
      }
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
    try {
      const result = await promise;
      return result;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const errorDetails = {
        name: e?.name,
        message: e?.message,
        stack: e?.stack,
      };
      lg("ls-indexeddb-error", { json: JSON.stringify(e), details: JSON.stringify(errorDetails) });
      console.error("IndexedDB error:", e);
      return undefined;
    }
  }

  async function withNative<T>(operation: () => T): Promise<T | undefined> {
    try {
      return await operation();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      lg("ls-native-storage-error", { json: JSON.stringify(e) });
      console.error("Native Storage error:", e);
      return undefined;
    }
  }

  export function initializeForSafari(): Promise<void> {
    return new Promise((resolve) => {
      if (nativeStorage == null && NativeStorage.isAvailable()) {
        nativeStorage = new NativeStorage();
      }
      if (!window.indexedDB) {
        if (!NativeStorage.isAvailable()) {
          window.location.reload();
        }
        resolve();
        return;
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

  export function initialize(): Promise<IDBDatabase | undefined> {
    return new Promise((resolve, reject) => {
      if (nativeStorage == null && NativeStorage.isAvailable()) {
        nativeStorage = new NativeStorage();
      }

      if (!window.indexedDB) {
        if (!NativeStorage.isAvailable()) {
          window.location.reload();
          reject(new Error("IndexedDB is not available"));
        } else {
          resolve(undefined);
        }
        return;
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

  export async function getAllKeys(): Promise<string[]> {
    let result: string[] | undefined = undefined;
    if (nativeStorage != null) {
      result = await nativeStorage.getAllKeys();
    } else {
      result = await withTransaction("readonly", (objectStore) => {
        const keys = objectStore.getAllKeys();
        return keys as IDBRequest<string[]>;
      });
    }
    if (result != null) {
      return result;
    } else {
      return Promise.resolve([]);
    }
  }

  export async function get(key: string): Promise<unknown> {
    let result: unknown = undefined;
    const userid =
      typeof window !== "undefined"
        ? (window.tempUserId ?? (key.startsWith("liftosaur_") ? key.replace("liftosaur_", "") : undefined))
        : undefined;
    if (nativeStorage != null) {
      result = await withNative(() => nativeStorage?.get(key));
      if (result == null) {
        lg("ls-native-fallback-get", { key }, undefined, userid);
        const nativeResult = result;
        result = await withTransaction("readonly", (objectStore) => objectStore.getAll(key)).then(
          (results: unknown[] | undefined) => {
            return results?.[0];
          }
        );
        if (nativeResult !== result) {
          lg("ls-native-fallback-discrepancy", { key }, undefined, userid);
        }
      } else {
        lg("ls-native-get", { key }, undefined, userid);
      }
      return result;
    } else {
      result = await withTransaction("readonly", (objectStore) => objectStore.getAll(key)).then(
        (results: unknown[] | undefined) => {
          return results?.[0];
        }
      );
      lg("ls-indexeddb-get", { key }, undefined, userid);
    }
    return result;
  }

  export async function remove(key: string): Promise<void> {
    await Promise.all([
      withTransaction("readwrite", (objectStore) => objectStore.delete(key)),
      withNative(() => nativeStorage?.delete(key)),
    ]);
  }

  export async function set(key: string, value?: string): Promise<void> {
    await Promise.all([
      withTransaction("readwrite", (objectStore) => {
        return objectStore.put(value, key);
      }),
      withNative(() => nativeStorage?.set(key, value)),
    ]);
  }
}
