import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { IFollowPermissions } from "../../src/models/follow";

export const followTableNames = {
  dev: {
    follows: "lftFollowsDev",
    followsFollowee: "lftFollowsFolloweeDev",
    followsRequestId: "lftFollowsRequestIdDev",
  },
  prod: {
    follows: "lftFollows",
    followsFollowee: "lftFollowsFollowee",
    followsRequestId: "lftFollowsRequestId",
  },
} as const;

export type IFollowStatus = "pending" | "approved";

export interface IFollowDao {
  followerId: string;
  followeeId: string;
  status: IFollowStatus;
  requestId: string;
  permissions: IFollowPermissions;
  createdAt: number;
}

export class FollowDao {
  constructor(private readonly di: IDI) {}

  public async get(followerId: string, followeeId: string): Promise<IFollowDao | undefined> {
    return this.di.dynamo.get<IFollowDao>({
      tableName: followTableNames[Utils_getEnv()].follows,
      key: { followerId, followeeId },
    });
  }

  public async getByRequestId(requestId: string): Promise<IFollowDao | undefined> {
    const env = Utils_getEnv();
    const rows = await this.di.dynamo.query<IFollowDao>({
      tableName: followTableNames[env].follows,
      indexName: followTableNames[env].followsRequestId,
      expression: "#requestId = :requestId",
      attrs: { "#requestId": "requestId" },
      values: { ":requestId": requestId },
    });
    return rows[0];
  }

  public async listFollowing(followerId: string): Promise<IFollowDao[]> {
    return this.di.dynamo.query<IFollowDao>({
      tableName: followTableNames[Utils_getEnv()].follows,
      expression: "#followerId = :followerId",
      attrs: { "#followerId": "followerId" },
      values: { ":followerId": followerId },
    });
  }

  public async listFollowers(followeeId: string): Promise<IFollowDao[]> {
    const env = Utils_getEnv();
    return this.di.dynamo.query<IFollowDao>({
      tableName: followTableNames[env].follows,
      indexName: followTableNames[env].followsFollowee,
      expression: "#followeeId = :followeeId",
      attrs: { "#followeeId": "followeeId" },
      values: { ":followeeId": followeeId },
    });
  }

  public async put(row: IFollowDao): Promise<void> {
    await this.di.dynamo.put({ tableName: followTableNames[Utils_getEnv()].follows, item: { ...row } });
  }

  public async remove(followerId: string, followeeId: string): Promise<void> {
    await this.di.dynamo.remove({
      tableName: followTableNames[Utils_getEnv()].follows,
      key: { followerId, followeeId },
    });
  }

  public async removeAllForUser(userId: string): Promise<void> {
    const [following, followers] = await Promise.all([this.listFollowing(userId), this.listFollowers(userId)]);
    const keys = [...following, ...followers].map((row) => ({
      followerId: row.followerId,
      followeeId: row.followeeId,
    }));
    if (keys.length > 0) {
      await this.di.dynamo.batchDelete({ tableName: followTableNames[Utils_getEnv()].follows, keys });
    }
  }
}
