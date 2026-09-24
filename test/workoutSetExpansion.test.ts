import "mocha";
import { expect } from "chai";
import { IHistoryEntry, ISet } from "../src/types";
import {
  WorkoutSetExpansion_expanded,
  WorkoutSetExpansion_shouldCollapseSetsAfterComplete,
  WorkoutSetExpansion_toggle,
} from "../src/utils/workoutSetExpansion";

function set(id: string, isCompleted: boolean): ISet {
  return { vtype: "set", id, index: 0, reps: 5, isCompleted };
}

function entry(warmups: ISet[], sets: ISet[]): IHistoryEntry {
  return { vtype: "history_entry", index: 0, id: "e1", exercise: { id: "squat" }, warmupSets: warmups, sets };
}

describe("WorkoutSetExpansion", () => {
  const e = entry([set("w1", true), set("w2", false)], [set("s1", false), set("s2", false)]);

  it("expands the next unfinished set by default, warmups first", () => {
    expect(WorkoutSetExpansion_expanded(e, undefined, false)).to.eql({ mode: "warmup", setIndex: 1 });
    const allWarmupsDone = entry([set("w1", true)], [set("s1", true), set("s2", false)]);
    expect(WorkoutSetExpansion_expanded(allWarmupsDone, undefined, false)).to.eql({ mode: "workout", setIndex: 1 });
  });

  it("expands nothing when every set is done or the user collapsed", () => {
    const done = entry([], [set("s1", true)]);
    expect(WorkoutSetExpansion_expanded(done, undefined, false)).to.eql(undefined);
    expect(WorkoutSetExpansion_expanded(e, { kind: "collapsed", completedCount: 1 }, false)).to.eql(undefined);
  });

  it("drops a collapse once a set is completed, so the next set expands again", () => {
    const collapsed = WorkoutSetExpansion_toggle(e, undefined, false, "warmup", 1);
    expect(collapsed).to.eql({ kind: "collapsed", completedCount: 1 });
    const afterCompletion = entry([set("w1", true), set("w2", true)], [set("s1", false), set("s2", false)]);
    expect(WorkoutSetExpansion_expanded(afterCompletion, collapsed, false)).to.eql({ mode: "workout", setIndex: 0 });
  });

  it("follows an override by set id, so reindexing does not move it", () => {
    const override = { kind: "expanded" as const, setId: "s2", wasCompleted: false };
    expect(WorkoutSetExpansion_expanded(e, override, false)).to.eql({ mode: "workout", setIndex: 1 });
    const reordered = entry([], [set("s2", false), set("s1", false)]);
    expect(WorkoutSetExpansion_expanded(reordered, override, false)).to.eql({ mode: "workout", setIndex: 0 });
  });

  it("expires the override when the set's completion changes or the set is gone", () => {
    const override = { kind: "expanded" as const, setId: "s1", wasCompleted: false };
    const completed = entry([], [set("s1", true), set("s2", false)]);
    expect(WorkoutSetExpansion_expanded(completed, override, false)).to.eql({ mode: "workout", setIndex: 1 });
    const removed = entry([], [set("s2", false)]);
    expect(WorkoutSetExpansion_expanded(removed, override, false)).to.eql({ mode: "workout", setIndex: 0 });
  });

  it("toggles: tapping the expanded row collapses, tapping another expands it", () => {
    expect(WorkoutSetExpansion_toggle(e, undefined, false, "warmup", 1)).to.eql({
      kind: "collapsed",
      completedCount: 1,
    });
    expect(WorkoutSetExpansion_toggle(e, undefined, false, "workout", 1)).to.eql({
      kind: "expanded",
      setId: "s2",
      wasCompleted: false,
    });
    const collapsed = { kind: "collapsed" as const, completedCount: 1 };
    expect(WorkoutSetExpansion_toggle(e, collapsed, false, "warmup", 0)).to.eql({
      kind: "expanded",
      setId: "w1",
      wasCompleted: true,
    });
    expect(WorkoutSetExpansion_toggle(e, collapsed, false, "workout", 9)).to.eql(collapsed);
  });

  it("in collapse mode expands only the row the user tapped, until its completion changes", () => {
    expect(WorkoutSetExpansion_expanded(e, undefined, true)).to.eql(undefined);
    const tapped = WorkoutSetExpansion_toggle(e, undefined, true, "workout", 1);
    expect(tapped).to.eql({ kind: "expanded", setId: "s2", wasCompleted: false });
    expect(WorkoutSetExpansion_expanded(e, tapped, true)).to.eql({ mode: "workout", setIndex: 1 });
    const completed = entry([set("w1", true), set("w2", false)], [set("s1", false), set("s2", true)]);
    expect(WorkoutSetExpansion_expanded(completed, tapped, true)).to.eql(undefined);
  });

  it("turns collapse mode on when a set is checked with no row expanded", () => {
    expect(WorkoutSetExpansion_shouldCollapseSetsAfterComplete(e, undefined, false, "warmup", 1)).to.eql(true);
    expect(WorkoutSetExpansion_shouldCollapseSetsAfterComplete(e, undefined, true, "workout", 0)).to.eql(true);
  });

  it("turns collapse mode off when the expanded row is checked", () => {
    const expanded = { mode: "workout" as const, setIndex: 0 };
    expect(WorkoutSetExpansion_shouldCollapseSetsAfterComplete(e, expanded, true, "workout", 0)).to.eql(false);
    expect(WorkoutSetExpansion_shouldCollapseSetsAfterComplete(e, expanded, false, "workout", 0)).to.eql(false);
  });

  it("keeps collapse mode when another row is checked, a set is unchecked, or the set is gone", () => {
    const expanded = { mode: "workout" as const, setIndex: 0 };
    expect(WorkoutSetExpansion_shouldCollapseSetsAfterComplete(e, expanded, true, "workout", 1)).to.eql(true);
    expect(WorkoutSetExpansion_shouldCollapseSetsAfterComplete(e, expanded, false, "workout", 1)).to.eql(false);
    expect(WorkoutSetExpansion_shouldCollapseSetsAfterComplete(e, undefined, false, "warmup", 0)).to.eql(false);
    expect(WorkoutSetExpansion_shouldCollapseSetsAfterComplete(e, undefined, true, "workout", 9)).to.eql(true);
  });
});
