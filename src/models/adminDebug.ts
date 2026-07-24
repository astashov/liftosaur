import { Service } from "../api/service";
import { IStorage } from "../types";
import { IEither } from "../utils/types";

// The "debug_" prefix on tempUserId is the single source of truth for a debug session:
// it forces nosync on every load (see getInitialState) and, since it's never a real
// user's tempUserId, an accidental sync can only ever land on a throwaway account.
export const adminDebugPrefix = "debug_";

export function AdminDebug_scrambledTempUserId(userId: string): string {
  return `${adminDebugPrefix}${userId}`;
}

export function AdminDebug_isDebugAccountId(id: string | undefined): boolean {
  return id != null && id.startsWith(adminDebugPrefix);
}

export async function AdminDebug_fetchStorage(
  service: Service,
  tempUserId: string,
  userId: string,
  adminKey: string,
  storageId?: string
): Promise<IEither<IStorage, string>> {
  try {
    const response = await service.getStorage(tempUserId, userId, storageId, adminKey);
    if (response.storage == null) {
      return { success: false, error: "User not found or invalid admin key" };
    }
    const storage: IStorage = { ...response.storage, tempUserId: AdminDebug_scrambledTempUserId(userId) };
    return { success: true, data: storage };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function AdminDebug_fetchDebugSnapshotStorage(
  service: Service,
  userId: string,
  adminKey: string,
  timestamp: string
): Promise<IEither<IStorage, string>> {
  try {
    const snapshotStorage = await service.getDebugSnapshotStorage(userId, adminKey, timestamp);
    if (snapshotStorage == null) {
      return { success: false, error: "Snapshot not found or invalid admin key" };
    }
    const storage: IStorage = { ...snapshotStorage, tempUserId: AdminDebug_scrambledTempUserId(userId) };
    return { success: true, data: storage };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
