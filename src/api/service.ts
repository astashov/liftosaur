import { IStorage } from "../ducks/reducer";

export interface IGetStorageResponse {
  email: string;
  storage: IStorage;
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
      credentials: "include"
    });
    const json = await response.json();
    return { email: json.email, storage: json.storage };
  }

  public async signout(): Promise<void> {
    await this.client(`${__API_HOST__}/api/signout`, {
      method: "POST",
      body: JSON.stringify({}),
      credentials: "include"
    });
  }

  public async postStorage(storage: IStorage): Promise<void> {
    await this.client(`${__API_HOST__}/api/storage`, {
      method: "POST",
      body: JSON.stringify({ storage }),
      credentials: "include"
    });
  }

  public async getStorage(): Promise<IGetStorageResponse> {
    const result = await this.client(`${__API_HOST__}/api/storage`, { credentials: "include" });
    const json = await result.json();
    return { email: json.email, storage: json.storage };
  }

  public sendTimerPushNotification(sid: number): void {
    this.client(`https://server.liftosaur.workers.dev/timernotification?sid=${sid}`, { method: "POST" });
  }
}
