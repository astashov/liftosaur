import "mocha";
import { expect } from "chai";
import { History_getMaxWeightSetFromEntry, History_buildPrevExerciseData } from "../src/models/history";
import { IHistoryEntry, IHistoryRecord, ISet, IExerciseType } from "../src/types";
import { UidFactory_generateUid } from "../src/utils/generator";
import { Exercise_toKey } from "../src/models/exercise";

function buildSet(completed: boolean): ISet {
  return {
    vtype: "set",
    id: UidFactory_generateUid(6),
    index: 0,
    reps: 5,
    weight: { value: 100, unit: "lb" },
    originalWeight: { value: 100, unit: "lb" },
    isUnilateral: false,
    isCompleted: completed,
    completedReps: completed ? 5 : undefined,
    completedWeight: completed ? { value: 100, unit: "lb" } : undefined,
  };
}

function buildEntry(exercise: IExerciseType, completed: boolean, notes?: string): IHistoryEntry {
  return {
    vtype: "history_entry",
    index: 0,
    id: UidFactory_generateUid(6),
    exercise,
    sets: [buildSet(completed)],
    warmupSets: [],
    notes,
  };
}

function buildRecord(time: number, entries: IHistoryEntry[]): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(time).toISOString(),
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day 1",
    entries,
    startTime: time,
    endTime: time,
    id: time,
  };
}

describe("History", () => {
  describe(".getMaxSet()", () => {
    it("returns the set with the highest completed reps", () => {
      const entry: IHistoryEntry = {
        vtype: "history_entry",
        index: 0,
        id: UidFactory_generateUid(6),
        exercise: { id: "squat" },
        sets: [
          {
            vtype: "set",
            id: UidFactory_generateUid(6),
            index: 0,
            reps: 10,
            completedReps: 10,
            weight: { value: 10, unit: "kg" },
            isUnilateral: false,
            originalWeight: { value: 10, unit: "kg" },
          },
          {
            vtype: "set",
            id: UidFactory_generateUid(6),
            index: 1,
            reps: 5,
            completedReps: 5,
            isUnilateral: false,
            weight: { value: 50, unit: "kg" },
            originalWeight: { value: 50, unit: "kg" },
          },
          {
            vtype: "set",
            index: 2,
            id: UidFactory_generateUid(6),
            reps: 5,
            completedReps: 6,
            isAmrap: true,
            isUnilateral: false,
            weight: { value: 50, unit: "kg" },
            originalWeight: { value: 50, unit: "kg" },
          },
        ],
        warmupSets: [],
      };
      const maxSet = History_getMaxWeightSetFromEntry(entry);
      expect(maxSet?.weight?.value).to.eql(50);
      expect(maxSet?.completedReps).to.eql(6);
    });
  });

  describe(".buildPrevExerciseData()", () => {
    const squat: IExerciseType = { id: "squat", equipment: "barbell" };
    const bench: IExerciseType = { id: "benchPress", equipment: "barbell" };
    const now = 1_000_000_000_000;
    const day = 24 * 60 * 60 * 1000;

    it("returns the most recent started entry before beforeTime per exercise", () => {
      const history = [
        buildRecord(now - 10 * day, [buildEntry(squat, true)]),
        buildRecord(now - 3 * day, [buildEntry(squat, true)]),
        buildRecord(now - 1 * day, [buildEntry(bench, true)]),
      ];
      const data = History_buildPrevExerciseData(history, now);
      expect(data[Exercise_toKey(squat)].lastEntryTimestamp).to.eql(now - 3 * day);
      expect(data[Exercise_toKey(squat)].count).to.eql(2);
      expect(data[Exercise_toKey(bench)].count).to.eql(1);
    });

    it("ignores records at or after beforeTime for lastEntry but still counts them", () => {
      const history = [
        buildRecord(now - 5 * day, [buildEntry(squat, true)]),
        buildRecord(now + 1 * day, [buildEntry(squat, true)]),
      ];
      const data = History_buildPrevExerciseData(history, now);
      expect(data[Exercise_toKey(squat)].lastEntryTimestamp).to.eql(now - 5 * day);
      expect(data[Exercise_toKey(squat)].count).to.eql(2);
    });

    it("skips non-started entries when picking lastEntry", () => {
      const history = [
        buildRecord(now - 5 * day, [buildEntry(squat, true)]),
        buildRecord(now - 1 * day, [buildEntry(squat, false)]),
      ];
      const data = History_buildPrevExerciseData(history, now);
      expect(data[Exercise_toKey(squat)].lastEntryTimestamp).to.eql(now - 5 * day);
    });

    it("only picks notes within the last two months", () => {
      const history = [
        buildRecord(now - 70 * day, [buildEntry(squat, true, "old note")]),
        buildRecord(now - 10 * day, [buildEntry(squat, true, "recent note")]),
      ];
      const data = History_buildPrevExerciseData(history, now);
      expect(data[Exercise_toKey(squat)].lastNote).to.eql("recent note");

      const onlyOld = History_buildPrevExerciseData(
        [buildRecord(now - 70 * day, [buildEntry(squat, true, "old note")])],
        now
      );
      expect(onlyOld[Exercise_toKey(squat)].lastNote).to.eql(undefined);
    });

    it("counts a record once even if the exercise appears in multiple entries", () => {
      const history = [buildRecord(now - 5 * day, [buildEntry(squat, true), buildEntry(squat, true)])];
      const data = History_buildPrevExerciseData(history, now);
      expect(data[Exercise_toKey(squat)].count).to.eql(1);
    });
  });
});
