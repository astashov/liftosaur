import { IComment } from "../../src/models/state";
import { CollectionUtils } from "../../src/utils/collection";
import { DateUtils } from "../../src/utils/date";
import { ObjectUtils } from "../../src/utils/object";
import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { noReplyEmail } from "../utils/email";
import { UidFactory } from "../utils/generator";
import { FriendDao } from "./friendDao";
import { HistoryRecordsDao } from "./historyRecordDao";
import { UserDao } from "./userDao";

const tableNames = {
  dev: {
    comments: "lftCommentsDev",
    commentsFriends: "lftCommentsFriendsDev",
  },
  prod: {
    comments: "lftComments",
    commentsFriends: "lftCommentsFriends",
  },
} as const;

export class CommentsDao {
  constructor(private readonly di: IDI) {}

  public async getForUser(
    currentUserId: string,
    startDate: string,
    endDate?: string
  ): Promise<Partial<Record<string, IComment[]>>> {
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

      const commentsDao = (
        await Promise.all(
          friendIds.map((friendId) => {
            return this.di.dynamo.query<IComment>({
              tableName: tableNames[env].comments,
              indexName: tableNames[env].commentsFriends,
              expression: "friendId = :friendId",
              values: { ":friendId": friendId },
            });
          })
        )
      )
        .flat()
        .filter((c) => historiesSet.has(`${c.friendId}_${c.historyRecordId}`));
      const comments = CollectionUtils.groupByKey(commentsDao, "historyRecordId");
      for (const key of ObjectUtils.keys(comments)) {
        comments[key] = CollectionUtils.uniqBy(comments[key] || [], "id");
        comments[key]!.sort((a, b) => b.timestamp - a.timestamp);
      }
      return comments;
    } else {
      return {};
    }
  }

  public async post(
    userId: string,
    args: { historyRecordId: string; friendId: string; text: string }
  ): Promise<IComment> {
    const userDao = new UserDao(this.di);
    const historyRecordDao = new HistoryRecordsDao(this.di);

    const comment: IComment = {
      id: UidFactory.generateUid(10),
      userId,
      friendId: args.friendId,
      historyRecordId: args.historyRecordId,
      text: args.text,
      timestamp: Date.now(),
    };

    const [user, friend, historyRecord] = await Promise.all([
      userDao.getLimitedById(userId),
      userDao.getLimitedById(args.friendId),
      historyRecordDao.get(args.friendId, parseInt(args.historyRecordId, 10)),
    ]);

    if (user != null && friend != null && historyRecord != null) {
      const env = Utils.getEnv();

      await this.di.dynamo.put({
        tableName: tableNames[env].comments,
        item: comment,
      });

      const date = DateUtils.format(historyRecord.date);
      await this.di.ses.sendEmail({
        source: noReplyEmail,
        destination: friend.email,
        subject: `Liftosaur: ${user.nickname || user.id} commented on your workout on ${date}`,
        body: `${user.nickname || user.id} commented on your workout on ${date}:\n\n${
          comment.text
        }\n\nhttps://www.liftosaur.com`,
      });
    }

    return comment;
  }

  public async remove(userId: string, id: string): Promise<void> {
    const env = Utils.getEnv();
    const comment = await this.di.dynamo.query<IComment>({
      tableName: tableNames[env].comments,
      expression: "userId = :userId AND #id = :id",
      scanIndexForward: false,
      attrs: { "#id": "id" },
      values: { ":id": id, ":userId": userId },
    });
    if (comment.length > 0) {
      await this.di.dynamo.remove({
        tableName: tableNames[env].comments,
        key: { userId: comment[0].userId, id: comment[0].id },
      });
    }
  }
}
