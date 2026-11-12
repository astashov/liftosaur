import { IDI } from "./di";
import { Utils_getEnv } from "../utils";
import { FollowDao, IFollowDao } from "../dao/followDao";
import { UserDao, userTableNames } from "../dao/userDao";
import { UidFactory_generateSecureToken } from "./generator";
import { FollowAccess_canDecide } from "./followAccess";
import {
  Follow_defaultPermissions,
  Follow_maxFollows,
  IFollowPermissions,
  IFollowsResponse,
} from "../../src/models/follow";
import { Concurrency_runWithLimit } from "../../src/utils/concurrency";
import { IEither } from "../../src/utils/types";

export type IFollowsError = "notfound" | "forbidden" | "limit";

export function Follows_newRequestId(): string {
  return UidFactory_generateSecureToken(12);
}

async function lastWorkoutAt(di: IDI, userId: string): Promise<number | undefined> {
  const env = Utils_getEnv();
  try {
    const page = await di.dynamo.queryPage<{ date?: string }>({
      tableName: userTableNames[env].historyRecords,
      indexName: userTableNames[env].historyRecordsDate,
      expression: "#userId = :userId",
      attrs: { "#userId": "userId" },
      values: { ":userId": userId },
      scanIndexForward: false,
      limit: 1,
    });
    const date = page.items[0]?.date;
    return date != null ? new Date(date).getTime() : undefined;
  } catch (e) {
    return undefined;
  }
}

export async function Follows_load(di: IDI, userId: string): Promise<IFollowsResponse> {
  const followDao = new FollowDao(di);
  const [following, followers] = await Promise.all([followDao.listFollowing(userId), followDao.listFollowers(userId)]);
  const otherIds = Array.from(new Set([...following.map((r) => r.followeeId), ...followers.map((r) => r.followerId)]));
  const nicknames = await new UserDao(di).getNicknamesByIds(otherIds);
  const approvedFollowing = following.filter((r) => r.status === "approved");
  const lastWorkouts = await Concurrency_runWithLimit(
    approvedFollowing.map((r) => () => lastWorkoutAt(di, r.followeeId)),
    10
  );
  return {
    accountId: userId,
    following: approvedFollowing.map((r, i) => ({
      userId: r.followeeId,
      nickname: nicknames[r.followeeId],
      lastWorkoutAt: lastWorkouts[i],
    })),
    followers: followers
      .filter((r) => r.status === "approved")
      .map((r) => ({ userId: r.followerId, nickname: nicknames[r.followerId], permissions: r.permissions })),
    incoming: followers
      .filter((r) => r.status === "pending")
      .map((r) => ({ requestId: r.requestId, nickname: nicknames[r.followerId], createdAt: r.createdAt })),
    outgoing: following
      .filter((r) => r.status === "pending")
      .map((r) => ({ requestId: r.requestId, nickname: nicknames[r.followeeId], createdAt: r.createdAt })),
  };
}

export async function Follows_approve(
  di: IDI,
  actorId: string,
  requestId: string,
  permissions: IFollowPermissions,
  followBack: boolean,
  now: number = Date.now()
): Promise<IEither<void, IFollowsError>> {
  const followDao = new FollowDao(di);
  const row = await followDao.getByRequestId(requestId);
  if (row == null) {
    return { success: false, error: "notfound" };
  }
  if (FollowAccess_canDecide(actorId, row) !== "approve") {
    return { success: false, error: "forbidden" };
  }
  const requesterFollowing = await followDao.listFollowing(row.followerId);
  if (requesterFollowing.filter((r) => r.status === "approved").length >= Follow_maxFollows) {
    return { success: false, error: "limit" };
  }
  await followDao.put({ ...row, status: "approved", permissions });
  if (followBack) {
    const existing = await followDao.get(actorId, row.followerId);
    if (existing == null) {
      const back: IFollowDao = {
        followerId: actorId,
        followeeId: row.followerId,
        status: "pending",
        requestId: Follows_newRequestId(),
        permissions: Follow_defaultPermissions,
        createdAt: now,
      };
      await followDao.put(back);
    }
  }
  return { success: true, data: undefined };
}

export async function Follows_removeRequest(
  di: IDI,
  actorId: string,
  requestId: string
): Promise<IEither<void, IFollowsError>> {
  const followDao = new FollowDao(di);
  const row = await followDao.getByRequestId(requestId);
  if (row == null) {
    return { success: false, error: "notfound" };
  }
  if (FollowAccess_canDecide(actorId, row) == null) {
    return { success: false, error: "forbidden" };
  }
  await followDao.remove(row.followerId, row.followeeId);
  return { success: true, data: undefined };
}

export async function Follows_setPermissions(
  di: IDI,
  actorId: string,
  followerId: string,
  permissions: IFollowPermissions
): Promise<IEither<void, IFollowsError>> {
  const followDao = new FollowDao(di);
  const row = await followDao.get(followerId, actorId);
  if (row == null || row.status !== "approved") {
    return { success: false, error: "notfound" };
  }
  await followDao.put({ ...row, permissions });
  return { success: true, data: undefined };
}
