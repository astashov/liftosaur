import { IndexedDBUtils_get } from "../utils/indexeddb";
import { Persistence } from "../utils/persistence";
import { IPartialStorage } from "../types";

export interface IAccount {
  id: string;
  name?: string;
  email?: string;
  numberOfPrograms?: number;
  numberOfWorkouts?: number;
  affiliateEnabled?: boolean;
  isCurrent: boolean;
}

export function Account_getFromStorage(id: string, email: string, storage: IPartialStorage): IAccount {
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

export async function Account_getAll(persistence: Persistence): Promise<IAccount[]> {
  const currentAccount = (await IndexedDBUtils_get("current_account")) as string;
  const summaries = await persistence.getAccountSummaries();
  return summaries.map((summary) => ({ ...summary, isCurrent: summary.id === currentAccount }));
}
