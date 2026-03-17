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
    const json = JSON.stringify(localStorage);
    const userId = localStorage.storage?.email || localStorage.storage?.tempUserId || key.replace("liftosaur_", "");
    await Promise.all([storage.set("current_account", userId), storage.set(`liftosaur_${userId}`, json)]);
  }, 100);
}
