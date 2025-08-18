import { IStorage, IHistoryRecord, ISettings, IProgram } from "../types";
import { IEither } from "../utils/types";
import { UrlUtils } from "../utils/url";
import { IStorageUpdate2 } from "../utils/sync";
import { IExportedProgram } from "../models/program";
import { CollectionUtils } from "../utils/collection";
import { Encoder } from "../utils/encoder";

export interface IGetStorageResponse {
  email: string;
  storage: IStorage;
  user_id: string;
  key?: string;
}

export type IPostSyncResponse =
  | {
      type: "dirty";
      storage: IStorage;
      email: string;
      user_id: string;
      key?: string;
    }
  | {
      type: "clean";
      new_original_id: number;
      email: string;
      user_id: string;
      key?: string;
    }
  | {
      type: "error";
      error: string;
      key?: string;
    };

export type IPostStorageResponse =
  | {
      status: "success";
      newOriginalId: number;
    }
  | {
      status: "request";
      data: ("programs" | "history" | "stats")[];
    }
  | {
      status: "merged";
      storage: IStorage;
    };

type IRedeemCouponError = "not_authorized" | "coupon_not_found" | "coupon_already_claimed" | "unknown";

export interface IAiConvertResponse {
  program: string;
}

export type IEventPayload =
  | {
      type: "event";
      userId?: string;
      timestamp: number;
      name: string;
      isMobile?: boolean;
      iOSVersion?: number;
      androidVersion?: number;
      commithash: string;
      extra?: Record<string, string | number>;
    }
  | {
      type: "error";
      userId?: string;
      timestamp: number;
      message: string;
      stack: string;
      commithash: string;
      isMobile?: boolean;
      rollbar_id: string;
    }
  | {
      type: "safesnapshot";
      userId?: string;
      timestamp: number;
      storage_id: string;
      commithash: string;
      isMobile?: boolean;
      update: string;
    }
  | {
      type: "mergesnapshot";
      userId?: string;
      timestamp: number;
      storage_id: string;
      commithash: string;
      isMobile?: boolean;
      update: string;
    };

const cachePromises: Partial<Record<string, unknown>> = {};

declare let __API_HOST__: string;
declare let __HOST__: string;
declare let __STREAMING_API_HOST__: string;

export interface IRecordResponse {
  history: IHistoryRecord[];
  record: IHistoryRecord;
  settings: ISettings;
}

export class Service {
  public readonly client: Window["fetch"];

  constructor(client: Window["fetch"]) {
    this.client = client;
  }

  public async googleSignIn(
    token: string,
    id: string,
    args: { forcedUserEmail?: string }
  ): Promise<IGetStorageResponse> {
    let historylimit = 20;
    const body = JSON.stringify({
      token,
      id,
      forceuseremail: args.forcedUserEmail,
      historylimit,
    });
    const response = await this.client(`${__API_HOST__}/api/signin/google`, {
      method: "POST",
      body: body,
      credentials: "include",
    });
    const json: IGetStorageResponse = await response.json();
    json.storage.history = await this.getAllHistoryRecords({
      alreadyFetchedHistory: json.storage.history,
      historyLimit: historylimit,
    });
    return { email: json.email, storage: json.storage, user_id: json.user_id };
  }

  public async getAllHistoryRecords(args: {
    alreadyFetchedHistory?: IHistoryRecord[];
    historyLimit?: number;
  }): Promise<IHistoryRecord[]> {
    let history = args.alreadyFetchedHistory || [];
    let historyResponse: IHistoryRecord[] | undefined = undefined;
    let historyLimit = args.historyLimit || 20;
    while ((historyResponse || history).length > historyLimit - 1) {
      historyLimit = 200;
      historyResponse = await this.getHistory({
        after: history.length > 1 ? history[history.length - 2].id : undefined,
        limit: historyLimit,
      });
      if (historyResponse.length > 0) {
        history = [...history, ...historyResponse];
      } else {
        break;
      }
    }
    history = CollectionUtils.uniqBy(history, "id");
    return history;
  }

