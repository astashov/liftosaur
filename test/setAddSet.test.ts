import "mocha";
import { expect } from "chai";
import { Reps_addSet } from "../src/models/set";
import { ISet } from "../src/types";
import { Weight_build } from "../src/models/weight";

function set(overrides: Partial<ISet>): ISet {
  return { vtype: "set", id: "prev", index: 0, isUnilateral: false, reps: 5, isCompleted: true, ...overrides };
}

describe("Reps_addSet", () => {
  it("converts a set copied from the previous workout to the equipment unit", () => {
    const previous = set({
      weight: Weight_build(45, "lb"),
      originalWeight: Weight_build(0, "lb"),
      completedWeight: Weight_build(70, "lb"),
    });
    const added = Reps_addSet([], false, previous, false, "kg");
    expect(added[0].weight).to.deep.equal(Weight_build(20.5, "kg"));
    expect(added[0].originalWeight).to.deep.equal(Weight_build(0, "kg"));
    expect(added[0].completedWeight).to.equal(undefined);
  });

  it("keeps the unit of a set copied from the same workout", () => {
    const current = set({ weight: Weight_build(45, "lb") });
    const added = Reps_addSet([current], false, undefined, false, "kg");
    expect(added[1].weight).to.deep.equal(Weight_build(45, "lb"));
  });
});
