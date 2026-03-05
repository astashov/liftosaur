import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { UidFactory_generateUid } from "../utils/generator";

export const apiKeyTableNames = {
  dev: {
    apiKeys: "lftApiKeysDev",
    apiKeysUserId: "lftApiKeysUserIdDev",
  },
  prod: {
    apiKeys: "lftApiKeys",
    apiKeysUserId: "lftApiKeysUserId",
  },
} as const;

export interface IApiKeyDao {
  key: string;
  userId: string;
  name: string;
  createdAt: number;
}

export class ApiKeyDao {
  constructor(private readonly di: IDI) {}

  public static generateKey(): string {
    return `lftsk_${UidFactory_generateUid(16)}`;
  }

  public async create(userId: string, name: string): Promise<IApiKeyDao> {
    const env = Utils_getEnv();
    const dao: IApiKeyDao = {
      key: ApiKeyDao.generateKey(),
      userId,
      name,
      createdAt: Date.now(),
    };
    await this.di.dynamo.put({ tableName: apiKeyTableNames[env].apiKeys, item: dao });
    return dao;
  }

  public async getByKey(key: string): Promise<IApiKeyDao | undefined> {
    const env = Utils_getEnv();
    return this.di.dynamo.get<IApiKeyDao>({
      tableName: apiKeyTableNames[env].apiKeys,
      key: { key },
    });
  }

  public async listByUserId(userId: string): Promise<IApiKeyDao[]> {
    const env = Utils_getEnv();
    return this.di.dynamo.query<IApiKeyDao>({
      tableName: apiKeyTableNames[env].apiKeys,
      indexName: apiKeyTableNames[env].apiKeysUserId,
      expression: "#userId = :userId",
      attrs: { "#userId": "userId" },
      values: { ":userId": userId },
    });
  }

  public async deleteKey(key: string): Promise<void> {
    const env = Utils_getEnv();
    await this.di.dynamo.remove({ tableName: apiKeyTableNames[env].apiKeys, key: { key } });
  }
}