  public async getHistory(args: { after?: number; limit?: number }): Promise<IHistoryRecord[]> {
    const url = UrlUtils.build(`${__API_HOST__}/api/history`);
    if (args.after) {
      url.searchParams.set("after", args.after.toString());
    }
    if (args.limit) {
      url.searchParams.set("limit", args.limit.toString());
    }
    const response = await this.client(url.toString(), { credentials: "include" });
    const json: { history: IHistoryRecord[] } = await response.json();
    return json.history;
  }

  public async appleSignIn(code: string, idToken: string, id: string): Promise<IGetStorageResponse> {
    let historylimit = 20;
    const response = await this.client(`${__API_HOST__}/api/signin/apple`, {
      method: "POST",
      body: JSON.stringify({
        code,
        idToken,
        id,
        historylimit,
      }),
      credentials: "include",
    });
    const json: IGetStorageResponse = await response.json();
    json.storage.history = await this.getAllHistoryRecords({
      alreadyFetchedHistory: json.storage.history,
      historyLimit: historylimit,
    });
    return { email: json.email, storage: json.storage, user_id: json.user_id };
  }

  public async signout(): Promise<void> {
    await this.client(`${__API_HOST__}/api/signout`, {
      method: "POST",
      body: JSON.stringify({}),
      credentials: "include",
    });
  }

  public async getProgramRevisions(programId: string): Promise<IEither<string[], string>> {
    const result = await this.client(`${__API_HOST__}/api/programrevisions/${programId}`, {
      method: "GET",
      credentials: "include",
    });
    if (result.ok) {
      const json = await result.json();
      return { success: true, data: json.data };
    } else {
      return { success: false, error: "error" };
    }
  }

  public async getProgramRevision(programId: string, revision: string): Promise<IEither<string, string>> {
    const result = await this.client(`${__API_HOST__}/api/programrevision/${programId}/${revision}`, {
      method: "GET",
      credentials: "include",
    });
    if (result.ok) {
      const json = await result.json();
      return { success: true, data: json.text };
    } else {
      return { success: false, error: "error" };
    }
  }

  public async postSync(args: {
    storageUpdate: IStorageUpdate2;
    tempUserId: string | undefined;
  }): Promise<IPostSyncResponse> {
    const url = UrlUtils.build(`${__API_HOST__}/api/sync2`);
    if (args.tempUserId) {
      url.searchParams.set("tempuserid", args.tempUserId);
    }
    const body = JSON.stringify({ storageUpdate: args.storageUpdate, timestamp: Date.now(), historylimit: 20 });
    const compressedBody = await Encoder.encode(body);
    const payload = JSON.stringify({ data: compressedBody });
    const result = await this.client(url.toString(), {
      method: "POST",
      body: payload,
      credentials: "include",
    });
    const json: IPostSyncResponse = await result.json();
    if (json.type === "dirty") {
      json.storage.history = await this.getAllHistoryRecords({
        alreadyFetchedHistory: json.storage.history,
        historyLimit: 20,
      });
    }
    return json;
  }

  public async postDebug(id: string, state: string, meta: Record<string, string>): Promise<boolean> {
    try {
      const response = await this.client(`${__API_HOST__}/api/debug`, {
        method: "POST",
        body: JSON.stringify({ id, data: { state, meta } }),
        credentials: "include",
      });
      const json = await response.json();
      return json?.data === "ok";
    } catch (e) {
      return false;
    }
  }

  public async postClaimKey(userid: string): Promise<{ key: string; expires: number } | undefined> {
    const response = await this.client(`${__API_HOST__}/api/claimkey/${userid}`, {
      method: "POST",
      credentials: "include",
    });
    const json = await response.json();
    return json?.data?.claim;
  }

  public async postAddFreeUser(userid: string, adminKey: string): Promise<void> {
    const url = UrlUtils.build(`${__API_HOST__}/api/addfreeuser/${userid}`);
    url.searchParams.set("key", adminKey);
    await this.client(url.toString(), {
      method: "POST",
      credentials: "include",
    });
  }

