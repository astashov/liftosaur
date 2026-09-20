import "mocha";
import { expect } from "chai";
import { IHistoryEntry, ISet } from "../src/types";
import { WorkoutSetExpansion_expanded, WorkoutSetExpansion_toggle } from "../src/utils/workoutSetExpansion";

function set(id: string, isCompleted: boolean): ISet {
  return { vtype: "set", id, index: 0, reps: 5, isCompleted };
}

function entry(warmups: ISet[], sets: ISet[]): IHistoryEntry {
  return { vtype: "history_entry", index: 0, id: "e1", exercise: { id: "squat" }, warmupSets: warmups, sets };
}

describe("WorkoutSetExpansion", () => {
  const e = entry([set("w1", true), set("w2", false)], [set("s1", false), set("s2", false)]);

  it("expands the next unfinished set by default, warmups first", () => {
    expect(WorkoutSetExpansion_expanded(e, undefined)).to.eql({ mode: "warmup", setIndex: 1 });
    const allWarmupsDone = entry([set("w1", true)], [set("s1", true), set("s2", false)]);
    expect(WorkoutSetExpansion_expanded(allWarmupsDone, undefined)).to.eql({ mode: "workout", setIndex: 1 });
  });

  it("expands nothing when every set is done or the user collapsed", () => {
    const done = entry([], [set("s1", true)]);
    expect(WorkoutSetExpansion_expanded(done, undefined)).to.eql(undefined);
    expect(WorkoutSetExpansion_expanded(e, { kind: "collapsed", completedCount: 1 })).to.eql(undefined);
  });

  it("drops a collapse once a set is completed, so the next set expands again", () => {
    const collapsed = WorkoutSetExpansion_toggle(e, undefined, "warmup", 1);
    expect(collapsed).to.eql({ kind: "collapsed", completedCount: 1 });
    const afterCompletion = entry([set("w1", true), set("w2", true)], [set("s1", false), set("s2", false)]);
    expect(WorkoutSetExpansion_expanded(afterCompletion, collapsed)).to.eql({ mode: "workout", setIndex: 0 });
  });

  it("follows an override by set id, so reindexing does not move it", () => {
    const override = { kind: "expanded" as const, setId: "s2", wasCompleted: false };
    expect(WorkoutSetExpansion_expanded(e, override)).to.eql({ mode: "workout", setIndex: 1 });
    const reordered = entry([], [set("s2", false), set("s1", false)]);
    expect(WorkoutSetExpansion_expanded(reordered, override)).to.eql({ mode: "workout", setIndex: 0 });
  });

  it("expires the override when the set's completion changes or the set is gone", () => {
    const override = { kind: "expanded" as const, setId: "s1", wasCompleted: false };
    const completed = entry([], [set("s1", true), set("s2", false)]);
    expect(WorkoutSetExpansion_expanded(completed, override)).to.eql({ mode: "workout", setIndex: 1 });
    const removed = entry([], [set("s2", false)]);
    expect(WorkoutSetExpansion_expanded(removed, override)).to.eql({ mode: "workout", setIndex: 0 });
  });

  it("toggles: tapping the expanded row collapses, tapping another expands it", () => {
    expect(WorkoutSetExpansion_toggle(e, undefined, "warmup", 1)).to.eql({ kind: "collapsed", completedCount: 1 });
    expect(WorkoutSetExpansion_toggle(e, undefined, "workout", 1)).to.eql({
      kind: "expanded",
      setId: "s2",
      wasCompleted: false,
    });
    const collapsed = { kind: "collapsed" as const, completedCount: 1 };
    expect(WorkoutSetExpansion_toggle(e, collapsed, "warmup", 0)).to.eql({
      kind: "expanded",
      setId: "w1",
      wasCompleted: true,
    });
    expect(WorkoutSetExpansion_toggle(e, collapsed, "workout", 9)).to.eql(collapsed);
  });
});
