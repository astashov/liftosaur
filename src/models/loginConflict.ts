import { IGym, IStorage, STORAGE_VERSION_TYPES } from "../types";
import { StringUtils_pluralize } from "../utils/string";
import { HistoryDelta_sortNewestFirst } from "../utils/historyDelta";
import { ILoginAccount, LoginAdoptLocal_storage, LoginAdoptLocal_subscription } from "./loginAdoptLocal";
import {
  ILoginConflictSummary,
  LoginConflictSummary_phoneOnlyPrograms,
  LoginConflictSummary_phoneOnlyWorkouts,
} from "./loginConflictSummary";
import { VersionTracker } from "./versionTracker";

export type ILoginConflictChoice = "switch" | "merge" | "overwrite" | "cancel";
export type ILoginConflictTypedChoice = "merge" | "overwrite";

type IStatLists = Partial<Record<string, { timestamp: number }[]>>;

function countOf(count: number, name: string): string {
  return `${count} ${StringUtils_pluralize(name, count)}`;
}

function joinParts(parts: string[]): string {
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts.join("");
}

function accountDescription(summary: ILoginConflictSummary): string {
  return `${countOf(summary.accountWorkouts, "workout")} and ${countOf(summary.accountPrograms, "program")}`;
}

function phoneOnlyDescription(summary: ILoginConflictSummary): string {
  const parts = [
    { count: summary.phoneOnlyWorkouts, name: "workout" },
    { count: summary.phoneOnlyPrograms, name: "program" },
    { count: summary.phoneOnlyStats, name: "measurement" },
  ];
  return joinParts(parts.filter((part) => part.count > 0).map((part) => countOf(part.count, part.name)));
}

export function LoginConflict_description(summary: ILoginConflictSummary, email: string): string {
  return `${email} has ${accountDescription(summary)}.\nThis device has ${phoneOnlyDescription(summary)} not in the account.`;
}

export function LoginConflict_typedPrompt(
  choice: ILoginConflictTypedChoice,
  summary: ILoginConflictSummary,
  email: string
): string {
  if (choice === "merge") {
    return `This adds ${phoneOnlyDescription(summary)} to ${email}. You can't undo it. Type 'merge' to confirm.`;
  }
  return `This deletes ${accountDescription(summary)} from ${email}, and replaces them with this device's data. Type 'overwrite' to confirm.`;
}

export function LoginConflict_isConfirmed(choice: ILoginConflictTypedChoice, answer: string | undefined): boolean {
  return answer?.trim().toLowerCase() === choice;
}

function mergedGyms(server: IGym[], local: IGym[]): IGym[] {
  const accountGyms = server.map((gym) => {
    const phoneGym = local.find((candidate) => candidate.id === gym.id);
    return phoneGym != null ? { ...gym, equipment: { ...phoneGym.equipment, ...gym.equipment } } : gym;
  });
  return [...accountGyms, ...local.filter((gym) => !server.some((candidate) => candidate.id === gym.id))];
}

function withPhoneOnlyStats<T extends IStatLists>(server: T, local: T): T {
  const merged: Record<string, { timestamp: number }[]> = {};
  for (const key of Object.keys(local)) {
    const serverValues = server[key] || [];
    const serverTimestamps = new Set(serverValues.map((value) => value.timestamp));
    const added = (local[key] || []).filter((value) => !serverTimestamps.has(value.timestamp));
    if (added.length > 0) {
      merged[key] = [...serverValues, ...added].sort((a, b) => b.timestamp - a.timestamp);
    }
  }
  return { ...server, ...merged };
}

export function LoginConflict_mergedStorage(
  local: IStorage,
  server: IStorage,
  account: ILoginAccount,
  deviceId: string,
  now: number
): IStorage {
  const { _versions: serverVersions, ...serverFields } = server;
  const merged: IStorage = {
    ...serverFields,
    tempUserId: account.userId,
    email: account.email,
    subscription: LoginAdoptLocal_subscription(local, server, account.key),
    history: HistoryDelta_sortNewestFirst([
      ...server.history,
      ...LoginConflictSummary_phoneOnlyWorkouts(local, server),
    ]),
    programs: [...server.programs, ...LoginConflictSummary_phoneOnlyPrograms(local, server)],
    progress: server.progress.length > 0 ? server.progress : local.progress,
    settings: {
      ...server.settings,
      exercises: { ...local.settings.exercises, ...server.settings.exercises },
      exerciseData: { ...local.settings.exerciseData, ...server.settings.exerciseData },
      gyms: mergedGyms(server.settings.gyms, local.settings.gyms),
      muscleGroups: {
        ...server.settings.muscleGroups,
        data: { ...local.settings.muscleGroups.data, ...server.settings.muscleGroups.data },
      },
    },
    stats: {
      ...server.stats,
      weight: withPhoneOnlyStats(server.stats.weight, local.stats.weight),
      length: withPhoneOnlyStats(server.stats.length, local.stats.length),
      percentage: withPhoneOnlyStats(server.stats.percentage, local.stats.percentage),
      ...(local.stats.health != null
        ? { health: withPhoneOnlyStats(server.stats.health || {}, local.stats.health) }
        : {}),
    },
  };
  const tracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId });
  const versions = tracker.updateVersions(
    { ...serverFields, tempUserId: account.userId },
    merged,
    serverVersions || {},
    serverVersions || {},
    now
  );
  return { ...merged, _versions: versions };
}

function withEmptyLists<T extends object>(local: T, server: object): T {
  const present = new Set(
    Object.entries(local)
      .filter(([, value]) => value != null)
      .map(([key]) => key)
  );
  const emptied: Record<string, unknown[]> = {};
  for (const key of Object.keys(server)) {
    if (!present.has(key)) {
      emptied[key] = [];
    }
  }
  return { ...local, ...emptied };
}

export function LoginConflict_overwrittenStorage(
  local: IStorage,
  server: IStorage,
  account: ILoginAccount,
  deviceId: string,
  now: number
): IStorage {
  const stats = {
    ...local.stats,
    weight: withEmptyLists(local.stats.weight, server.stats.weight),
    length: withEmptyLists(local.stats.length, server.stats.length),
    percentage: withEmptyLists(local.stats.percentage, server.stats.percentage),
    ...(server.stats.health != null ? { health: withEmptyLists(local.stats.health || {}, server.stats.health) } : {}),
  };
  return LoginAdoptLocal_storage({ ...local, stats }, server, account, deviceId, now);
}
