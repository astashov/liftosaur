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
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), undefined, true)).to.eql([]);
    expect(WorkoutSetPrevious_lines("workout", 0, target(3), { count: 0, bestByReps: {} }, false)).to.eql([]);
    expect(WorkoutSetPrevious_lines("workout", 1, target(3), prevData, false)).to.eql([]);
  });

  it("shows the best set for the target rep count, never on warmups", () => {
    expect(WorkoutSetPrevious_lines("workout", 2, target(5), prevData, false)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
    expect(WorkoutSetPrevious_lines("workout", 2, target(8), prevData, false)).to.eql([
      { label: "Best", set: best8, timestamp: 1500 },
    ]);
    expect(WorkoutSetPrevious_lines("warmup", 0, target(5), prevData, false)).to.eql([]);
  });

  it("shows the best AMRAP for an AMRAP set, whatever its target reps", () => {
    expect(WorkoutSetPrevious_lines("workout", 1, target(3, true), prevData, false)).to.eql([
      { label: "Best AMRAP", set: bestAmrap, timestamp: 1800 },
    ]);
  });

  it("adds the positional same-day line only in multiweek programs and only when it differs", () => {
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), prevData, true)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
      { label: "Same day", set: sameDay.sets[0], timestamp: 1000 },
    ]);
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), prevData, false)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
    expect(WorkoutSetPrevious_lines("workout", 5, target(5), prevData, true)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
  });

  it("skips the same-day line when it is the best set or reads the same", () => {
    const sameSet: IPrevExerciseData = { ...prevData, sameDayEntry: entry("s", [best5]), sameDayTimestamp: 2000 };
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), sameSet, true)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
    const sameNumbers: IPrevExerciseData = { ...prevData, sameDayEntry: entry("s", [set("x", 5, 205)]) };
    expect(WorkoutSetPrevious_lines("workout", 0, target(5), sameNumbers, true)).to.eql([
      { label: "Best", set: best5, timestamp: 2000 },
    ]);
  });
});
