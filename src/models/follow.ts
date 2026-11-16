import { ObjectUtils_keys } from "../utils/object";

export interface IFollowPermissions {
  notes: boolean;
  programs: boolean;
}

export interface IFollowPerson {
  userId: string;
  nickname?: string;
  lastWorkoutAt?: number;
}

export interface IFollower extends IFollowPerson {
  permissions: IFollowPermissions;
}

export interface IFollowing extends IFollowPerson {
  permissions: IFollowPermissions;
}

export interface IApiFriend {
  userId: string;
  nickname?: string;
  canSeeNotes: boolean;
  canEditPrograms: boolean;
}

export interface IFollowRequest {
  requestId: string;
  nickname?: string;
  createdAt: number;
}

export interface IFollowsResponse {
  accountId: string;
  following: IFollowing[];
  followers: IFollower[];
  incoming: IFollowRequest[];
  outgoing: IFollowRequest[];
}

export const Follow_defaultPermissions: IFollowPermissions = { notes: false, programs: false };

export const Follow_maxFollows = 100;

export function Follow_displayName(nickname: string | undefined): string {
  return nickname?.trim() || "A friend";
}

export const Follow_maxNicknameLength = 30;

export function Follow_parseNickname(text: string): { nickname: string } | { error: string } {
  const nickname = text.trim();
  if (nickname.length === 0) {
    return { error: "Pick a nickname" };
  }
  if (nickname.length > Follow_maxNicknameLength) {
    return { error: `Use up to ${Follow_maxNicknameLength} characters` };
  }
  return { nickname };
}

export function Follow_needsNickname(nickname: string | undefined): boolean {
  return !nickname?.trim();
}

export function Follow_accessSummary(permissions: IFollowPermissions): string {
  const sees = permissions.notes ? "Sees workouts and notes" : "Sees workouts";
  return permissions.programs ? `${sees}, edits programs` : sees;
}

export function Follow_setPermission(
  permissions: IFollowPermissions,
  key: keyof IFollowPermissions,
  value: boolean
): IFollowPermissions {
  return { ...permissions, [key]: value };
}

// Rows and dev builds from before see and edit merged carry a separate programEdits flag. Only an edit
// grant becomes the merged permission, so a see-only grant never turns into edit access.
function programsFlag(record: Record<string, unknown>): unknown {
  return "programEdits" in record ? record.programEdits : record.programs;
}

export function Follow_parsePermissionsPatch(value: unknown): Partial<IFollowPermissions> | undefined {
  if (value == null || typeof value !== "object") {
    return undefined;
  }
  const record: Record<string, unknown> = { ...value };
  const flags: Record<keyof IFollowPermissions, unknown> = { notes: record.notes, programs: programsFlag(record) };
  const patch: Partial<IFollowPermissions> = {};
  for (const key of ObjectUtils_keys(flags)) {
    const flag = flags[key];
    if (typeof flag === "boolean") {
      patch[key] = flag;
    } else if (flag !== undefined) {
      return undefined;
    }
  }
  return ObjectUtils_keys(patch).length > 0 ? patch : undefined;
}

export function Follow_applyPermissionsPatch(
  current: IFollowPermissions,
  patch: Partial<IFollowPermissions>
): IFollowPermissions {
  return { ...current, ...patch };
}

export function Follow_parsePermissions(value: unknown): IFollowPermissions | undefined {
  if (value == null || typeof value !== "object") {
    return undefined;
  }
  const record: Record<string, unknown> = { ...value };
  if (typeof record.notes !== "boolean") {
    return undefined;
  }
  return { notes: record.notes, programs: programsFlag(record) === true };
}
