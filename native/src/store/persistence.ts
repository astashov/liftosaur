import { NativeStorageRN } from "./NativeStorageRN";
import type { ILocalStorage } from "@shared/models/state";

const storage = new NativeStorageRN();

export async function Persistence_loadLocalStorage(): Promise<{
  key: string;
  localStorage: ILocalStorage | undefined;
}> {
  const currentAccount = await storage.get("current_account");
  const key = currentAccount ? `liftosaur_${currentAccount}` : "liftosaur";
  const raw = await storage.get(key);
  if (raw == null) {
    return { key, localStorage: undefined };
  }
  try {
    return { key, localStorage: JSON.parse(raw) as ILocalStorage };
  } catch {
    return { key, localStorage: undefined };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function Persistence_saveLocalStorage(key: string, localStorage: ILocalStorage): void {
  if (saveTimer != null) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(async () => {
    saveTimer = undefined;
    const t0 = Date.now();
    const json = JSON.stringify(localStorage);
    const stringifyMs = Date.now() - t0;
    const userId = localStorage.storage?.email || localStorage.storage?.tempUserId || key.replace("liftosaur_", "");
    await Promise.all([storage.set("current_account", userId), storage.set(`liftosaur_${userId}`, json)]);
    console.log(
      `[PERF] Persistence_saveLocalStorage: stringify=${stringifyMs}ms, total=${Date.now() - t0}ms, size=${(json.length / 1024).toFixed(0)}kb`
    );
  }, 100);
}
