import { UidFactory_generateUid } from "./generator";
import {
  SendMessage_toIosAndAndroid,
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
} from "./sendMessage";
import { ReactNativeUtils_isWebViewMode, ReactNativeUtils_postToRN } from "./reactNative";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface IPendingRequest<T = any> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

type IStorageResponseGetResult = {
  type: "storageGetResult";
  key: string;
  requestId: string;
  value: string;
};

type IStorageResponseSetResult = {
  type: "storageSetResult";
  key: string;
  requestId: string;
  success: boolean;
};

type IStorageResponseDeleteResult = {
  type: "storageDeleteResult";
  key: string;
  requestId: string;
  success: boolean;
};

type IStorageResponseHasResult = {
  type: "storageHasResult";
  key: string;
  requestId: string;
  exists: boolean;
};

type IStorageResponseGetAllKeysResult = {
  type: "storageGetAllKeysResult";
  requestId: string;
  keys: string[];
};

type IStorageResponse =
  | IStorageResponseGetResult
  | IStorageResponseSetResult
  | IStorageResponseDeleteResult
  | IStorageResponseHasResult
  | IStorageResponseGetAllKeysResult;

export class NativeStorage {
  private readonly pendingRequests: Map<string, IPendingRequest>;
  private readonly isRN: boolean;

  constructor() {
    this.pendingRequests = new Map();
    this.isRN = ReactNativeUtils_isWebViewMode();
    window.addEventListener("message", (event) => {
      if (event.data != null) {
        this.handleResponse(event.data);
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private send(msg: Record<string, any>): void {
    if (this.isRN) {
      ReactNativeUtils_postToRN(msg);
    } else {
      SendMessage_toIosAndAndroid(msg);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async set<T = any>(key: string, value: T): Promise<boolean> {
    const t0 = Date.now();
    const requestId = this.generateRequestId();
    const promise = this.createPromise<boolean>(requestId);

    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    this.send({
      type: "storageSet",
      key: key,
      value: strValue,
      requestId: requestId,
    });

    const result = await promise;
    console.log(`[PERF] NativeStorage.set(${key}): ${Date.now() - t0}ms, size=${(strValue.length / 1024).toFixed(0)}kb`);
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async get<T = any>(key: string): Promise<T | undefined> {
    const t0 = Date.now();
    const requestId = this.generateRequestId();
    const promise = this.createPromise<T | undefined>(requestId);

    this.send({
      type: "storageGet",
      key: key,
      requestId: requestId,
    });

    const result = await promise;
    console.log(`[PERF] NativeStorage.get(${key}): ${Date.now() - t0}ms`);
    return result;
  }

  public async delete(key: string): Promise<boolean> {
    const requestId = this.generateRequestId();
    const promise = this.createPromise<boolean>(requestId);

    this.send({
      type: "storageDelete",
      key: key,
      requestId: requestId,
    });

    return promise;
  }

  public async has(key: string): Promise<boolean> {
    const requestId = this.generateRequestId();
    const promise = this.createPromise<boolean>(requestId);

    this.send({
      type: "storageHas",
      key: key,
      requestId: requestId,
    });

    return promise;
  }

  public async getAllKeys(): Promise<string[]> {
    const requestId = this.generateRequestId();
    const promise = this.createPromise<string[]>(requestId);

    this.send({
      type: "storageGetAllKeys",
      requestId: requestId,
    });

    return promise;
  }

  public async clear(): Promise<boolean> {
    const keys = await this.getAllKeys();
    await Promise.all(keys.map((key) => this.delete(key)));
    return true;
  }

  public static isAvailable(): boolean {
    return (
      ReactNativeUtils_isWebViewMode() ||
      (SendMessage_isIos() && SendMessage_iosAppVersion() >= 12) ||
      (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 21)
    );
  }

  private generateRequestId(): string {
    return `req_${UidFactory_generateUid(8)}`;
  }

  private handleResponse(data: IStorageResponse): void {
    if (!data.requestId) {
      return;
    }

    const pendingRequest = this.pendingRequests.get(data.requestId);
    if (!pendingRequest) {
      return;
    }

    clearTimeout(pendingRequest.timeout);
    this.pendingRequests.delete(data.requestId);

    if (data.type === "storageSetResult") {
      pendingRequest.resolve(data.success ?? false);
    } else if (data.type === "storageGetResult") {
      const value = data.value;
      pendingRequest.resolve(value);
    } else if (data.type === "storageDeleteResult") {
      pendingRequest.resolve(data.success ?? false);
    } else if (data.type === "storageHasResult") {
      pendingRequest.resolve(data.exists ?? false);
    } else if (data.type === "storageGetAllKeysResult") {
      pendingRequest.resolve(data.keys || []);
    }
  }

  private createPromise<T>(requestId: string, timeoutMs: number = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Native storage operation timed out (requestId: ${requestId})`));
        }
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
    });
  }
}
