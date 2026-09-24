export interface IAuthToken {
  token: string;
  expiresAt: number;
  userId?: string;
}

export interface IKeychain {
  setAuthToken(auth: IAuthToken): Promise<void>;
  getAuthToken(): Promise<IAuthToken | undefined>;
  clearAuthToken(): Promise<void>;
}
