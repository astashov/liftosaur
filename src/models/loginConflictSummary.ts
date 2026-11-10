import { IHistoryRecord, IProgram, IStats, IStorage } from "../types";

export interface ILoginConflictSummary {
  accountWorkouts: number;
  accountPrograms: number;
  phoneOnlyWorkouts: number;
  phoneOnlyPrograms: number;
  phoneOnlyStats: number;
}

export interface ILoginPhoneIds {
  workoutIds: number[];
  programs: { id: string; clonedAt?: number }[];
  statIds: string[];
}

function statIds(stats: IStats): string[] {
  const groups: Partial<Record<string, { timestamp: number }[]>>[] = [
    stats.weight,
    stats.length,
    stats.percentage,
    stats.health || {},
  ];
  return groups.flatMap((group) =>
    Object.keys(group).flatMap((key) => (group[key] || []).map((stat) => `${stat.timestamp}_${key}`))
  );
}

export function LoginConflictSummary_phoneOnlyWorkouts(local: IStorage, server: IStorage): IHistoryRecord[] {
  const accountIds = new Set(server.history.map((record) => record.id));
  return local.history.filter((record) => !accountIds.has(record.id));
}

export function LoginConflictSummary_phoneOnlyPrograms(local: IStorage, server: IStorage): IProgram[] {
  return local.programs.filter(
    (program) =>
      !server.programs.some(
        (accountProgram) =>
          accountProgram.id === program.id || (program.clonedAt != null && accountProgram.clonedAt === program.clonedAt)
      )
  );
}

export function LoginConflictSummary_phoneIds(local: IStorage): ILoginPhoneIds {
  return {
    workoutIds: local.history.map((record) => record.id),
    programs: local.programs.map((program) => ({ id: program.id, clonedAt: program.clonedAt })),
    statIds: statIds(local.stats),
  };
}

export function LoginConflictSummary_parsePhoneIds(value: unknown): ILoginPhoneIds | undefined {
  if (value == null || typeof value !== "object") {
    return undefined;
  }
  const { workoutIds, programs, statIds: stats } = value as Record<string, unknown>;
  if (!Array.isArray(workoutIds) || !Array.isArray(programs) || !Array.isArray(stats)) {
    return undefined;
  }
  return {
    workoutIds: workoutIds.filter((id): id is number => typeof id === "number"),
    programs: programs
      .filter((p): p is { id: string; clonedAt?: unknown } => p != null && typeof p.id === "string")
      .map((p) => ({ id: p.id, clonedAt: typeof p.clonedAt === "number" ? p.clonedAt : undefined })),
    statIds: stats.filter((id): id is string => typeof id === "string"),
  };
}

export function LoginConflictSummary_hasAnyData(phone: ILoginPhoneIds): boolean {
  return phone.workoutIds.length > 0 || phone.programs.length > 0 || phone.statIds.length > 0;
}

export function LoginConflictSummary_fromIds(phone: ILoginPhoneIds, server: IStorage): ILoginConflictSummary {
  const accountWorkoutIds = new Set(server.history.map((record) => record.id));
  const accountStatIds = new Set(statIds(server.stats));
  const isAccountProgram = (program: ILoginPhoneIds["programs"][number]): boolean =>
    server.programs.some(
      (accountProgram) =>
        accountProgram.id === program.id || (program.clonedAt != null && accountProgram.clonedAt === program.clonedAt)
    );
  return {
    accountWorkouts: server.history.length,
    accountPrograms: server.programs.length,
    phoneOnlyWorkouts: phone.workoutIds.filter((id) => !accountWorkoutIds.has(id)).length,
    phoneOnlyPrograms: phone.programs.filter((program) => !isAccountProgram(program)).length,
    phoneOnlyStats: phone.statIds.filter((id) => !accountStatIds.has(id)).length,
  };
}

export function LoginConflictSummary_build(local: IStorage, server: IStorage): ILoginConflictSummary {
  return LoginConflictSummary_fromIds(LoginConflictSummary_phoneIds(local), server);
}

export function LoginConflictSummary_hasPhoneOnlyData(summary: ILoginConflictSummary): boolean {
  return summary.phoneOnlyWorkouts > 0 || summary.phoneOnlyPrograms > 0 || summary.phoneOnlyStats > 0;
}
