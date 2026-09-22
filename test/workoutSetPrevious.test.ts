import "mocha";
import { expect } from "chai";
import { IHistoryEntry, ISet } from "../src/types";
import { IPrevExerciseData } from "../src/models/history";
import { WorkoutSetPrevious_lines } from "../src/utils/workoutSetPrevious";

function set(id: string, reps: number, weight: number, isAmrap?: boolean): ISet {
  return {
    vtype: "set",
    id,
    index: 0,
    reps,
    isAmrap,
    isCompleted: true,
    completedReps: reps,
    completedWeight: { value: weight, unit: "lb" },
  };
}

function target(reps: number, isAmrap?: boolean): ISet {
  return { vtype: "set", id: "t", index: 0, reps, isAmrap, isCompleted: false };
}

function entry(id: string, sets: ISet[], warmupSets: ISet[] = []): IHistoryEntry {
  return { vtype: "history_entry", index: 0, id, exercise: { id: "squat" }, warmupSets, sets };
}

describe("WorkoutSetPrevious", () => {
  const best5 = set("b5", 5, 205);
  const best8 = set("b8", 8, 165);
  const bestAmrap = set("ba", 11, 185, true);
  const sameDay = entry("same", [set("c", 10, 95), set("d", 8, 100)]);
  const prevData: IPrevExerciseData = {
    bestByReps: { 5: { set: best5, timestamp: 2000 }, 8: { set: best8, timestamp: 1500 } },
    bestAmrap: { set: bestAmrap, timestamp: 1800 },
    sameDayEntry: sameDay,
    sameDayTimestamp: 1000,
    count: 2,
  };

  it("returns nothing without history or without a best for that rep count", () => {
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), undefined, true, false)).to.eql([]);
    expect(WorkoutSetPrevious_lines("workout", 0, target(3), { count: 0, bestByReps: {} }, false, false)).to.eql([]);
    expect(WorkoutSetPrevious_lines("workout", 1, target(3), prevData, false, false)).to.eql([]);
  });

  it("shows the best set for the target rep count, never on warmups", () => {
    expect(WorkoutSetPrevious_lines("workout", 2, target(5), prevData, false, false)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
    expect(WorkoutSetPrevious_lines("workout", 2, target(8), prevData, false, false)).to.eql([
      { label: "Best", set: best8, timestamp: 1500 },
    ]);
    expect(WorkoutSetPrevious_lines("warmup", 0, target(5), prevData, false, false)).to.eql([]);
  });

  it("shows the best AMRAP for an AMRAP set, whatever its target reps", () => {
    expect(WorkoutSetPrevious_lines("workout", 1, target(3, true), prevData, false, false)).to.eql([
      { label: "Best AMRAP", set: bestAmrap, timestamp: 1800 },
    ]);
  });

  it("adds the positional same-day line only in multiweek programs and only when it differs", () => {
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), prevData, true, false)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
      { label: "Same day", set: sameDay.sets[0], timestamp: 1000 },
    ]);
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), prevData, false, false)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
    expect(WorkoutSetPrevious_lines("workout", 5, target(5), prevData, true, false)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
  });

  it("skips the same-day line when it is the best set or reads the same", () => {
    const sameSet: IPrevExerciseData = { ...prevData, sameDayEntry: entry("s", [best5]), sameDayTimestamp: 2000 };
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), sameSet, true, false)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
    const sameNumbers: IPrevExerciseData = { ...prevData, sameDayEntry: entry("s", [set("x", 5, 205)]) };
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), sameNumbers, true, false)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
  });

  describe("last", () => {
    const lastWarmup = set("lw", 5, 45);
    const last = entry("last", [set("l0", 5, 200), set("l1", 5, 190)], [lastWarmup]);
    const withLast: IPrevExerciseData = { ...prevData, lastEntry: last, lastEntryTimestamp: 3000 };

    it("comes first and takes the set at the same position", () => {
      expect(WorkoutSetPrevious_lines("workout", 1, target(5), withLast, true, false)).to.eql([
        { label: "Last", set: last.sets[1], timestamp: 3000 },
        { label: "Best", set: best5, timestamp: 2000 },
        { label: "Same day", set: sameDay.sets[1], timestamp: 1000 },
      ]);
    });

    it("is hidden on work sets when the previous set column already shows it", () => {
      expect(WorkoutSetPrevious_lines("workout", 1, target(5), withLast, false, true)).to.eql([
        { label: "Best", set: best5, timestamp: 2000 },
      ]);
    });

    it("stays on warmups, which the previous set column leaves empty", () => {
      expect(WorkoutSetPrevious_lines("warmup", 0, target(5), withLast, false, true)).to.eql([
        { label: "Last", set: lastWarmup, timestamp: 3000 },
      ]);
    });

    it("is hidden when it is the same set as the best or the same-day line", () => {
      const lastIsBest: IPrevExerciseData = { ...withLast, lastEntry: entry("l", [best5]) };
      expect(WorkoutSetPrevious_lines("workout", 0, target(5), lastIsBest, false, false)).to.eql([
        { label: "Best", set: best5, timestamp: 2000 },
      ]);
      const lastIsSameDay: IPrevExerciseData = { ...withLast, lastEntry: sameDay };
      expect(WorkoutSetPrevious_lines("workout", 0, target(5), lastIsSameDay, true, false)).to.eql([
        { label: "Best", set: best5, timestamp: 2000 },
        { label: "Same day", set: sameDay.sets[0], timestamp: 1000 },
      ]);
    });

    it("still shows when an older best has the same numbers", () => {
      const sameNumbers: IPrevExerciseData = { ...withLast, lastEntry: entry("l", [set("x", 5, 205)]) };
      expect(WorkoutSetPrevious_lines("workout", 0, target(5), sameNumbers, false, false)).to.eql([
        { label: "Last", set: sameNumbers.lastEntry?.sets[0], timestamp: 3000 },
        { label: "Best", set: best5, timestamp: 2000 },
      ]);
    });
  });
});
