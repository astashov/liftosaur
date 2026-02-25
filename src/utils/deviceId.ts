import { IndexedDBUtils_get, IndexedDBUtils_set } from "./indexeddb";
import { UidFactory_generateUid } from "./generator";
import { SendMessage_isIos, SendMessage_isAndroid } from "./sendMessage";

export class DeviceId {
  private static readonly STORAGE_KEY = "device_id";
  private static cachedId: string | undefined;

  public static async get(): Promise<string> {
    if (this.cachedId) {
      return this.cachedId;
    }

    const type = this.getDeviceType();
    const storageKey = `${this.STORAGE_KEY}_${type}`;
    const stored = await IndexedDBUtils_get(storageKey);
    if (stored && typeof stored === "string") {
      this.cachedId = stored;
      return stored;
    }

    const newId = this.generate();
    await IndexedDBUtils_set(storageKey, newId);
    this.cachedId = newId;
    return newId;
  }

  private static generate(): string {
    const type = this.getDeviceType();
    const uid = UidFactory_generateUid(8);
    return `${type}_${uid}`;
  }

  private static getDeviceType(): string {
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
}
