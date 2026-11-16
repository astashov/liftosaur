import { ISettings } from "../types";
import { IAccount } from "./account";
import { IFeedResponse } from "./feedWorkout";
import { Follow_displayName, IFollowing } from "./follow";
import { IFriendProgramCard } from "./friendProgram";
import { IReactor } from "./reactions";

export interface IFriendsWebRow {
  userId: string;
  name: string;
  nickname?: string;
  lastWorkoutAt?: number;
  canEditPrograms: boolean;
  currentProgramName?: string;
}

interface IFriendsPageBase {
  isMobile: boolean;
  account: IAccount;
  now: number;
}

export type IFriendsPageData =
  | (IFriendsPageBase & { kind: "list"; friends: IFriendsWebRow[] })
  | (IFriendsPageBase & {
      kind: "workouts";
      ownerId: string;
      name: string;
      viewer: IReactor;
      settings: ISettings;
      feed: IFeedResponse;
    })
  | (IFriendsPageBase & {
      kind: "programs";
      ownerId: string;
      name: string;
      programs: IFriendProgramCard[];
      settings: ISettings;
    });

export function FriendsWeb_rows(
  following: IFollowing[],
  currentProgramNames: Partial<Record<string, string>> = {}
): IFriendsWebRow[] {
  return following
    .map((f) => ({
      userId: f.userId,
      name: Follow_displayName(f.nickname),
      nickname: f.nickname,
      lastWorkoutAt: f.lastWorkoutAt,
      canEditPrograms: f.permissions.programs,
      currentProgramName: f.permissions.programs ? currentProgramNames[f.userId] : undefined,
    }))
    .sort((a, b) => (b.lastWorkoutAt ?? 0) - (a.lastWorkoutAt ?? 0) || a.name.localeCompare(b.name));
}

export function FriendsWeb_presentation(data: IFriendsPageData): {
  path: string;
  documentTitle: string;
  heading: string;
} {
  switch (data.kind) {
    case "list":
      return { path: FriendsWeb_listUrl(), documentTitle: "Friends | Liftosaur", heading: "Friends" };
    case "workouts":
      return {
        path: FriendsWeb_workoutsUrl(data.ownerId),
        documentTitle: `${data.name}'s workouts | Liftosaur`,
        heading: data.name,
      };
    case "programs":
      return {
        path: FriendsWeb_programsUrl(data.ownerId),
        documentTitle: `${data.name}'s programs | Liftosaur`,
        heading: `${data.name}'s programs`,
      };
  }
}

export function FriendsWeb_listUrl(): string {
  return "/user/friends";
}

export function FriendsWeb_workoutsUrl(userId: string): string {
  return `/user/friends/${encodeURIComponent(userId)}/workouts`;
}

export function FriendsWeb_programsUrl(userId: string): string {
  return `/user/friends/${encodeURIComponent(userId)}/programs`;
}
