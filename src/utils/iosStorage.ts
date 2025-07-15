import { UidFactory } from "./generator";
import { SendMessage } from "./sendMessage";

interface PendingRequest<T = any> {
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

export class IOSStorage {
  private pendingRequests: Map<string, PendingRequest>;

  constructor() {
    this.pendingRequests = new Map();
    // Listen for responses from iOS
    window.addEventListener("message", (event) => {
      this.handleResponse(event.data);
    });
  }

  public async set<T = any>(key: string, value: T): Promise<boolean> {
    if (!window.webkit?.messageHandlers?.liftosaurMessage) {
      throw new Error("iOS storage not available");
    }

    const requestId = this.generateRequestId();
    const promise = this.createPromise<boolean>(requestId);

    window.webkit.messageHandlers.liftosaurMessage.postMessage({
      type: "storageSet",
      key: key,
      value: typeof value === "string" ? value : JSON.stringify(value),
      requestId: requestId,
    });

    return promise;
  }

  public async get<T = any>(key: string): Promise<T | undefined> {
    if (!window.webkit?.messageHandlers?.liftosaurMessage) {
      throw new Error("iOS storage not available");
    }

    const requestId = this.generateRequestId();
    const promise = this.createPromise<T | undefined>(requestId);

    window.webkit.messageHandlers.liftosaurMessage.postMessage({
      type: "storageGet",
      key: key,
      requestId: requestId,
    });

    return promise;
  }

  public async delete(key: string): Promise<boolean> {
    if (!window.webkit?.messageHandlers?.liftosaurMessage) {
      throw new Error("iOS storage not available");
    }

    const requestId = this.generateRequestId();
    const promise = this.createPromise<boolean>(requestId);

    window.webkit.messageHandlers.liftosaurMessage.postMessage({
      type: "storageDelete",
      key: key,
      requestId: requestId,
    });

    return promise;
  }

  public async has(key: string): Promise<boolean> {
    if (!window.webkit?.messageHandlers?.liftosaurMessage) {
      throw new Error("iOS storage not available");
    }

    const requestId = this.generateRequestId();
    const promise = this.createPromise<boolean>(requestId);

    window.webkit.messageHandlers.liftosaurMessage.postMessage({
      type: "storageHas",
      key: key,
      requestId: requestId,
    });

    return promise;
  }

  public async getAllKeys(): Promise<string[]> {
    if (!window.webkit?.messageHandlers?.liftosaurMessage) {
      throw new Error("iOS storage not available");
    }

    const requestId = this.generateRequestId();
    const promise = this.createPromise<string[]>(requestId);

    window.webkit.messageHandlers.liftosaurMessage.postMessage({
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
    return SendMessage.isIos() && SendMessage.iosAppVersion() >= 12;
  }

  private generateRequestId(): string {
    return `req_${UidFactory.generateUid(8)}`;
  }

  private handleResponse(data: IStorageResponse): void {
    if (!data.requestId) {
      return;
    }

    const pendingRequest = this.pendingRequests.get(data.requestId);
    if (!pendingRequest) {
      return;
    }

    // Clear the timeout
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
          reject(new Error(`iOS storage operation timed out (requestId: ${requestId})`));
        }
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
    });
  }
}
