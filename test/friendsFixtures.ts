import { IHistoryEntry, IHistoryRecord, ISet } from "../src/types";

export function FriendsFixtures_set(index: number, overrides: Partial<ISet> = {}): ISet {
  return {
    vtype: "set",
    index,
    id: `set-${index}`,
    reps: 5,
    weight: { value: 100, unit: "lb" },
    isCompleted: true,
    completedReps: 5,
    completedWeight: { value: 100, unit: "lb" },
    ...overrides,
  };
}

export function FriendsFixtures_entry(overrides: Partial<IHistoryEntry> = {}): IHistoryEntry {
  return {
    vtype: "history_entry",
    exercise: { id: "benchPress", equipment: "barbell" },
    sets: [FriendsFixtures_set(0), FriendsFixtures_set(1)],
    warmupSets: [],
    index: 0,
    id: "entry-0",
    ...overrides,
  };
}

export function FriendsFixtures_record(id: number, date: string, overrides: Partial<IHistoryRecord> = {}): IHistoryRecord {
  return {
    vtype: "history_record",
    id,
    date,
    programId: "program",
    programName: "GZCLP",
    day: 1,
    dayName: "Day 1",
    startTime: id,
    endTime: id + 60 * 60 * 1000,
    entries: [FriendsFixtures_entry()],
    ...overrides,
  };
}
