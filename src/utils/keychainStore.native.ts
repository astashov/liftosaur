import * as RNKeychain from "react-native-keychain";
import { IAuthToken, IKeychain } from "./keychain";

export type { IAuthToken } from "./keychain";

const SERVICE = "com.liftosaur.www.auth";
const ACCOUNT = "session";

export class Keychain implements IKeychain {
  public async setAuthToken(auth: IAuthToken): Promise<void> {
    const payload = JSON.stringify(auth);
    await RNKeychain.setGenericPassword(ACCOUNT, payload, {
      service: SERVICE,
      accessible: RNKeychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  }

  public async getAuthToken(): Promise<IAuthToken | undefined> {
    try {
      const result = await RNKeychain.getGenericPassword({ service: SERVICE });
      if (result === false) {
        return undefined;
      }
      const parsed = JSON.parse(result.password) as IAuthToken;
      if (!parsed.token) {
        return undefined;
      }
      return parsed;
    } catch (e) {
      return undefined;
    }
  }

  public async clearAuthToken(): Promise<void> {
    try {
      await RNKeychain.resetGenericPassword({ service: SERVICE });
    } catch (e) {
      // ignore
    }
  }
}
