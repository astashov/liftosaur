import { IHistoryRecord } from "../types";
import { IFeedWorkout } from "./feedWorkout";

export type IFeedRow = { kind: "own"; record: IHistoryRecord } | { kind: "friend"; key: string; workout: IFeedWorkout };

export interface IFeedMergeArgs {
  own: IHistoryRecord[];
  friendKeys: string[];
  workouts: Partial<Record<string, IFeedWorkout>>;
  hasMoreFriends: boolean;
  hiddenOwners: string[];
  selfId?: string;
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
        .filter((record) => boundary == null || record.date >= boundary)
        .map((record) => ({ kind: "own", record }));
  const friends = loadedFriends.filter(
    (row) => row.kind === "friend" && !args.hiddenOwners.includes(row.workout.ownerId)
  );
  return [...own, ...friends].sort((a, b) => {
    const byDate = rowDate(b).localeCompare(rowDate(a));
    return byDate !== 0 ? byDate : rowId(b) - rowId(a);
  });
}
