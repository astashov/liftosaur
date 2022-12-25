export namespace IndexedDBUtils {
  export function initializeForSafari(): Promise<void> {
    return new Promise((resolve) => {
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

  export function get(key: string): Promise<unknown> {
    return new Promise(async (resolve, reject) => {
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
  }

  export function set(key: string, value?: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const db = await initialize();
      const transaction = db.transaction("keyval", "readwrite");
      const objectStore = transaction.objectStore("keyval");
      const request = objectStore.put(value, key);
      request.addEventListener("success", (e) => {
        db.close();
        resolve();
      });
      request.addEventListener("error", (e) => {
        db.close();
        reject(e);
      });
    });
  }
}
