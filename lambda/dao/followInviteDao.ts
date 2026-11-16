import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { UidFactory_generateSecureToken } from "../utils/generator";
import { IEither } from "../../src/utils/types";
import { Follow_defaultPermissions } from "../../src/models/follow";
import { FollowDao, IFollowDao, followTableNames } from "./followDao";

export const followInviteTableNames = {
  dev: {
    followInvites: "lftFollowInvitesDev",
    followInvitesInviterId: "lftFollowInvitesInviterIdDev",
  },
  prod: {
    followInvites: "lftFollowInvites",
    followInvitesInviterId: "lftFollowInvitesInviterId",
  },
} as const;

export const FollowInvite_ttlMs = 7 * 24 * 60 * 60 * 1000;

export interface IFollowInviteDao {
  token: string;
  inviterId: string;
  expiresAt: number;
  ttl: number;
}

export type IFollowInviteConsumeError = "notfound" | "self" | "failed";

export class FollowInviteDao {
  constructor(private readonly di: IDI) {}

  public async create(inviterId: string, now: number = Date.now()): Promise<IFollowInviteDao> {
    const expiresAt = now + FollowInvite_ttlMs;
    const invite: IFollowInviteDao = {
      token: UidFactory_generateSecureToken(16),
      inviterId,
      expiresAt,
      ttl: Math.floor(expiresAt / 1000),
    };
    await this.di.dynamo.put({ tableName: followInviteTableNames[Utils_getEnv()].followInvites, item: { ...invite } });
    return invite;
  }

  public async get(token: string, now: number = Date.now()): Promise<IFollowInviteDao | undefined> {
    const invite = await this.di.dynamo.get<IFollowInviteDao>({
      tableName: followInviteTableNames[Utils_getEnv()].followInvites,
      key: { token },
    });
    return invite == null || invite.expiresAt <= now ? undefined : invite;
  }

  public async consumeIntoRequest(
    token: string,
    followerId: string,
    requestId: string,
    now: number = Date.now()
  ): Promise<IEither<{ row: IFollowDao; isCreated: boolean }, IFollowInviteConsumeError>> {
    const invite = await this.get(token, now);
    if (invite == null) {
      return { success: false, error: "notfound" };
    }
    if (invite.inviterId === followerId) {
      return { success: false, error: "self" };
    }
    const followDao = new FollowDao(this.di);
    const existing = await followDao.get(followerId, invite.inviterId);
    if (existing != null) {
      return { success: true, data: { row: existing, isCreated: false } };
    }
    const row: IFollowDao = {
      followerId,
      followeeId: invite.inviterId,
      status: "pending",
      requestId,
      permissions: Follow_defaultPermissions,
      createdAt: now,
    };
    const env = Utils_getEnv();
    const ok = await this.di.dynamo.transactWrite({
      puts: [
        {
          tableName: followInviteTableNames[env].followInvites,
          item: { ...invite },
          condition: {
            expression: "attribute_exists(#token) AND #expiresAt > :now",
            attrs: { "#token": "token", "#expiresAt": "expiresAt" },
            values: { ":now": now },
          },
        },
        {
          tableName: followTableNames[env].follows,
          item: { ...row },
          condition: { expression: "attribute_not_exists(#followerId)", attrs: { "#followerId": "followerId" } },
        },
      ],
    });
    if (ok) {
      return { success: true, data: { row, isCreated: true } };
    }
    const raced = await followDao.get(followerId, invite.inviterId);
    return raced != null
      ? { success: true, data: { row: raced, isCreated: false } }
      : { success: false, error: "failed" };
  }

  public async removeAllForUser(inviterId: string): Promise<void> {
    const env = Utils_getEnv();
    const invites = await this.di.dynamo.query<IFollowInviteDao>({
      tableName: followInviteTableNames[env].followInvites,
      indexName: followInviteTableNames[env].followInvitesInviterId,
      expression: "#inviterId = :inviterId",
      attrs: { "#inviterId": "inviterId" },
      values: { ":inviterId": inviterId },
    });
    if (invites.length > 0) {
      await this.di.dynamo.batchDelete({
        tableName: followInviteTableNames[env].followInvites,
        keys: invites.map((i) => ({ token: i.token })),
      });
    }
  }
}
