import crypto from "crypto";

import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { IFriendUserDao, ILimitedUserDao, UserDao, userTableNames } from "./userDao";
import { HtmlUtils } from "../../src/utils/html";
import { IEither } from "../../src/utils/types";
import { IFriend, IFriendStatus } from "../../src/models/state";
import { IHistoryRecord } from "../../src/types";
import { CollectionUtils } from "../../src/utils/collection";

const tableNames = {
  dev: {
    friendsStatuses: "lftFriendsStatusesDev",
  },
  prod: {
    friendsStatuses: "lftFriendsStatuses",
  },
} as const;

const cryptoAlgorithm = "aes-256-ctr";

export interface IFriendDao {
  userId: string;
  friendId: string;
  status: IFriendStatus;
}

const noReplyEmail = "no-reply@liftosaur.com";

export class FriendDao {
  constructor(private readonly di: IDI) {}

  public async getAllByUsernameOrId(currentUserId: string, username?: string): Promise<IFriend[]> {
    const env = Utils.getEnv();
    const friendStatuses = await this.getAllStatuses(currentUserId);

    const users = (
      await this.di.dynamo.scan<ILimitedUserDao>({
        tableName: userTableNames[env].users,
        filterExpression:
          "id <> :current_user_id" +
          (username ? " AND (begins_with(id, :username) OR begins_with(nickname, :username))" : ""),
        values: { ":current_user_id": currentUserId, ...(username ? { ":username": username.toLowerCase() } : {}) },
      })
    ).map((u) => ({
      user: {
        id: u.id,
        nickname: u.storage.settings.nickname || u.nickname,
      },
      status: friendStatuses[u.id],
    }));

    users.sort((a, b) => {
      if (a.user.nickname != null && b.user.nickname != null) {
        return a.user.nickname.localeCompare(b.user.nickname);
      } else if (!a.user.nickname && b.user.nickname) {
        return 1;
      } else if (!b.user.nickname && a.user.nickname) {
        return -1;
      } else {
        return a.user.id.localeCompare(b.user.id);
      }
    });

    return users;
  }

  public async getAllStatuses(currentUserId: string): Promise<Partial<Record<string, IFriendStatus>>> {
    const env = Utils.getEnv();
    const friendRecords = await this.di.dynamo.query<IFriendDao>({
      tableName: tableNames[env].friendsStatuses,
      expression: "userId = :id",
      values: { ":id": currentUserId },
    });
    return friendRecords.reduce<Partial<Record<string, IFriendStatus>>>((memo, record) => {
      memo[record.friendId] = record.status;
      return memo;
    }, {});
  }

  private async getFriendStatus(userId: string, friendId: string): Promise<IFriendDao | undefined> {
    const env = Utils.getEnv();
    return (
      await this.di.dynamo.query<IFriendDao>({
        tableName: tableNames[env].friendsStatuses,
        expression: "userId = :userId AND friendId = :friendId",
        values: { ":userId": userId, ":friendId": friendId },
      })
    )?.[0];
  }

  public async invite(
    user: ILimitedUserDao,
    friend: ILimitedUserDao,
    host: string,
    msg?: string
  ): Promise<IEither<boolean, string>> {
    const env = Utils.getEnv();
    const existingFriendStatus = await this.getFriendStatus(user.id, friend.id);
    if (existingFriendStatus?.status === "active") {
      return { success: false, error: "User is already a friend" };
    }
    const hash = await this.encrypt(user.id, friend.id);
    const url = new URL("/acceptfriendinvitation", host);
    url.searchParams.set("hash", hash);
    const username = HtmlUtils.escapeHtml(user.nickname || user.id);
    const subject = `Liftosaur: ${username} wants to be a friend`;
    let body =
      `${username} wants to be a friend with you on Liftosaur.\n` +
      `You'll be able to see their workouts, and they will be able to see yours.\n\n`;
    if (msg) {
      body += `This is a message from them:\n\n${msg}\n\n====\n`;
    }
    body += `To accept invitation, please follow this link: ${url.toString()}\n\nhttps://www.liftosaur.com`;

    const userFriendItem: IFriendDao = { userId: user.id, friendId: friend.id, status: "invited" };
    const friendUserItem: IFriendDao = { userId: friend.id, friendId: user.id, status: "pending" };
    await Promise.all([
      this.di.ses.sendEmail({ destination: friend.email, source: noReplyEmail, subject, body }),
      this.di.dynamo.put({ tableName: tableNames[env].friendsStatuses, item: userFriendItem }),
      this.di.dynamo.put({ tableName: tableNames[env].friendsStatuses, item: friendUserItem }),
    ]);
    return { success: true, data: true };
  }

