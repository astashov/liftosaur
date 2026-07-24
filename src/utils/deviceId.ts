import { IndexedDBUtils_get, IndexedDBUtils_set } from "./indexeddb";
import { UidFactory_generateUid } from "./generator";
import { SendMessage_isIos, SendMessage_isAndroid } from "./sendMessage";

export async function DeviceId_get(): Promise<string> {
  if (DeviceId_cachedId) {
    return DeviceId_cachedId;
  }

  const type = DeviceId_getDeviceType();
  const storageKey = `${DeviceId_STORAGE_KEY}_${type}`;
  const stored = await IndexedDBUtils_get(storageKey);
  if (stored && typeof stored === "string") {
    DeviceId_cachedId = stored;
    return stored;
  }

  const newId = DeviceId_generate();
  await IndexedDBUtils_set(storageKey, newId);
  DeviceId_cachedId = newId;
  return newId;
}

export function DeviceId_generate(): string {
  const type = DeviceId_getDeviceType();
  const uid = UidFactory_generateUid(8);
  return `${type}_${uid}`;
}

export function DeviceId_getDeviceType(): string {
  if (typeof window === "undefined") {
    return "srv";
  } else if (window.webeditor) {
    return "edt";
  } else if (SendMessage_isIos()) {
    return "ios";
  } else if (SendMessage_isAndroid()) {
    return "and";
  } else {
    return "web";
  }
}

export const DeviceId_STORAGE_KEY = "device_id";

export let DeviceId_cachedId: string | undefined;
