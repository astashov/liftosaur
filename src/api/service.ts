import { IComment, IFriend, IFriendUser, ILike } from "../models/state";
import { IStorage, IHistoryRecord, ISettings, IProgram } from "../types";
import { IEither } from "../utils/types";

export interface IGetStorageResponse {
  email: string;
  storage: IStorage;
  user_id: string;
}

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

  public async googleSignIn(token: string, id: string, forcedUserEmail?: string): Promise<IGetStorageResponse> {
    const response = await this.client(`${__API_HOST__}/api/signin/google`, {
      method: "POST",
      body: JSON.stringify({ token, id, forceuseremail: forcedUserEmail }),
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

  public async postStorage(storage: IStorage): Promise<void> {
    await this.client(`${__API_HOST__}/api/storage`, {
      method: "POST",
      body: JSON.stringify({ storage }),
      credentials: "include",
    });
  }

  public async getStorage(userId?: string, adminKey?: string): Promise<IGetStorageResponse> {
    const url = new URL(`${__API_HOST__}/api/storage`);
    if (userId != null && adminKey != null) {
      url.searchParams.set("userid", userId);
      url.searchParams.set("key", adminKey);
    }
    const result = await this.client(url.toString(), { credentials: "include" });
    const json = await result.json();
    return { email: json.email, storage: json.storage, user_id: json.user_id };
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
