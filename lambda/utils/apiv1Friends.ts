import { IDI } from "./di";
import { IApiResult, err } from "./apiv1Common";
import { FollowDao } from "../dao/followDao";
import { UserDao } from "../dao/userDao";
import { FollowAccess_permissions } from "./followAccess";
import { Follows_listApproved } from "./follows";
import { FriendHistoryQuery_encodeCursor, FriendHistoryQuery_parse, IFriendHistoryParams } from "./friendHistoryQuery";
import { FriendRecord_project } from "../../src/models/friendRecord";
import { IApiFriend, IFollowPermissions } from "../../src/models/follow";
import { LiftohistorySerializer_serialize } from "../../src/liftohistory/liftohistorySerializer";
import { IHistoryRecord, ISettings } from "../../src/types";
import { FriendPrograms_get, FriendPrograms_list, FriendPrograms_update } from "./friendPrograms";
import { IFriendProgramSummary } from "../../src/models/friendProgram";
import { PlannerProgram_generateFullText } from "../../src/pages/planner/models/plannerProgram";

export interface IFriendHistoryPage {
  ownerId: string;
  records: { id: number; text: string }[];
  nextCursor?: string;
}

export interface IFriendHistoryRecord {
  ownerId: string;
  id: number;
  text: string;
}

interface IFriendAccess {
  permissions: IFollowPermissions;
  settings: ISettings;
}

async function friendAccess(di: IDI, viewerId: string, friendId: string): Promise<IApiResult<IFriendAccess>> {
  if (friendId === viewerId) {
    return err(400, "invalid_input", "That is your own account. Use get_history for your own workouts.");
  }
  const row = await new FollowDao(di).get(viewerId, friendId);
  const permissions = FollowAccess_permissions(viewerId, friendId, row);
  const settings = permissions != null ? (await new UserDao(di).getSettingsByIds([friendId]))[0]?.settings : undefined;
  if (permissions == null || settings == null) {
    return err(404, "not_found", "No friend with this id. Use list_friends to see the people you follow.");
  }
  return { success: true, data: { permissions, settings } };
}

function serialize(record: IHistoryRecord, access: IFriendAccess): string {
  return LiftohistorySerializer_serialize(FriendRecord_project(record, access.permissions), access.settings);
}

export async function ApiV1_listFriends(viewerId: string, di: IDI): Promise<IApiResult<{ friends: IApiFriend[] }>> {
  return { success: true, data: { friends: await Follows_listApproved(di, viewerId) } };
}

export async function ApiV1_getFriendHistory(
  viewerId: string,
  friendId: string,
  params: IFriendHistoryParams,
  di: IDI
): Promise<IApiResult<IFriendHistoryPage>> {
  const query = FriendHistoryQuery_parse(friendId, params);
  if (!query.success) {
    return query;
  }
  const access = await friendAccess(di, viewerId, friendId);
  if (!access.success) {
    return access;
  }
  const page = await new UserDao(di).queryHistoryPage(friendId, query.data);
  return {
    success: true,
    data: {
      ownerId: friendId,
      records: page.items.map((record) => ({ id: record.id, text: serialize(record, access.data) })),
      nextCursor: FriendHistoryQuery_encodeCursor(page.lastEvaluatedKey),
    },
  };
}

export async function ApiV1_getFriendHistoryRecord(
  viewerId: string,
  friendId: string,
  recordId: number,
  di: IDI
): Promise<IApiResult<IFriendHistoryRecord>> {
  if (!Number.isFinite(recordId)) {
    return err(400, "invalid_input", "Invalid history record id");
  }
  const access = await friendAccess(di, viewerId, friendId);
  if (!access.success) {
    return access;
  }
  const [record] = await new UserDao(di).getHistoryByUserId(friendId, { ids: [recordId] });
  if (record == null) {
    return err(404, "not_found", "History record not found");
  }
  return { success: true, data: { ownerId: friendId, id: record.id, text: serialize(record, access.data) } };
}

const toolHints: Partial<Record<string, string>> = {
  not_found: "Use list_friends and list_friend_programs to see what is shared with you.",
  conflict: "Read it again with get_friend_program and redo the edit.",
};

function withToolHint<T>(result: IApiResult<T>): IApiResult<T> {
  if (result.success) {
    return result;
  }
  const hint = toolHints[result.error.code];
  return hint != null
    ? { success: false, error: { ...result.error, message: `${result.error.message} ${hint}` } }
    : result;
}

export async function ApiV1_listFriendPrograms(
  viewerId: string,
  friendId: string,
  di: IDI
): Promise<IApiResult<{ ownerId: string; programs: IFriendProgramSummary[] }>> {
  const result = await FriendPrograms_list(di, viewerId, friendId);
  return result.success ? { success: true, data: { ownerId: friendId, ...result.data } } : withToolHint(result);
}

export async function ApiV1_getFriendProgram(
  viewerId: string,
  friendId: string,
  programId: string,
  di: IDI
): Promise<
  IApiResult<{
    ownerId: string;
    id: string;
    name: string;
    isCurrent: boolean;
    text: string;
    base: string;
  }>
> {
  const result = await FriendPrograms_get(di, viewerId, friendId, programId);
  if (!result.success) {
    return withToolHint(result);
  }
  const { exported, base, isCurrent } = result.data;
  return {
    success: true,
    data: {
      ownerId: friendId,
      id: exported.program.id,
      name: exported.program.name,
      isCurrent,
      text: PlannerProgram_generateFullText(exported.program.planner?.weeks ?? []),
      base,
    },
  };
}

export async function ApiV1_updateFriendProgram(
  viewerId: string,
  friendId: string,
  programId: string,
  text: unknown,
  base: unknown,
  di: IDI
): Promise<IApiResult<{ ownerId: string; id: string; base: string }>> {
  const result = await FriendPrograms_update(di, viewerId, friendId, programId, { text, base });
  return result.success ? { success: true, data: { ownerId: friendId, ...result.data } } : withToolHint(result);
}