  public async postSaveProgram(program: IExportedProgram): Promise<IEither<string, string>> {
    const url = UrlUtils.build(`${__API_HOST__}/api/program`);
    try {
      const response = await this.client(url.toString(), {
        method: "POST",
        body: JSON.stringify({ program }),
        credentials: "include",
      });
      if (response.status === 200) {
        const json = await response.json();
        return { success: true, data: json.data.id };
      } else {
        const json = await response.json();
        return { success: false, error: json.error };
      }
    } catch (error) {
      const e = error as Error;
      return { success: false, error: e.message };
    }
  }

  public async deleteProgram(id: string): Promise<IEither<string, string>> {
    const url = UrlUtils.build(`${__API_HOST__}/api/program/${id}`);
    try {
      const response = await this.client(url.toString(), {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status === 200) {
        const json = await response.json();
        return { success: true, data: json.data.id };
      } else {
        const json = await response.json();
        return { success: false, error: json.error };
      }
    } catch (error) {
      const e = error as Error;
      return { success: false, error: e.message };
    }
  }

  public async postClaimCoupon(code: string): Promise<IEither<{ key: string; expires: number }, IRedeemCouponError>> {
    const url = UrlUtils.build(`${__API_HOST__}/api/coupon/claim/${code}`);
    const result = await this.client(url.toString(), {
      method: "POST",
      credentials: "include",
    });
    const json = await result.json();
    if (result.status === 200) {
      const { key, expires } = json.data || {};
      if (key && expires) {
        return { success: true, data: { key, expires } };
      }
    } else if ("error" in json) {
      const error = json.error as IRedeemCouponError;
      if (error === "not_authorized" || error === "coupon_not_found" || error === "coupon_already_claimed") {
        return { success: false, error };
      }
    }
    return { success: false, error: "unknown" };
  }

  public async getStorage(
    tempUserId: string,
    userId?: string,
    storageId?: string,
    adminKey?: string
  ): Promise<IGetStorageResponse> {
    let historylimit = 20;
    const url = UrlUtils.build(`${__API_HOST__}/api/storage`);
    if (tempUserId) {
      url.searchParams.set("tempuserid", tempUserId);
    }
    if (userId != null && adminKey != null) {
      url.searchParams.set("userid", userId);
      url.searchParams.set("key", adminKey);
      if (storageId) {
        url.searchParams.set("storageid", storageId);
      }
    }
    url.searchParams.set("historylimit", historylimit.toString());
    const result = await this.client(url.toString(), { credentials: "include" });
    const json = await result.json();
    json.storage.history = await this.getAllHistoryRecords({
      alreadyFetchedHistory: json.storage.history,
      historyLimit: historylimit,
    });
    return { email: json.email, storage: json.storage, user_id: json.user_id, key: json.key };
  }

  public async getExceptionData(id: string): Promise<string | undefined> {
    const url = UrlUtils.build(`${__API_HOST__}/api/exception/${id}`);
    try {
      const result = await this.client(url.toString(), { credentials: "include" });
      const json = await result.json();
      return json.data.data;
    } catch (_) {
      return undefined;
    }
  }

  private async cache(key: string, fn: () => Promise<unknown>): Promise<unknown> {
    if (cachePromises[key] == null) {
      cachePromises[key] = fn();
    }
    return cachePromises[key];
  }

  public async postEvent(event: IEventPayload): Promise<void> {
    const nosync =
      typeof window !== "undefined" && UrlUtils.build(window.location.href).searchParams.get("nosync") === "true";
    if (nosync) {
      return;
    }
    const url = UrlUtils.build(`${__API_HOST__}/api/event`);
    await this.client(url.toString(), {
      method: "POST",
      body: JSON.stringify(event),
      credentials: "include",
    });
  }

  public async verifyAppleReceipt(userId: string, appleReceipt: string): Promise<boolean> {
    const json = await this.cache(`verifyAppleReceipt:${userId}:${appleReceipt}`, async () => {
      try {
        const url = UrlUtils.build(`${__API_HOST__}/api/verifyapplereceipt`);
        const result = await this.client(url.toString(), {
          method: "POST",
          body: JSON.stringify({ appleReceipt, userId }),
          credentials: "include",
        });
        return result.status === 200 ? result.json() : { result: true };
      } catch {
        return { result: true };
      }
    });
    return !!(json as { result: boolean }).result;
  }

  public async verifyGooglePurchaseToken(userId: string, googlePurchaseToken: string): Promise<boolean> {
    const json = await this.cache(`verifyGooglePurchaseToken:${userId}:${googlePurchaseToken}`, async () => {
      try {
        const url = UrlUtils.build(`${__API_HOST__}/api/verifygooglepurchasetoken`);
        const result = await this.client(url.toString(), {
          method: "POST",
          body: JSON.stringify({ googlePurchaseToken, userId }),
          credentials: "include",
        });
        return result.status === 200 ? result.json() : { result: true };
      } catch {
        return { result: true };
      }
    });
    return !!(json as { result: boolean }).result;
  }

  public async deleteAccount(): Promise<boolean> {
    const url = UrlUtils.build(`${__API_HOST__}/api/deleteaccount`);
    const response = await this.client(url.toString(), { method: "DELETE", credentials: "include" });
    const json = await response.json();
    return json.data === "ok";
  }

  public async postShortUrl(urlToShorten: string, type: string, src?: string): Promise<string> {
    const url = UrlUtils.build(`${__API_HOST__}/shorturl/${type}`);
    const result = await this.client(url.toString(), {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ url: urlToShorten, src }),
    });
    if (result.ok) {
      const json: { url: string } = await result.json();
      return UrlUtils.build(json.url, __HOST__).toString();
    } else {
      throw new Error("Couldn't shorten url");
    }
  }

  public async getDataFromShortUrl(type: "p" | "n", id: string): Promise<{ data: string; s?: string; u?: string }> {
    const url = UrlUtils.build(`${__API_HOST__}/api/${type}/${id}`);
    const result = await this.client(url.toString(), { credentials: "include" });
    if (result.ok) {
      const json: { data: string; s?: string; u?: string } = await result.json();
      return json;
    } else {
      throw new Error(`Couldn't parse short url: ${url.toString()}`);
    }
  }

  public async publishProgram(program: IProgram, adminKey: string): Promise<void> {
    const url = UrlUtils.build(`${__API_HOST__}/api/publishprogram`);
    url.searchParams.set("key", adminKey);
    await this.client(url.toString(), {
      method: "POST",
      body: JSON.stringify({ program }),
      credentials: "include",
    });
  }

  public programs(): Promise<IProgram[]> {
    return this.client(`${__API_HOST__}/api/programs`, { credentials: "include" })
      .then((response) => response.json())
      .then((json) => json.programs.map((p: { program: IProgram }) => p.program));
  }

  public async generateAiPrompt(input: string): Promise<{ prompt?: string; error?: string }> {
    const response = await this.client(`${__API_HOST__}/api/ai/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
      credentials: "include",
    });

    if (!response.ok && response.status !== 200) {
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const json = await response.json();
    return json;
  }

  public async *streamAiLiftoscriptProgram(
    input: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    try {
      const url = `${__STREAMING_API_HOST__}/stream/ai/liftoscript`;

      const response = await this.client(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
        credentials: "include",
      });

      if (!response.ok && response.status !== 402) {
        yield { type: "error", data: `HTTP ${response.status}: ${response.statusText}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: "error", data: "No response body" };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return;
            }
            try {
              const json = JSON.parse(data);
              yield json;
            } catch (e) {
              console.error("Failed to parse SSE data:", e, data);
            }
          }
        }
      }
    } catch (error) {
      yield { type: "error", data: error instanceof Error ? error.message : "Unknown error" };
    }
  }
}
