import { IDI } from "./di";
import { Bounded_run } from "./bounded";
import { FollowDao } from "../dao/followDao";
import { ReactionDao } from "../dao/reactionDao";
import { UserDao } from "../dao/userDao";
import { FriendPrograms_listEdits } from "./friendPrograms";
import {
  IInboundSocial,
  IInboundSocialRequest,
  InboundSocial_summaries,
  InboundSocial_timeoutMs,
} from "../../src/models/inboundSocial";

export async function InboundSocial_load(di: IDI, userId: string, sinceRecordId: number): Promise<IInboundSocial> {
  const followers = await new FollowDao(di).listFollowers(userId);
  const approvedFollowerIds = followers.filter((row) => row.status === "approved").map((row) => row.followerId);
  if (approvedFollowerIds.length === 0) {
    return { accountId: userId, reactions: {} };
  }
  const [rows, programEdits] = await Promise.all([
    new ReactionDao(di).listForOwnerSince(userId, sinceRecordId),
    FriendPrograms_listEdits(di, userId),
  ]);
  const reactorIds = Array.from(new Set(rows.map((row) => row.reactorId)));
  const nicknames = await new UserDao(di).getNicknamesByIds(reactorIds);
  return {
    accountId: userId,
    reactions: InboundSocial_summaries(rows, userId, approvedFollowerIds, nicknames),
    programEdits,
  };
}

export function InboundSocial_loadBounded(
  di: IDI,
  userId: string,
  request: IInboundSocialRequest
): Promise<IInboundSocial | undefined> {
  return Bounded_run(di, `inbound social for ${userId}`, InboundSocial_timeoutMs, () =>
    InboundSocial_load(di, userId, request.sinceRecordId)
  );
}
