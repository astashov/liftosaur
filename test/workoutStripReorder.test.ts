import "mocha";
import { expect } from "chai";
import {
  WorkoutStripReorder_apply,
  WorkoutStripReorder_currentAfterMove,
  WorkoutStripReorder_dropIndex,
  WorkoutStripReorder_shift,
  WorkoutStripReorder_slots,
} from "../src/utils/workoutStripReorder";

describe("WorkoutStripReorder", () => {
  describe("dropIndex", () => {
    it("moves by whole tiles and rounds at the half tile", () => {
      expect(WorkoutStripReorder_dropIndex(2, 0, 60, 6)).to.eql(2);
      expect(WorkoutStripReorder_dropIndex(2, 29, 60, 6)).to.eql(2);
      expect(WorkoutStripReorder_dropIndex(2, 31, 60, 6)).to.eql(3);
      expect(WorkoutStripReorder_dropIndex(2, -95, 60, 6)).to.eql(0);
    });

    it("clamps to the ends of the strip", () => {
      expect(WorkoutStripReorder_dropIndex(4, 600, 60, 6)).to.eql(5);
      expect(WorkoutStripReorder_dropIndex(1, -600, 60, 6)).to.eql(0);
      expect(WorkoutStripReorder_dropIndex(0, 100, 0, 6)).to.eql(0);
    });
  });

  describe("shift", () => {
    it("shifts the tiles between the origin and the drop toward the origin", () => {
      expect(WorkoutStripReorder_shift(3, 1, 4, 60)).to.eql(-60);
      expect(WorkoutStripReorder_shift(4, 1, 4, 60)).to.eql(-60);
      expect(WorkoutStripReorder_shift(5, 1, 4, 60)).to.eql(0);
      expect(WorkoutStripReorder_shift(0, 1, 4, 60)).to.eql(0);
      expect(WorkoutStripReorder_shift(2, 4, 1, 60)).to.eql(60);
      expect(WorkoutStripReorder_shift(1, 4, 1, 60)).to.eql(60);
      expect(WorkoutStripReorder_shift(0, 4, 1, 60)).to.eql(0);
    });

    it("never shifts the dragged tile or anything when no drag is active", () => {
      expect(WorkoutStripReorder_shift(1, 1, 4, 60)).to.eql(0);
      expect(WorkoutStripReorder_shift(2, -1, -1, 60)).to.eql(0);
    });
  });

  describe("slots", () => {
    it("maps each id to its slot, with the move applied when one is given", () => {
      expect(WorkoutStripReorder_slots(["a", "b", "c"])).to.eql({ a: 0, b: 1, c: 2 });
      expect(WorkoutStripReorder_slots(["a", "b", "c"], 0, 2)).to.eql({ b: 0, c: 1, a: 2 });
      expect(WorkoutStripReorder_slots(["a", "b", "c"], 2, 0)).to.eql({ c: 0, a: 1, b: 2 });
      expect(WorkoutStripReorder_slots(["a", "b", "c"], 1, 1)).to.eql({ a: 0, b: 1, c: 2 });
    });
  });

  describe("apply", () => {
    const entries = [
      { id: "a", index: 0 },
      { id: "b", index: 1 },
      { id: "c", index: 2 },
    ];

    it("moves the entry, reindexes, and keeps the same exercise selected", () => {
      expect(WorkoutStripReorder_apply(entries, 2, 0, 2)).to.eql({
        entries: [
          { id: "b", index: 0 },
          { id: "c", index: 1 },
          { id: "a", index: 2 },
        ],
        currentEntryIndex: 1,
      });
      expect(WorkoutStripReorder_apply(entries, 0, 2, 0)?.currentEntryIndex).to.eql(1);
    });

    it("returns nothing for a drop in place or out of range", () => {
      expect(WorkoutStripReorder_apply(entries, 0, 1, 1)).to.eql(undefined);
      expect(WorkoutStripReorder_apply(entries, 0, -1, 1)).to.eql(undefined);
      expect(WorkoutStripReorder_apply(entries, 0, 0, 3)).to.eql(undefined);
    });
  });

  describe("currentAfterMove", () => {
    it("keeps the same exercise selected, wherever the move puts it", () => {
      expect(WorkoutStripReorder_currentAfterMove(1, 1, 3)).to.eql(3);
      expect(WorkoutStripReorder_currentAfterMove(2, 0, 3)).to.eql(1);
      expect(WorkoutStripReorder_currentAfterMove(3, 0, 3)).to.eql(2);
      expect(WorkoutStripReorder_currentAfterMove(1, 3, 0)).to.eql(2);
      expect(WorkoutStripReorder_currentAfterMove(0, 3, 0)).to.eql(1);
      expect(WorkoutStripReorder_currentAfterMove(0, 1, 3)).to.eql(0);
      expect(WorkoutStripReorder_currentAfterMove(4, 3, 0)).to.eql(4);
    });
  });
});
