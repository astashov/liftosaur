import { IDI } from "./di";
import { Utils_getEnv } from "../utils";
import { IHistoryRecord, ISettings } from "../../src/types";
import { userTableNames, UserDao } from "../dao/userDao";
import { FollowDao, IFollowDao } from "../dao/followDao";
import { ReactionDao } from "../dao/reactionDao";
import {
  FeedPage_decodeCursor,
  FeedPage_encodeCursor,
  FeedPage_isOwnerDone,
  FeedPage_merge,
  FeedPage_startKey,
  IFeedOwnerResult,
} from "./feedPage";
import { FollowAccess_permissions } from "./followAccess";
import { FeedWorkout_fromRecord, FeedWorkout_key, IFeedResponse, IFeedWorkout } from "../../src/models/feedWorkout";
import { IReactionRow, IReactionSummary, Reactions_summarize } from "../../src/models/reactions";
import { Concurrency_runWithLimit } from "../../src/utils/concurrency";
import { CollectionUtils_compact } from "../../src/utils/collection";

const feedQueryConcurrency = 10;
const feedMaxLimit = 50;

export async function Feed_summarizeReactions(
  di: IDI,
  viewerId: string,
  targets: { ownerId: string; recordId: number }[]
): Promise<Partial<Record<string, IReactionSummary>>> {
  if (targets.length === 0) {
    return {};
  }
  const rows = await new ReactionDao(di).listForRecords(targets);
  const ownerIds = Array.from(new Set(targets.map((t) => t.ownerId)));
  const followerLists = await Promise.all(ownerIds.map((ownerId) => new FollowDao(di).listFollowers(ownerId)));
  const allowed = new Set<string>();
  ownerIds.forEach((ownerId, i) => {
    allowed.add(`${ownerId}:${ownerId}`);
    for (const row of followerLists[i]) {
      if (row.status === "approved") {
        allowed.add(`${ownerId}:${row.followerId}`);
      }
    }
  });
  const visibleRows = rows.filter((row) => allowed.has(`${row.ownerId}:${row.reactorId}`));
  const nicknames = await new UserDao(di).getNicknamesByIds(Array.from(new Set(visibleRows.map((r) => r.reactorId))));
  const byKey: Partial<Record<string, IReactionRow[]>> = {};
  for (const row of visibleRows) {
    const key = FeedWorkout_key(row.ownerId, row.recordId);
    (byKey[key] = byKey[key] || []).push(row);
  }
  const result: Partial<Record<string, IReactionSummary>> = {};
  for (const target of targets) {
    const key = FeedWorkout_key(target.ownerId, target.recordId);
    result[key] = Reactions_summarize(byKey[key] || [], viewerId, nicknames);
  }
  return result;
}

async function queryOwner(
  di: IDI,
  ownerId: string,
  startKey: IFeedOwnerResult["lastEvaluatedKey"],
  limit: number
): Promise<IFeedOwnerResult> {
  const env = Utils_getEnv();
  try {
    const page = await di.dynamo.queryPage<IHistoryRecord>({
      tableName: userTableNames[env].historyRecords,
      indexName: userTableNames[env].historyRecordsDate,
      expression: "#userId = :userId",
      attrs: { "#userId": "userId" },
      values: { ":userId": ownerId },
      scanIndexForward: false,
      limit,
      exclusiveStartKey: startKey,
    });
    return { ownerId, records: page.items, lastEvaluatedKey: page.lastEvaluatedKey, failed: false };
  } catch (e) {
    di.log.log("Feed: owner query failed", ownerId, e);
    return { ownerId, records: [], failed: true };
  }
}

export async function Feed_load(
  di: IDI,
  viewerId: string,
  args: { cursor?: string; owners?: string[]; limit: number }
): Promise<IFeedResponse> {
  const limit = Math.max(1, Math.min(feedMaxLimit, args.limit));
  const following = (await new FollowDao(di).listFollowing(viewerId)).filter((row) => row.status === "approved");
  const requested = args.owners != null ? new Set(args.owners) : undefined;
  const rows = following.filter((row) => requested == null || requested.has(row.followeeId));
  const rowByOwner: Partial<Record<string, IFollowDao>> = {};
  for (const row of rows) {
    rowByOwner[row.followeeId] = row;
  }
  const cursor = FeedPage_decodeCursor(args.cursor);
  const ownerIds = rows.map((r) => r.followeeId).filter((ownerId) => !FeedPage_isOwnerDone(cursor, ownerId));
  const results = await Concurrency_runWithLimit(
    ownerIds.map((ownerId) => () => queryOwner(di, ownerId, FeedPage_startKey(cursor, ownerId), limit)),
    feedQueryConcurrency
  );
  const merged = FeedPage_merge({ results, previous: cursor, activeOwners: rows.map((r) => r.followeeId), limit });

  const winnerOwners = Array.from(new Set(merged.winners.map((w) => w.ownerId)));
  const settingsRows = await new UserDao(di).getSettingsByIds(winnerOwners);
  const settingsByOwner: Partial<Record<string, ISettings>> = {};
  for (const row of settingsRows) {
    settingsByOwner[row.id] = row.settings;
  }
  const workouts: IFeedWorkout[] = CollectionUtils_compact(
    merged.winners.map((winner) => {
      const settings = settingsByOwner[winner.ownerId];
      const permissions = FollowAccess_permissions(viewerId, winner.ownerId, rowByOwner[winner.ownerId]);
      if (settings == null || permissions == null) {
        return undefined;
      }
      return FeedWorkout_fromRecord(winner.record, settings, winner.ownerId, permissions);
    })
  );
  const reactions = await Feed_summarizeReactions(
    di,
    viewerId,
    workouts.map((w) => ({ ownerId: w.ownerId, recordId: w.recordId }))
  );
  const owners: IFeedResponse["owners"] = {};
  for (const ownerId of winnerOwners) {
    owners[ownerId] = { nickname: settingsByOwner[ownerId]?.nickname };
  }
  return {
    accountId: viewerId,
    workouts,
    reactions,
    owners,
    cursor: merged.hasMore ? FeedPage_encodeCursor(merged.next) : undefined,
    failedOwners: merged.failedOwners,
  };
}
