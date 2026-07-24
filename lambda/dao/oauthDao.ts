import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { UidFactory_generateUid } from "../utils/generator";
import * as crypto from "crypto";

export const oauthTableNames = {
  dev: {
    clients: "lftOauthClientsDev",
    authCodes: "lftOauthAuthCodesDev",
    tokens: "lftOauthTokensDev",
    tokensRefreshToken: "lftOauthTokensRefreshTokenDev",
  },
  prod: {
    clients: "lftOauthClients",
    authCodes: "lftOauthAuthCodes",
    tokens: "lftOauthTokens",
    tokensRefreshToken: "lftOauthTokensRefreshToken",
  },
} as const;

export interface IOauthClient {
  clientId: string;
  redirectUris: string[];
  clientName: string;
  createdAt: number;
}

export interface IOauthAuthCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  expiresAt: number;
  ttl: number;
}

export interface IOauthToken {
  token: string;
  userId: string;
  clientId: string;
  refreshToken: string;
  expiresAt: number;
  ttl: number;
}

export class OauthDao {
  constructor(private readonly di: IDI) {}

  public async createClient(redirectUris: string[], clientName: string): Promise<IOauthClient> {
    const env = Utils_getEnv();
    const client: IOauthClient = {
      clientId: `lftcl_${UidFactory_generateUid(16)}`,
      redirectUris,
      clientName,
      createdAt: Date.now(),
    };
    await this.di.dynamo.put({ tableName: oauthTableNames[env].clients, item: client });
    return client;
  }

  public async getClient(clientId: string): Promise<IOauthClient | undefined> {
    const env = Utils_getEnv();
    return this.di.dynamo.get<IOauthClient>({
      tableName: oauthTableNames[env].clients,
      key: { clientId },
    });
  }

  public async createAuthCode(
    clientId: string,
    userId: string,
    redirectUri: string,
    codeChallenge: string,
    codeChallengeMethod: string
  ): Promise<IOauthAuthCode> {
    const env = Utils_getEnv();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const authCode: IOauthAuthCode = {
      code: UidFactory_generateUid(32),
      clientId,
      userId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      expiresAt,
      ttl: Math.floor(expiresAt / 1000),
    };
    await this.di.dynamo.put({ tableName: oauthTableNames[env].authCodes, item: authCode });
    return authCode;
  }

  public async getAuthCode(code: string): Promise<IOauthAuthCode | undefined> {
    const env = Utils_getEnv();
    return this.di.dynamo.get<IOauthAuthCode>({
      tableName: oauthTableNames[env].authCodes,
      key: { code },
    });
  }

  public async deleteAuthCode(code: string): Promise<void> {
    const env = Utils_getEnv();
    await this.di.dynamo.remove({ tableName: oauthTableNames[env].authCodes, key: { code } });
  }

  public async createToken(clientId: string, userId: string): Promise<IOauthToken> {
    const env = Utils_getEnv();
    const expiresAt = Date.now() + 60 * 60 * 1000;
    const oauthToken: IOauthToken = {
      token: `lftot_${UidFactory_generateUid(32)}`,
      userId,
      clientId,
      refreshToken: `lftrr_${UidFactory_generateUid(32)}`,
      expiresAt,
      ttl: Math.floor((Date.now() + 90 * 24 * 60 * 60 * 1000) / 1000),
    };
    await this.di.dynamo.put({ tableName: oauthTableNames[env].tokens, item: oauthToken });
    return oauthToken;
  }

  public async getByToken(token: string): Promise<IOauthToken | undefined> {
    const env = Utils_getEnv();
    return this.di.dynamo.get<IOauthToken>({
      tableName: oauthTableNames[env].tokens,
      key: { token },
    });
  }

  public async getByRefreshToken(refreshToken: string): Promise<IOauthToken | undefined> {
    const env = Utils_getEnv();
    const results = await this.di.dynamo.query<IOauthToken>({
      tableName: oauthTableNames[env].tokens,
      indexName: oauthTableNames[env].tokensRefreshToken,
      expression: "#refreshToken = :refreshToken",
      attrs: { "#refreshToken": "refreshToken" },
      values: { ":refreshToken": refreshToken },
    });
    return results[0];
  }

  public async deleteToken(token: string): Promise<void> {
    const env = Utils_getEnv();
    await this.di.dynamo.remove({ tableName: oauthTableNames[env].tokens, key: { token } });
  }

  public static verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const hash = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
    return hash === codeChallenge;
  }
}
