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

    it("keeps the heaviest set per completed rep count and the best AMRAP by estimated max", () => {
      const heavy: ISet = {
        vtype: "set",
        id: "h",
        index: 0,
        reps: 5,
        isCompleted: true,
        completedReps: 5,
        completedWeight: { value: 205, unit: "lb" },
      };
      const light: ISet = { ...heavy, id: "l", completedWeight: { value: 135, unit: "lb" } };
      const heavyAgain: ISet = { ...heavy, id: "h2" };
      const eight: ISet = { ...heavy, id: "e", completedReps: 8, completedWeight: { value: 165, unit: "lb" } };
      const amrapLow: ISet = {
        ...heavy,
        id: "a1",
        isAmrap: true,
        completedReps: 8,
        completedWeight: { value: 185, unit: "lb" },
      };
      const amrapHigh: ISet = {
        ...heavy,
        id: "a2",
        isAmrap: true,
        completedReps: 12,
        completedWeight: { value: 185, unit: "lb" },
      };
      const history = [
        buildRecord(now - 10 * day, [{ ...buildEntry(squat, true), sets: [heavy, amrapHigh] }]),
        buildRecord(now - 5 * day, [{ ...buildEntry(squat, true), sets: [light, eight] }]),
        buildRecord(now - 3 * day, [{ ...buildEntry(squat, true), sets: [heavyAgain, amrapLow] }]),
        buildRecord(now + 1 * day, [
          { ...buildEntry(squat, true), sets: [{ ...heavy, id: "f", completedWeight: { value: 300, unit: "lb" } }] },
        ]),
      ];
      const data = History_buildPrevExerciseData(history, now)[Exercise_toKey(squat)];
      expect(data.bestByReps[5]?.set.id).to.eql("h2");
      expect(data.bestByReps[5]?.timestamp).to.eql(now - 3 * day);
      expect(data.bestByReps[8]?.set.id).to.eql("a1");
      expect(data.bestByReps[12]?.set.id).to.eql("a2");
      expect(data.bestAmrap?.set.id).to.eql("a2");
    });

    it("skips non-started entries when picking lastEntry", () => {
      const history = [
        buildRecord(now - 5 * day, [buildEntry(squat, true)]),
        buildRecord(now - 1 * day, [buildEntry(squat, false)]),
      ];
      const data = History_buildPrevExerciseData(history, now);
      expect(data[Exercise_toKey(squat)].lastEntryTimestamp).to.eql(now - 5 * day);
    });

    it("picks lastWarmupEntry by completed warmups, apart from the work sets", () => {
      const history = [
        buildRecord(now - 5 * day, [{ ...buildEntry(squat, false), warmupSets: [buildSet(true)] }]),
        buildRecord(now - 1 * day, [{ ...buildEntry(squat, true), warmupSets: [buildSet(false)] }]),
      ];
      const data = History_buildPrevExerciseData(history, now);
      expect(data[Exercise_toKey(squat)].lastWarmupEntryTimestamp).to.eql(now - 5 * day);
      expect(data[Exercise_toKey(squat)].lastEntryTimestamp).to.eql(now - 1 * day);
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

    it("matches the same week and day in week, from an earlier cycle, never another week", () => {
      const history = [
        { ...buildRecord(now - 30 * day, [buildEntry(squat, true)]), day: 8, week: 3, dayInWeek: 2 },
        { ...buildRecord(now - 7 * day, [buildEntry(squat, true)]), day: 5, week: 2, dayInWeek: 2 },
        { ...buildRecord(now - 3 * day, [buildEntry(squat, true)]), day: 6, week: 2, dayInWeek: 3 },
        { ...buildRecord(now - 1 * day, [buildEntry(squat, false)]), day: 8, week: 3, dayInWeek: 2 },
      ];
      const sameDay = { programId: "p", day: 8, week: 3, dayInWeek: 2 };
      const data = History_buildPrevExerciseData(history, now, sameDay);
      expect(data[Exercise_toKey(squat)].lastEntryTimestamp).to.eql(now - 3 * day);
      expect(data[Exercise_toKey(squat)].sameDayTimestamp).to.eql(now - 30 * day);
    });

    it("compares the absolute day when a record has no week, and ignores other programs", () => {
      const history = [
        { ...buildRecord(now - 21 * day, [buildEntry(squat, true)]), day: 2 },
        { ...buildRecord(now - 7 * day, [buildEntry(squat, true)]), day: 5 },
        { ...buildRecord(now - 2 * day, [buildEntry(squat, true)]), day: 5, programId: "other" },
        { ...buildRecord(now + 1 * day, [buildEntry(squat, true)]), day: 5 },
      ];
      const data = History_buildPrevExerciseData(history, now, { programId: "p", day: 5, week: 2, dayInWeek: 2 });
      expect(data[Exercise_toKey(squat)].sameDayTimestamp).to.eql(now - 7 * day);
      const without = History_buildPrevExerciseData(history, now);
      expect(without[Exercise_toKey(squat)].sameDayEntry).to.eql(undefined);
    });

    it("with onlyKeys, builds just those exercises and gives them the same data as a full build", () => {
      const deadlift: IExerciseType = { id: "deadlift", equipment: "barbell" };
      const history = [
        buildRecord(now - 9 * day, [buildEntry(squat, true), buildEntry(deadlift, true)]),
        buildRecord(now - 4 * day, [buildEntry(bench, true), buildEntry(squat, true)]),
        buildRecord(now - 2 * day, [buildEntry(deadlift, true), buildEntry(bench, true)]),
        buildRecord(now + 1 * day, [buildEntry(squat, true)]),
      ];
      const sameDay = { programId: "p", day: 1 };
      const full = History_buildPrevExerciseData(history, now, sameDay);
      const onlyKeys = new Set([Exercise_toKey(squat), Exercise_toKey(bench)]);
      const limited = History_buildPrevExerciseData(history, now, sameDay, onlyKeys);

      expect(Object.keys(limited).sort()).to.eql([...onlyKeys].sort());
      expect(limited[Exercise_toKey(deadlift)]).to.eql(undefined);
      for (const key of onlyKeys) {
        expect(limited[key]).to.eql(full[key]);
      }
    });
  });
});
