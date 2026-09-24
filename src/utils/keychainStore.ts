import { IAuthToken, IKeychain } from "./keychain";

export type { IAuthToken } from "./keychain";

export class Keychain implements IKeychain {
  public async setAuthToken(_auth: IAuthToken): Promise<void> {
    return;
  }

  public async getAuthToken(): Promise<IAuthToken | undefined> {
    return undefined;
  }

  public async clearAuthToken(): Promise<void> {
    return;
  }
}
