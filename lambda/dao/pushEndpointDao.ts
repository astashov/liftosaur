import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { IPushPlatform } from "../utils/pushPlatforms";

export const pushEndpointTableNames = {
  dev: {
    pushEndpoints: "lftPushEndpointsDev",
    pushEndpointsEndpointArn: "lftPushEndpointsEndpointArnDev",
  },
  prod: {
    pushEndpoints: "lftPushEndpoints",
    pushEndpointsEndpointArn: "lftPushEndpointsEndpointArn",
  },
} as const;

export interface IPushEndpointDao {
  userId: string;
  deviceId: string;
  platform: IPushPlatform;
  endpointArn: string;
  ttl: number;
}

export class PushEndpointDao {
  constructor(private readonly di: IDI) {}

  public async get(userId: string, deviceId: string): Promise<IPushEndpointDao | undefined> {
    const env = Utils_getEnv();
    return this.di.dynamo.get<IPushEndpointDao>({
      tableName: pushEndpointTableNames[env].pushEndpoints,
      key: { userId, deviceId },
    });
  }

  public async put(row: IPushEndpointDao): Promise<void> {
    const env = Utils_getEnv();
    await this.di.dynamo.put({ tableName: pushEndpointTableNames[env].pushEndpoints, item: row });
  }

  public async listByUserId(userId: string): Promise<IPushEndpointDao[]> {
    const env = Utils_getEnv();
    return this.di.dynamo.query<IPushEndpointDao>({
      tableName: pushEndpointTableNames[env].pushEndpoints,
      expression: "#userId = :userId",
      attrs: { "#userId": "userId" },
      values: { ":userId": userId },
    });
  }

  public async listByEndpointArn(endpointArn: string): Promise<IPushEndpointDao[]> {
    const env = Utils_getEnv();
    return this.di.dynamo.query<IPushEndpointDao>({
      tableName: pushEndpointTableNames[env].pushEndpoints,
      indexName: pushEndpointTableNames[env].pushEndpointsEndpointArn,
      expression: "#endpointArn = :endpointArn",
      attrs: { "#endpointArn": "endpointArn" },
      values: { ":endpointArn": endpointArn },
    });
  }

  public async remove(userId: string, deviceId: string, ifEndpointArn?: string): Promise<boolean> {
    const env = Utils_getEnv();
    return this.di.dynamo.remove({
      tableName: pushEndpointTableNames[env].pushEndpoints,
      key: { userId, deviceId },
      condition: ifEndpointArn
        ? {
            expression: "#endpointArn = :endpointArn",
            attrs: { "#endpointArn": "endpointArn" },
            values: { ":endpointArn": ifEndpointArn },
          }
        : undefined,
    });
  }
}
