export interface IFollowPermissions {
  notes: boolean;
}

export interface IFollowPerson {
  userId: string;
  nickname?: string;
  lastWorkoutAt?: number;
}

export interface IFollower extends IFollowPerson {
  permissions: IFollowPermissions;
}

export interface IApiFriend {
  userId: string;
  nickname?: string;
  canSeeNotes: boolean;
}

export interface IFollowRequest {
  requestId: string;
  nickname?: string;
  createdAt: number;
}

export interface IFollowsResponse {
  accountId: string;
  following: IFollowPerson[];
  followers: IFollower[];
  incoming: IFollowRequest[];
  outgoing: IFollowRequest[];
}

export const Follow_defaultPermissions: IFollowPermissions = { notes: false };

export const Follow_maxFollows = 100;

export function Follow_parsePermissions(value: unknown): IFollowPermissions | undefined {
  if (value == null || typeof value !== "object") {
    return undefined;
  }
  const notes = (value as { notes?: unknown }).notes;
  return typeof notes === "boolean" ? { notes } : undefined;
}