  public async removeFriend(userId: string, friendId: string): Promise<IEither<string, string>> {
    const env = Utils.getEnv();
    await Promise.all([
      this.di.dynamo.remove({ tableName: tableNames[env].friendsStatuses, key: { userId, friendId } }),
      this.di.dynamo.remove({
        tableName: tableNames[env].friendsStatuses,
        key: { userId: friendId, friendId: userId },
      }),
    ]);
    return { success: true, data: "" };
  }

  public async acceptInvitation(userId: string, friendId: string): Promise<IEither<string, string>> {
    const env = Utils.getEnv();
    const userDao = new UserDao(this.di);
    const [user, friend] = await Promise.all([userDao.getLimitedById(userId), userDao.getLimitedById(friendId)]);
    if (user != null && friend != null) {
      const username = HtmlUtils.escapeHtml(user.nickname || user.id);
      const friendname = HtmlUtils.escapeHtml(friend.nickname || friend.id);

      const existingFriendStatus = await this.getFriendStatus(user.id, friend.id);
      if (existingFriendStatus?.status !== "pending") {
        return { success: false, error: "Error: There's no pending invitation" };
      }

      const userFriendItem: IFriendDao = { userId: userId, friendId: friendId, status: "active" };
      const friendUserItem: IFriendDao = { userId: friendId, friendId: userId, status: "active" };

      await Promise.all([
        this.di.dynamo.put({ tableName: tableNames[env].friendsStatuses, item: userFriendItem }),
        this.di.dynamo.put({ tableName: tableNames[env].friendsStatuses, item: friendUserItem }),
        this.di.ses.sendEmail({
          source: noReplyEmail,
          destination: friend.email,
          subject: `Liftosaur: ${username} accepted your friendship invitation`,
          body: `${username} accepted your friendship invitation, and now they can see your workouts, and you can see theirs.\n\nhttps://www.liftosaur.com`,
        }),
      ]);
      return { success: true, data: `Accepted friend invitation from ${friendname}` };
    } else {
      return { success: false, error: "Error: Can't find the friend" };
    }
  }

  public async acceptInvitationByHash(hash: string): Promise<IEither<string, string>> {
    const { userId, friendId } = await this.decrypt(hash);
    return this.acceptInvitation(friendId, userId);
  }

  public async getFriendsWithHistories(
    currentUserId: string,
    startDate: string,
    endDate?: string
  ): Promise<IFriendUserDao[]> {
    const env = Utils.getEnv();
    const friendRecords = await this.di.dynamo.query<IFriendDao>({
      tableName: tableNames[env].friendsStatuses,
      expression: "userId = :id",
      filterExpression: "#status = :status",
      attrs: { "#status": "status" },
      values: { ":id": currentUserId, ":status": "active" },
    });
    const userDao = new UserDao(this.di);
    const result = await Promise.all(
      friendRecords.map(async (fr) => {
        const [user, history] = await Promise.all([
          userDao.getLimitedById(fr.friendId),
          this.di.dynamo.query<IHistoryRecord>({
            tableName: userTableNames[env].historyRecords,
            indexName: userTableNames[env].historyRecordsDate,
            expression: `userId = :userId AND ${
              endDate ? "#date BETWEEN :startDate AND :endDate" : "#date > :startDate"
            }`,
            attrs: { "#date": "date" },
            scanIndexForward: false,
            values: { ":userId": fr.friendId, ":startDate": startDate, ":endDate": endDate },
          }),
        ]);
        if (user != null) {
          return {
            id: user.id,
            nickname: user.storage.settings.nickname || user.nickname,
            storage: { ...user.storage, history },
          };
        } else {
          return undefined;
        }
      })
    );

    return CollectionUtils.compact(result);
  }

  private async encrypt(userId: string, friendId: string): Promise<string> {
    const secretKey = await this.di.secrets.getCryptoKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(cryptoAlgorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(`${userId}_${friendId}`), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  }

  private async decrypt(hash: string): Promise<{ userId: string; friendId: string }> {
    const secretKey = await this.di.secrets.getCryptoKey();
    const [iv, content] = hash.split(":");
    const decipher = crypto.createDecipheriv(cryptoAlgorithm, secretKey, Buffer.from(iv, "hex"));

    const decrypted = Buffer.concat([decipher.update(Buffer.from(content, "hex")), decipher.final()]);

    const userAndFriend = decrypted.toString();
    const [userId, friendId] = userAndFriend.split("_");
    return { userId, friendId };
  }
}
