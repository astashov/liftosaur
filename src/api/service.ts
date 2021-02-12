import { IStorage, IHistoryRecord, ISettings, IProgram } from "../types";

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
  private readonly client: Window["fetch"];

  constructor(client: Window["fetch"]) {
    this.client = client;
  }

  public async googleSignIn(token: string): Promise<IGetStorageResponse> {
    const response = await this.client(`${__API_HOST__}/api/signin/google`, {
      method: "POST",
      body: JSON.stringify({ token }),
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
