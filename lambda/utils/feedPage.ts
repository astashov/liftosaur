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

export function FeedPage_decodeCursor(value: string | undefined): IFeedCursor {
  if (value == null || value === "") {
    return { owners: {} };
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (parsed != null && typeof parsed === "object" && "owners" in parsed) {
      const owners = (parsed as { owners: unknown }).owners;
      if (owners != null && typeof owners === "object") {
        return { owners: owners as IFeedCursor["owners"] };
      }
    }
  } catch (e) {
    return { owners: {} };
  }
  return { owners: {} };
}

export function FeedPage_encodeCursor(cursor: IFeedCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
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

  const owners: IFeedCursor["owners"] = { ...args.previous.owners };
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
