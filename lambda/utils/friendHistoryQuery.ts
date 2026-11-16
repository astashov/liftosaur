import { NativeAttributeValue } from "@aws-sdk/lib-dynamodb";
import { IEither } from "../../src/utils/types";
import { ApiV1_dateFromEpoch, IApiError } from "./apiv1";

export interface IFriendHistoryQuery {
  startDate?: string;
  endDate?: string;
  limit: number;
  startKey?: Record<string, NativeAttributeValue>;
}

export interface IFriendHistoryParams {
  startDate?: unknown;
  endDate?: unknown;
  limit?: unknown;
  cursor?: unknown;
}

const defaultLimit = 50;
const maxLimit = 100;
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

function invalid(message: string): IEither<IFriendHistoryQuery, IApiError> {
  return { success: false, error: { status: 400, code: "invalid_input", message } };
}

function isGiven(value: unknown): boolean {
  return value != null && value !== "";
}

function toIso(date: Date): string | undefined {
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseDate(value: unknown, isEnd: boolean): string | undefined {
  if (typeof value === "number") {
    return toIso(ApiV1_dateFromEpoch(value));
  }
  if (typeof value !== "string") {
    return undefined;
  }
  if (dateOnly.test(value)) {
    const day = toIso(new Date(`${value}T00:00:00.000Z`));
    if (day == null || day.slice(0, 10) !== value) {
      return undefined;
    }
    return isEnd ? `${value}T23:59:59.999Z` : day;
  }
  const asNumber = Number(value);
  return toIso(value.trim() !== "" && !isNaN(asNumber) ? ApiV1_dateFromEpoch(asNumber) : new Date(value));
}

function parseLimit(value: unknown): number {
  const parsed = typeof value === "number" ? Math.trunc(value) : typeof value === "string" ? parseInt(value, 10) : NaN;
  return isNaN(parsed) ? defaultLimit : Math.max(1, Math.min(maxLimit, parsed));
}

function parseCursor(friendId: string, cursor: unknown): Record<string, NativeAttributeValue> | undefined {
  if (typeof cursor !== "string") {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (parsed == null || typeof parsed !== "object" || !("id" in parsed) || !("date" in parsed)) {
      return undefined;
    }
    const { id, date } = parsed;
    return Number.isSafeInteger(id) && typeof date === "string" && toIso(new Date(date)) != null
      ? { userId: friendId, id, date }
      : undefined;
  } catch (e) {
    return undefined;
  }
}

export function FriendHistoryQuery_parse(
  friendId: string,
  params: IFriendHistoryParams
): IEither<IFriendHistoryQuery, IApiError> {
  const startDate = isGiven(params.startDate) ? parseDate(params.startDate, false) : undefined;
  if (isGiven(params.startDate) && startDate == null) {
    return invalid(`Invalid startDate: ${String(params.startDate)}`);
  }
  const endDate = isGiven(params.endDate) ? parseDate(params.endDate, true) : undefined;
  if (isGiven(params.endDate) && endDate == null) {
    return invalid(`Invalid endDate: ${String(params.endDate)}`);
  }
  if (startDate != null && endDate != null && startDate > endDate) {
    return invalid("startDate is after endDate");
  }
  const startKey = isGiven(params.cursor) ? parseCursor(friendId, params.cursor) : undefined;
  if (isGiven(params.cursor) && startKey == null) {
    return invalid("Invalid cursor");
  }
  return { success: true, data: { startDate, endDate, limit: parseLimit(params.limit), startKey } };
}

export function FriendHistoryQuery_encodeCursor(
  key: Record<string, NativeAttributeValue> | undefined
): string | undefined {
  if (key == null || typeof key.id !== "number" || typeof key.date !== "string") {
    return undefined;
  }
  return Buffer.from(JSON.stringify({ id: key.id, date: key.date }), "utf8").toString("base64url");
}
