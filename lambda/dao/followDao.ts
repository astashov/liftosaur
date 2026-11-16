import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { Follow_defaultPermissions, Follow_parsePermissions, IFollowPermissions } from "../../src/models/follow";

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

function readRow(row: IFollowDao): IFollowDao {
  return { ...row, permissions: Follow_parsePermissions(row.permissions) ?? Follow_defaultPermissions };
}

export class FollowDao {
  constructor(private readonly di: IDI) {}

  public async get(followerId: string, followeeId: string): Promise<IFollowDao | undefined> {
    const row = await this.di.dynamo.get<IFollowDao>({
      tableName: followTableNames[Utils_getEnv()].follows,
      key: { followerId, followeeId },
    });
    return row != null ? readRow(row) : undefined;
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
    return rows[0] != null ? readRow(rows[0]) : undefined;
  }

  public async listFollowing(followerId: string): Promise<IFollowDao[]> {
    const rows = await this.di.dynamo.query<IFollowDao>({
      tableName: followTableNames[Utils_getEnv()].follows,
      expression: "#followerId = :followerId",
      attrs: { "#followerId": "followerId" },
      values: { ":followerId": followerId },
    });
    return rows.map(readRow);
  }

  public async listFollowers(followeeId: string): Promise<IFollowDao[]> {
    const env = Utils_getEnv();
    const rows = await this.di.dynamo.query<IFollowDao>({
      tableName: followTableNames[env].follows,
      indexName: followTableNames[env].followsFollowee,
      expression: "#followeeId = :followeeId",
      attrs: { "#followeeId": "followeeId" },
      values: { ":followeeId": followeeId },
    });
    return rows.map(readRow);
  }

  public async put(row: IFollowDao): Promise<void> {
    await this.di.dynamo.put({ tableName: followTableNames[Utils_getEnv()].follows, item: { ...row } });
  }

  public async approveIfPending(row: IFollowDao, permissions: IFollowPermissions): Promise<boolean> {
    return this.di.dynamo.transactWrite({
      puts: [
        {
          tableName: followTableNames[Utils_getEnv()].follows,
          item: { ...row, status: "approved", permissions },
          condition: {
            expression: "#status = :pending AND #requestId = :requestId",
            attrs: { "#status": "status", "#requestId": "requestId" },
            values: { ":pending": "pending", ":requestId": row.requestId },
          },
        },
      ],
    });
  }

  public async putIfAbsent(row: IFollowDao): Promise<boolean> {
    return this.di.dynamo.transactWrite({
      puts: [
        {
          tableName: followTableNames[Utils_getEnv()].follows,
          item: { ...row },
          condition: { expression: "attribute_not_exists(#followerId)", attrs: { "#followerId": "followerId" } },
        },
      ],
    });
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
