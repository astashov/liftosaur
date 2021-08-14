import { ILike } from "../../src/models/state";
import { IHistoryRecord } from "../../src/types";
import { CollectionUtils } from "../../src/utils/collection";
import { ObjectUtils } from "../../src/utils/object";
import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { FriendDao } from "./friendDao";
import { UserDao, userTableNames } from "./userDao";

const tableNames = {
  dev: {
    likes: "lftLikesDev",
    likesFriends: "lftLikesFriendsDev",
  },
  prod: {
    likes: "lftLikes",
    likesFriends: "lftLikesFriends",
  },
} as const;

export type ILikeDao = Omit<ILike, "userNickname">;

export class LikesDao {
  constructor(private readonly di: IDI) {}

  public async getForUser(
    currentUserId: string,
    startDate: string,
    endDate?: string
  ): Promise<Partial<Record<string, ILike[]>>> {
    const env = Utils.getEnv();
    const friendsDao = new FriendDao(this.di);
    const userDao = new UserDao(this.di);
    const currentUser = await userDao.getUserAndHistory(currentUserId, startDate, endDate);
    const friendsWithHistories = await friendsDao.getFriendsWithHistories(currentUserId, startDate, endDate);
    const friendIds = [currentUserId, ...ObjectUtils.keys(CollectionUtils.groupByKeyUniq(friendsWithHistories, "id"))];

    if (currentUser != null) {
      let histories = currentUser.storage.history.map((hr) => `${currentUserId}_${hr.id}`);
      for (const friend of friendsWithHistories) {
        histories = histories.concat(friend.storage.history.map((hr) => `${friend.id}_${hr.id}`));
      }
      const historiesSet = new Set(histories);

      const likesDao = (
        await Promise.all(
          friendIds.map((friendId) => {
            return this.di.dynamo.query<ILikeDao>({
              tableName: tableNames[env].likes,
              indexName: tableNames[env].likesFriends,
              expression: "friendId = :friendId",
              values: { ":friendId": friendId },
            });
          })
        )
      )
        .flat()
        .filter((l) => historiesSet.has(l.friendIdHistoryRecordId));
      const likes: ILike[] = likesDao.map((l) => {
        const u = l.friendId === currentUserId ? currentUser : friendsWithHistories.find((f) => f.id === l.friendId);
        const nickname = u?.nickname || l.friendId;
        return { ...l, userNickname: nickname };
      });

      return CollectionUtils.groupByKey(likes, "friendIdHistoryRecordId");
    } else {
      return {};
    }
  }

  public async toggle(
    currentUserId: string,
    args: { historyRecordId: number; friendId: string }
  ): Promise<boolean | undefined> {
    const key = `${args.friendId}_${args.historyRecordId}`;
    const env = Utils.getEnv();
    const historyRecords = await this.di.dynamo.query<IHistoryRecord>({
      tableName: userTableNames[env].historyRecords,
      expression: "#id = :historyRecordId AND userId = :friendId",
      attrs: { "#id": "id" },
      values: { ":historyRecordId": args.historyRecordId, ":friendId": args.friendId },
    });
    const historyRecord = historyRecords[0];
    if (historyRecord != null) {
      const likes = await this.di.dynamo.query<ILikeDao>({
        tableName: tableNames[env].likes,
        expression: "friendIdHistoryRecordId = :key AND userId = :userId",
        values: { ":key": key, ":userId": currentUserId },
      });
      let like = likes[0];

      if (like != null) {
        await this.di.dynamo.remove({
          tableName: tableNames[env].likes,
          key: { friendIdHistoryRecordId: key, userId: like.userId },
        });
        return false;
      } else {
        like = {
          friendIdHistoryRecordId: key,
          friendId: args.friendId,
          historyRecordId: args.historyRecordId,
          userId: currentUserId,
          timestamp: Date.now(),
        };
        await this.di.dynamo.put({ tableName: tableNames[env].likes, item: like });
        return true;
      }
    } else {
      return undefined;
    }
  }
}
