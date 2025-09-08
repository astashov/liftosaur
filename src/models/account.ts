import { IndexedDBUtils } from "../utils/indexeddb";
import { IStorage, IPartialStorage } from "../types";

export interface IAccount {
  id: string;
  name?: string;
  email?: string;
  numberOfPrograms?: number;
  numberOfWorkouts?: number;
  affiliateEnabled?: boolean;
  isCurrent: boolean;
}

export namespace Account {
  export function getFromStorage(id: string, email: string, storage: IPartialStorage): IAccount {
    return {
      id,
      email,
      name: storage.settings.nickname,
      numberOfPrograms: storage.programs?.length,
      numberOfWorkouts: storage.history?.length,
      affiliateEnabled: storage.settings.affiliateEnabled,
      isCurrent: true,
    };
  }

  export async function getAll(): Promise<IAccount[]> {
    const currentAccount = (await IndexedDBUtils.get("current_account")) as string;
    const allKeys = await IndexedDBUtils.getAllKeys();
    const results: IAccount[] = [];
    for (const key of allKeys) {
      if (typeof key === "string" && key.startsWith("liftosaur_")) {
        const id = key.replace("liftosaur_", "");
        const rawStorage = await IndexedDBUtils.get(key);
        if (typeof rawStorage === "string") {
          const storage: IStorage = JSON.parse(rawStorage)?.storage;
          results.push({
            id,
            email: storage?.email,
            name: storage?.settings?.nickname,
            numberOfPrograms: storage?.programs?.length || 0,
            numberOfWorkouts: storage?.history?.length || 0,
            isCurrent: id === currentAccount,
            affiliateEnabled: storage?.settings?.affiliateEnabled,
          });
        }
      }
    }
    return results;
  }
}
