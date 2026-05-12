import * as Keychain from "react-native-keychain";

export interface IAuthToken {
  token: string;
  expiresAt: number;
  userId?: string;
}

const SERVICE = "com.liftosaur.www.auth";
const ACCOUNT = "session";

export async function KeychainStore_setAuthToken(auth: IAuthToken): Promise<void> {
  const payload = JSON.stringify(auth);
  await Keychain.setGenericPassword(ACCOUNT, payload, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function KeychainStore_getAuthToken(): Promise<IAuthToken | undefined> {
  try {
    const result = await Keychain.getGenericPassword({ service: SERVICE });
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

export async function KeychainStore_clearAuthToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch (e) {
    // ignore
  }
}
