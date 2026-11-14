import { IHistoryEntry, IHistoryRecord } from "../types";
import { IFollowPermissions } from "./follow";
import { FeedWorkout_projectSet } from "./feedWorkout";
import { emptyProgramId } from "./program";

const friendProgramId = "friend";

function projectEntry(entry: IHistoryEntry, permissions: IFollowPermissions): IHistoryEntry {
  return {
    vtype: entry.vtype,
    id: entry.id,
    index: entry.index,
    exercise: entry.exercise,
    sets: entry.sets.map(FeedWorkout_projectSet),
    warmupSets: entry.warmupSets.map(FeedWorkout_projectSet),
    superset: entry.superset,
    notes: permissions.notes ? entry.notes : undefined,
  };
}

export function FriendRecord_project(record: IHistoryRecord, permissions: IFollowPermissions): IHistoryRecord {
  return {
    vtype: record.vtype,
    id: record.id,
    date: record.date,
    startTime: record.startTime,
    endTime: record.endTime,
    intervals: record.intervals,
    programId: record.programId === emptyProgramId ? emptyProgramId : friendProgramId,
    programName: record.programName,
    dayName: record.dayName,
    day: record.day,
    week: record.week,
    dayInWeek: record.dayInWeek,
    entries: record.entries.map((entry) => projectEntry(entry, permissions)),
    notes: permissions.notes ? record.notes : undefined,
  };
}
