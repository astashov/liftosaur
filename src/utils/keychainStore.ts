export interface IAuthToken {
  token: string;
  expiresAt: number;
  userId?: string;
}

export async function KeychainStore_setAuthToken(_auth: IAuthToken): Promise<void> {
  return;
}

export async function KeychainStore_getAuthToken(): Promise<IAuthToken | undefined> {
  return undefined;
}

export async function KeychainStore_clearAuthToken(): Promise<void> {
  return;
}
