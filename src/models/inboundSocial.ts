import { IHistoryRecord } from "../types";
import { IReactionRow, IReactionSummary, Reactions_summarize } from "./reactions";
import { IProgramEditsResponse } from "./friendProgram";

export const InboundSocial_recentWorkouts = 100;
export const InboundSocial_timeoutMs = 1500;

export interface IInboundSocialRequest {
  sinceRecordId: number;
}

export interface IInboundSocial {
  accountId: string;
  reactions: Partial<Record<string, IReactionSummary>>;
  programEdits?: IProgramEditsResponse;
}

export function InboundSocial_parseRequest(body: unknown): IInboundSocialRequest | undefined {
  if (body == null || typeof body !== "object") {
    return undefined;
  }
  const fields: Partial<Record<string, unknown>> = { ...body };
  const sinceRecordId = fields.sinceRecordId;
  return typeof sinceRecordId === "number" && Number.isFinite(sinceRecordId) && sinceRecordId >= 0
    ? { sinceRecordId }
    : undefined;
}

export function InboundSocial_sinceRecordId(history: IHistoryRecord[]): number {
  const ids = history.map((record) => record.id).sort((a, b) => b - a);
  return ids.length >= InboundSocial_recentWorkouts ? ids[InboundSocial_recentWorkouts - 1] : 0;
}

export function InboundSocial_shouldRequest(args: { isForced: boolean; isNative: boolean }): boolean {
  return args.isForced && args.isNative;
}

export function InboundSocial_summaries(
  rows: IReactionRow[],
  ownerId: string,
  approvedFollowerIds: string[],
  nicknames: Partial<Record<string, string>>
): Partial<Record<string, IReactionSummary>> {
  const allowed = new Set([ownerId, ...approvedFollowerIds]);
  const byRecord = new Map<number, IReactionRow[]>();
  for (const row of rows) {
    if (row.ownerId === ownerId && allowed.has(row.reactorId)) {
      byRecord.set(row.recordId, [...(byRecord.get(row.recordId) ?? []), row]);
    }
  }
  const result: Partial<Record<string, IReactionSummary>> = {};
  for (const [recordId, recordRows] of byRecord) {
    result[String(recordId)] = Reactions_summarize(recordRows, ownerId, nicknames);
  }
  return result;
}
