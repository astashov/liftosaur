import { IHistoryRecord } from "../types";
import { IFeedWorkout } from "./feedWorkout";
import { Progress_isCurrent } from "./progress";
import { DateUtils_formatYYYYMMDD } from "../utils/date";

export type IFeedRow = { kind: "own"; record: IHistoryRecord } | { kind: "friend"; key: string; workout: IFeedWorkout };

export interface IFeedMergeArgs {
  own: IHistoryRecord[];
  friendKeys: string[];
  workouts: Partial<Record<string, IFeedWorkout>>;
  hasMoreFriends: boolean;
  hiddenOwners: string[];
  selfId?: string;
  ownFromDate?: string;
}

export function FeedMerge_ownFromDate(current: string | undefined, targetDate: string): string {
  return current == null || targetDate < current ? targetDate : current;
}

function rowDate(row: IFeedRow): string {
  return row.kind === "own" ? row.record.date : row.workout.date;
}

function rowId(row: IFeedRow): number {
  return row.kind === "own" ? row.record.id : row.workout.recordId;
}

export function FeedMerge_rowKey(row: IFeedRow): string {
  return row.kind === "own" ? `own:${row.record.id}` : row.key;
}

export function FeedMerge_rowDay(row: IFeedRow): string | undefined {
  if (row.kind === "own" && Progress_isCurrent(row.record)) {
    return undefined;
  }
  return DateUtils_formatYYYYMMDD(rowDate(row));
}

export function FeedMerge_dateHeaderKeys<T>(
  items: T[],
  key: (item: T) => string,
  day: (item: T) => string | undefined
): Set<string> {
  const keys = new Set<string>();
  let previous: string | undefined;
  items.forEach((item, index) => {
    const current = day(item);
    if (index === 0 || current == null || current !== previous) {
      keys.add(key(item));
    }
    previous = current;
  });
  return keys;
}

export function FeedMerge_rows(args: IFeedMergeArgs): IFeedRow[] {
  const loadedFriends: IFeedRow[] = [];
  for (const key of args.friendKeys) {
    const workout = args.workouts[key];
    if (workout != null) {
      loadedFriends.push({ kind: "friend", key, workout });
    }
  }
  let boundary: string | undefined;
  if (args.hasMoreFriends) {
    for (const row of loadedFriends) {
      const date = rowDate(row);
      if (boundary == null || date < boundary) {
        boundary = date;
      }
    }
  }
  const isSelfHidden = args.selfId != null && args.hiddenOwners.includes(args.selfId);
  const own: IFeedRow[] = isSelfHidden
    ? []
    : args.own
        .filter(
          (record) =>
            boundary == null || record.date >= boundary || (args.ownFromDate != null && record.date >= args.ownFromDate)
        )
        .map((record) => ({ kind: "own", record }));
  const friends = loadedFriends.filter(
    (row) => row.kind === "friend" && !args.hiddenOwners.includes(row.workout.ownerId)
  );
  return [...own, ...friends].sort((a, b) => {
    const byDate = rowDate(b).localeCompare(rowDate(a));
    return byDate !== 0 ? byDate : rowId(b) - rowId(a);
  });
}
