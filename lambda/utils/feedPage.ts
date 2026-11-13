import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import { NativeAttributeValue } from "@aws-sdk/lib-dynamodb";
import { IHistoryRecord } from "../../src/types";

export type IFeedOwnerPosition = Record<string, NativeAttributeValue> | "done";

export interface IFeedCursor {
  owners: Partial<Record<string, IFeedOwnerPosition>>;
}

export interface IFeedOwnerResult {
  ownerId: string;
  records: IHistoryRecord[];
  lastEvaluatedKey?: Record<string, NativeAttributeValue>;
  failed: boolean;
}

export interface IFeedWinner {
  ownerId: string;
  record: IHistoryRecord;
}

export interface IFeedMergeResult {
  winners: IFeedWinner[];
  next: IFeedCursor;
  hasMore: boolean;
  failedOwners: string[];
}

type ICompactPosition = [ownerId: string, id: number, date: string];

interface ICompactCursor {
  p: ICompactPosition[];
  d: string[];
}

function isCompactPosition(value: unknown): value is ICompactPosition {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number" &&
    typeof value[2] === "string"
  );
}

function isCompactCursor(value: unknown): value is ICompactCursor {
  if (value == null || typeof value !== "object" || !("p" in value) || !("d" in value)) {
    return false;
  }
  const { p, d } = value;
  return Array.isArray(p) && p.every(isCompactPosition) && Array.isArray(d) && d.every((o) => typeof o === "string");
}

export function FeedPage_decodeCursor(value: string | undefined): IFeedCursor {
  if (value == null || value === "") {
    return { owners: {} };
  }
  try {
    const parsed: unknown = JSON.parse(strFromU8(inflateSync(Buffer.from(value, "base64url"))));
    if (!isCompactCursor(parsed)) {
      return { owners: {} };
    }
    const owners: IFeedCursor["owners"] = {};
    for (const [ownerId, id, date] of parsed.p) {
      owners[ownerId] = { userId: ownerId, id, date };
    }
    for (const ownerId of parsed.d) {
      owners[ownerId] = "done";
    }
    return { owners };
  } catch (e) {
    return { owners: {} };
  }
}

export function FeedPage_encodeCursor(cursor: IFeedCursor): string {
  const compact: ICompactCursor = { p: [], d: [] };
  for (const ownerId of Object.keys(cursor.owners)) {
    const position = cursor.owners[ownerId];
    if (position === "done") {
      compact.d.push(ownerId);
    } else if (position != null && typeof position.id === "number" && typeof position.date === "string") {
      compact.p.push([ownerId, position.id, position.date]);
    }
  }
  return Buffer.from(deflateSync(strToU8(JSON.stringify(compact)), { level: 9 })).toString("base64url");
}

export function FeedPage_isOwnerDone(cursor: IFeedCursor, ownerId: string): boolean {
  return cursor.owners[ownerId] === "done";
}

export function FeedPage_startKey(
  cursor: IFeedCursor,
  ownerId: string
): Record<string, NativeAttributeValue> | undefined {
  const position = cursor.owners[ownerId];
  return position == null || position === "done" ? undefined : position;
}

function compareWinners(a: IFeedWinner, b: IFeedWinner): number {
  const byDate = b.record.date.localeCompare(a.record.date);
  if (byDate !== 0) {
    return byDate;
  }
  const byOwner = a.ownerId.localeCompare(b.ownerId);
  return byOwner !== 0 ? byOwner : b.record.id - a.record.id;
}

function positionAfter(ownerId: string, record: IHistoryRecord): Record<string, NativeAttributeValue> {
  return { userId: ownerId, id: record.id, date: record.date };
}

export function FeedPage_merge(args: {
  results: IFeedOwnerResult[];
  previous: IFeedCursor;
  activeOwners: string[];
  limit: number;
}): IFeedMergeResult {
  const candidates: IFeedWinner[] = [];
  for (const result of args.results) {
    if (!result.failed) {
      for (const record of result.records) {
        candidates.push({ ownerId: result.ownerId, record });
      }
    }
  }
  candidates.sort(compareWinners);
  const winners = candidates.slice(0, args.limit);

  const owners: IFeedCursor["owners"] = {};
  for (const ownerId of args.activeOwners) {
    const position = args.previous.owners[ownerId];
    if (position != null) {
      owners[ownerId] = position;
    }
  }
  const failedOwners: string[] = [];
  for (const result of args.results) {
    if (result.failed) {
      failedOwners.push(result.ownerId);
      continue;
    }
    const taken = winners.filter((w) => w.ownerId === result.ownerId);
    const lastTaken = taken[taken.length - 1];
    if (taken.length === result.records.length) {
      owners[result.ownerId] = result.lastEvaluatedKey ?? "done";
    } else if (lastTaken != null) {
      owners[result.ownerId] = positionAfter(result.ownerId, lastTaken.record);
    }
  }
  const hasMore =
    failedOwners.length > 0 ||
    Object.keys(owners).some((ownerId) => owners[ownerId] !== "done") ||
    candidates.length > winners.length;
  return { winners, next: { owners }, hasMore, failedOwners };
}
