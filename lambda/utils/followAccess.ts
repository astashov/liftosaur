import { IFollowPermissions } from "../../src/models/follow";
import { IFollowDao } from "../dao/followDao";

const ownerPermissions: IFollowPermissions = { notes: true };

export function FollowAccess_permissions(
  actorId: string,
  ownerId: string,
  row: IFollowDao | undefined
): IFollowPermissions | undefined {
  if (actorId === ownerId) {
    return ownerPermissions;
  }
  if (row == null || row.followerId !== actorId || row.followeeId !== ownerId || row.status !== "approved") {
    return undefined;
  }
  return row.permissions;
}

export function FollowAccess_canReact(actorId: string, ownerId: string, row: IFollowDao | undefined): boolean {
  return FollowAccess_permissions(actorId, ownerId, row) != null;
}

export type IFollowDecision = "approve" | "cancel";

export function FollowAccess_canDecide(actorId: string, row: IFollowDao): IFollowDecision | undefined {
  if (row.status !== "pending") {
    return undefined;
  }
  if (row.followeeId === actorId) {
    return "approve";
  }
  if (row.followerId === actorId) {
    return "cancel";
  }
  return undefined;
}
