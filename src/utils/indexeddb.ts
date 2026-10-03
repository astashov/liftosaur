import { lg } from "./posthog";

type ITransactionMode = "readonly" | "readwrite";

function runTransaction<T>(
  mode: ITransactionMode,
  operation: (objectStore: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise<T>(async (resolve, reject) => {
    const db = await IndexedDBUtils_initialize();
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logIndexedDBError(e: any): void {
  const errorDetails = {
    name: e?.name,
    message: e?.message,
    stack: e?.stack,
  };
  lg("ls-indexeddb-error", { json: JSON.stringify(e), details: JSON.stringify(errorDetails) });
  console.error("IndexedDB error:", e);
}

async function withTransaction<T>(
  mode: ITransactionMode,
  operation: (objectStore: IDBObjectStore) => IDBRequest<T>
): Promise<T | undefined> {
  try {
    return await runTransaction(mode, operation);
  } catch (e) {
    logIndexedDBError(e);
    return undefined;
  }
}

export function IndexedDBUtils_initializeForSafari(): Promise<void> {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      window.location.reload();
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

export function IndexedDBUtils_initialize(): Promise<IDBDatabase | undefined> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      window.location.reload();
      reject(new Error("IndexedDB is not available"));
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

export async function IndexedDBUtils_getAllKeys(): Promise<string[]> {
  const result = await withTransaction("readonly", (objectStore) => {
    const keys = objectStore.getAllKeys();
    return keys as IDBRequest<string[]>;
  });
  if (result != null) {
    return result;
  } else {
    return Promise.resolve([]);
  }
}

export async function IndexedDBUtils_get(key: string): Promise<unknown> {
  const userid =
    typeof window !== "undefined"
      ? (window.tempUserId ?? (key.startsWith("liftosaur_") ? key.replace("liftosaur_", "") : undefined))
      : undefined;
  const result = await withTransaction("readonly", (objectStore) => objectStore.getAll(key)).then(
    (results: unknown[] | undefined) => {
      return results?.[0];
    }
  );
  lg("ls-indexeddb-get", { key }, undefined, userid);
  return result;
}

export async function IndexedDBUtils_remove(key: string): Promise<void> {
  await withTransaction("readwrite", (objectStore) => objectStore.delete(key));
}

export async function IndexedDBUtils_set(key: string, value?: string): Promise<void> {
  await withTransaction("readwrite", (objectStore) => {
    return objectStore.put(value, key);
  });
}

// Unlike IndexedDBUtils_set, REJECTS on transaction failure (e.g. quota abort): the
// persistence layer's reference-diff cache must only record refs after a confirmed write,
// otherwise a silently failed shard write would be skipped as "unchanged" forever.
export async function IndexedDBUtils_setMany(pairs: Array<[string, string | undefined]>): Promise<void> {
  if (pairs.length === 0) {
    return;
  }
  try {
    // Single transaction so concurrent tabs always observe a consistent set of shards
    await runTransaction("readwrite", (objectStore) => {
      let lastRequest: IDBRequest | undefined;
      for (const [key, value] of pairs) {
        lastRequest = value != null ? objectStore.put(value, key) : objectStore.delete(key);
      }
      return lastRequest!;
    });
  } catch (e) {
    logIndexedDBError(e);
    throw e;
  }
}
