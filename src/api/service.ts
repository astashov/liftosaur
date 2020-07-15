import { IStorage } from "../ducks/reducer";
import { IProgram2 } from "../models/program";

export interface IGetStorageResponse {
  email: string;
  storage: IStorage;
  user_id: string;
}

declare let __API_HOST__: string;

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

  public async getStorage(): Promise<IGetStorageResponse> {
    const result = await this.client(`${__API_HOST__}/api/storage`, { credentials: "include" });
    const json = await result.json();
    return { email: json.email, storage: json.storage, user_id: json.user_id };
  }

  public sendTimerPushNotification(sid: number): void {
    this.client(`${__API_HOST__}/timernotification?sid=${sid}`, { method: "POST" });
  }

  public async publishProgram(program: IProgram2): Promise<void> {
    // TODO: Cover with API key
    await this.client(`${__API_HOST__}/api/publishprogram`, {
      method: "POST",
      body: JSON.stringify({ program }),
      credentials: "include",
    });
  }

  public programs(): Promise<IProgram2[]> {
    // TODO: Cover with API key
    return this.client(`${__API_HOST__}/api/programs`, { credentials: "include" })
      .then((response) => response.json())
      .then((json) => json.programs.map((p: { program: IProgram2 }) => p.program));
  }
}
