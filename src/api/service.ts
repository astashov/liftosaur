import { IComment, IFriend, IFriendUser, ILike } from "../models/state";
import { IStorage, IHistoryRecord, ISettings, IProgram, IPartialStorage } from "../types";
import { IEither } from "../utils/types";

export interface IGetStorageResponse {
  email: string;
  storage: IStorage;
  user_id: string;
  key?: string;
}

type IRedeemCouponError = "not_authorized" | "coupon_not_found" | "coupon_already_claimed" | "unknown";

const cachePromises: Partial<Record<string, unknown>> = {};

declare let __API_HOST__: string;

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
    const response = await this.client(`${__API_HOST__}/api/signin/google`, {
      method: "POST",
      body: JSON.stringify({
        token,
        id,
        forceuseremail: args.forcedUserEmail,
      }),
      credentials: "include",
    });
    const json = await response.json();
    return { email: json.email, storage: json.storage, user_id: json.user_id };
  }

  public async appleSignIn(code: string, idToken: string, id: string): Promise<IGetStorageResponse> {
    const response = await this.client(`${__API_HOST__}/api/signin/apple`, {
      method: "POST",
      body: JSON.stringify({
        code,
        idToken,
        id,
      }),
      credentials: "include",
    });
    const json = await response.json();
    return { email: json.email, storage: json.storage, user_id: json.user_id };
  }

  public async signout(): Promise<void> {
    await this.client(`${__API_HOST__}/api/signout`, {
      method: "POST",
      body: JSON.stringify({}),
      credentials: "include",
    });
  }

  public async postStorage(storage: IPartialStorage): Promise<void> {
    await this.client(`${__API_HOST__}/api/storage`, {
      method: "POST",
      body: JSON.stringify({ storage }),
      credentials: "include",
    });
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
    const url = new URL(`${__API_HOST__}/api/addfreeuser/${userid}`);
    url.searchParams.set("key", adminKey);
    await this.client(url.toString(), {
      method: "POST",
      credentials: "include",
    });
  }

  public async postFreeformGenerator(prompt: string): Promise<string> {
    const url = new URL(`${__API_HOST__}/api/freeform`);
    const result = await this.client(url.toString(), {
      method: "POST",
      body: JSON.stringify({ prompt }),
      credentials: "include",
    });
    const json = await result.json();
    return json.id;
  }

  public async postPlannerReformatter(prompt: string): Promise<string> {
    const url = new URL(`${__API_HOST__}/api/plannerreformatter`);
    const result = await this.client(url.toString(), {
      method: "POST",
      body: JSON.stringify({ prompt }),
      credentials: "include",
    });
    const json = await result.json();
    return json.data;
  }

  public async postClaimCoupon(code: string): Promise<IEither<{ key: string; expires: number }, IRedeemCouponError>> {
    const url = new URL(`${__API_HOST__}/api/coupon/claim/${code}`);
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

  public async getFreeformRecord(
    id: string,
    timeout: number
  ): Promise<IEither<{ program: IProgram; response: string }, { error: string[]; response: string }>> {
    const client = this.client;
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const fetchFreeformRecord = async (): Promise<void> => {
        const url = new URL(`${__API_HOST__}/api/freeform/${id}`);
        const result = await client(url.toString(), {
          method: "GET",
          credentials: "include",
        });
        if (result.status === 404) {
          if (Date.now() - start < timeout) {
            setTimeout(() => {
              fetchFreeformRecord();
            }, 3000);
          } else {
            reject(new Error("timeout"));
          }
        } else {
          const json = await result.json();
          if (result.status === 200) {
            resolve({ success: true, data: json });
          } else {
            resolve({ success: false, error: json });
          }
        }
      };
      fetchFreeformRecord();
    });
  }

  public async getStorage(tempUserId: string, userId?: string, adminKey?: string): Promise<IGetStorageResponse> {
    const url = new URL(`${__API_HOST__}/api/storage`);
    if (tempUserId) {
      url.searchParams.set("tempuserid", tempUserId);
    }
    if (userId != null && adminKey != null) {
      url.searchParams.set("userid", userId);
      url.searchParams.set("key", adminKey);
    }
    const result = await this.client(url.toString(), { credentials: "include" });
    const json = await result.json();
    return { email: json.email, storage: json.storage, user_id: json.user_id, key: json.key };
  }

  private async cache(key: string, fn: () => Promise<unknown>): Promise<unknown> {
    if (cachePromises[key] == null) {
      cachePromises[key] = fn();
    }
    return cachePromises[key];
  }

  public async verifyAppleReceipt(userId: string, appleReceipt: string): Promise<boolean> {
    const json = await this.cache(`verifyAppleReceipt:${userId}:${appleReceipt}`, async () => {
      try {
        const url = new URL(`${__API_HOST__}/api/verifyapplereceipt`);
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
        const url = new URL(`${__API_HOST__}/api/verifygooglepurchasetoken`);
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

  public async getFriends(username: string): Promise<IFriend[]> {
    const url = new URL(`${__API_HOST__}/api/friends`);
    url.searchParams.set("username", username);
    const result = await this.client(url.toString(), { credentials: "include" });
    const json: { friends: IFriend[] } = await result.json();
    return json.friends;
  }

  public async getFriendsHistory(startDate: string, endDate?: string): Promise<Partial<Record<string, IFriendUser>>> {
    const url = new URL(`${__API_HOST__}/api/friendshistory`);
    url.searchParams.set("startdate", startDate);
    if (endDate) {
      url.searchParams.set("enddate", endDate);
    }
    const result = await this.client(url.toString(), { credentials: "include" });
    if (!result.ok) {
      return {};
    } else {
      const json: { friends: Partial<Record<string, IFriendUser>> } = await result.json();
      return json.friends;
    }
  }

  public async inviteFriend(friendId: string, message: string): Promise<IEither<boolean, string>> {
    const url = new URL(`${__API_HOST__}/api/invite/${friendId}`);
    return this.makeFriendCall("POST", url.toString(), JSON.stringify({ message }));
  }

  public async removeFriend(friendId: string): Promise<IEither<boolean, string>> {
    const url = new URL(`${__API_HOST__}/api/removefriend/${friendId}`);
    return this.makeFriendCall("DELETE", url.toString());
  }

  public async acceptFrienshipInvitation(friendId: string): Promise<IEither<boolean, string>> {
    const url = new URL(`${__API_HOST__}/api/acceptfriendinvitation/${friendId}`);
    return this.makeFriendCall("POST", url.toString());
  }

  public async getComments(startDate: string, endDate?: string): Promise<Partial<Record<number, IComment[]>>> {
    const url = new URL(`${__API_HOST__}/api/comments`);
    url.searchParams.set("startdate", startDate);
    if (endDate) {
      url.searchParams.set("enddate", endDate);
    }
    const result = await this.client(url.toString(), { credentials: "include" });
    const json: { comments: Partial<Record<number, IComment[]>> } = await result.json();
    return json.comments;
  }

  public async postComment(historyRecordId: string, friendId: string, text: string): Promise<IComment> {
    const url = new URL(`${__API_HOST__}/api/comments`);
    const body = JSON.stringify({ historyRecordId, friendId, text });
    const result = await this.client(url.toString(), {
      method: "POST",
      credentials: "include",
      body,
      headers: { "Content-Type": "application/json" },
    });
    const json: { comment: IComment } = await result.json();
    return json.comment;
  }

  public async deleteComment(id: string): Promise<void> {
    const url = new URL(`${__API_HOST__}/api/comments/${id}`);
    await this.client(url.toString(), { method: "DELETE", credentials: "include" });
  }

  public async getLikes(startDate: string, endDate?: string): Promise<Partial<Record<string, ILike[]>>> {
    const url = new URL(`${__API_HOST__}/api/likes`);
    url.searchParams.set("startdate", startDate);
    if (endDate) {
      url.searchParams.set("enddate", endDate);
    }
    const result = await this.client(url.toString(), { credentials: "include" });
    const json: { likes: Partial<Record<string, ILike[]>> } = await result.json();
    return json.likes;
  }

  public async like(friendId: string, historyRecordId: number): Promise<boolean | undefined> {
    const url = new URL(`${__API_HOST__}/api/likes/${friendId}/${historyRecordId}`);
    const result = await this.client(url.toString(), { method: "POST", credentials: "include" });
    const json: { result?: boolean } = await result.json();
    return json.result;
  }

  public async postShortUrl(urlToShorten: string, type: string): Promise<string> {
    const url = new URL(`${__API_HOST__}/shorturl/${type}`);
    url.searchParams.set("url", urlToShorten);
    const result = await this.client(url.toString(), { method: "POST", credentials: "include" });
    if (result.ok) {
      const json: { url: string } = await result.json();
      return new URL(json.url, window.location.href).toString();
    } else {
      throw new Error("Couldn't shorten url");
    }
  }

  public async getDataFromShortUrl(type: "p" | "b", id: string): Promise<{ data: string; s?: string }> {
    const url = new URL(`${__API_HOST__}/api/${type}/${id}`);
    const result = await this.client(url.toString(), { credentials: "include" });
    if (result.ok) {
      const json: { data: string; s?: string } = await result.json();
      return json;
    } else {
      throw new Error("Couldn't parse short url");
    }
  }

  private async makeFriendCall(method: string, url: string, body?: string): Promise<IEither<boolean, string>> {
    const result = await this.client(url, {
      method: method,
      credentials: "include",
      ...(body ? { headers: { "Content-Type": "application/json" } } : {}),
      body,
    });
    const json = await result.json();
    if (result.ok) {
      return "error" in json ? { success: false, error: json.error } : { success: true, data: true };
    } else {
      return { success: false, error: "error" in json ? json.error : "Error" };
    }
  }

  public sendTimerPushNotification(sid: number): void {
    this.client(`${__API_HOST__}/timernotification?sid=${sid}`, { method: "POST" });
  }

  public async publishProgram(program: IProgram, adminKey: string): Promise<void> {
    const url = new URL(`${__API_HOST__}/api/publishprogram`);
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

  public record(user: string, id: string): Promise<{ data: IRecordResponse } | { error: string }> {
    const url = new URL(`${__API_HOST__}/api/record`);
    url.searchParams.set("user", user);
    url.searchParams.set("id", id);
    return this.client(url.toString(), { credentials: "include" }).then((response) => response.json());
  }
}
