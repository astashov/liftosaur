import "mocha";
import { expect } from "chai";
import { History_getMax1RMSet, History_getMaxWeightSet } from "../src/models/history";
import { ISet, IWeight } from "../src/types";
import { CollectionUtils_sort } from "../src/utils/collection";
import { Weight_build, Weight_compare, Weight_getOneRepMax } from "../src/models/weight";
import { Reps_avgUnilateralCompletedReps } from "../src/models/set";

// The sort-based code the scan replaced. The scan must return the same object, ties included.
function sortedFirst(sets: ISet[], weightOf: (set: ISet) => IWeight): ISet | undefined {
  return CollectionUtils_sort(
    sets.filter((s) => (s.completedReps || 0) > 0),
    (a, b) => {
      const weightDiff = Weight_compare(weightOf(b), weightOf(a));
      if (weightDiff === 0 && a.completedReps && b.completedReps) {
        return b.completedReps - a.completedReps;
      }
      return weightDiff;
    }
  )[0];
}

const weightOf = (s: ISet): IWeight => s.completedWeight ?? s.weight ?? Weight_build(0, "lb");
const oneRmOf = (s: ISet): IWeight =>
  Weight_getOneRepMax(
    s.completedWeight ?? s.weight ?? Weight_build(0, "lb"),
    Reps_avgUnilateralCompletedReps(s) || 0,
    s.completedRpe ?? s.rpe ?? 10
  );

function makeSet(id: string, weight: number | undefined, reps: number | undefined, rpe?: number): ISet {
  return {
    vtype: "set",
    id,
    index: 0,
    reps: 5,
    weight: { value: 100, unit: "lb" },
    originalWeight: { value: 100, unit: "lb" },
    isUnilateral: false,
    isCompleted: reps != null,
    completedReps: reps,
    completedWeight: weight != null ? { value: weight, unit: "lb" } : undefined,
    completedRpe: rpe,
  };
}

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe("History max set", () => {
  it("returns undefined when no set has completed reps", () => {
    const sets = [makeSet("a", 100, undefined), makeSet("b", 100, 0)];
    expect(History_getMaxWeightSet(sets)).to.equal(undefined);
    expect(History_getMax1RMSet(sets)).to.equal(undefined);
  });

  it("prefers more reps when the weight ties", () => {
    const sets = [makeSet("a", 100, 3), makeSet("b", 100, 8), makeSet("c", 100, 5)];
    expect(History_getMaxWeightSet(sets)?.id).to.equal("b");
  });

  it("keeps the earlier set when weight and reps both tie", () => {
    const sets = [makeSet("a", 100, 5), makeSet("b", 100, 5)];
    expect(History_getMaxWeightSet(sets)?.id).to.equal("a");
    expect(History_getMax1RMSet(sets)?.id).to.equal("a");
  });

  it("matches the sort it replaced on randomized sets", () => {
    const rand = seeded(42);
    for (let trial = 0; trial < 2000; trial++) {
      const count = 1 + Math.floor(rand() * 8);
      const sets: ISet[] = [];
      for (let i = 0; i < count; i++) {
        const weight = rand() < 0.1 ? undefined : 40 + Math.floor(rand() * 4) * 20;
        const reps = rand() < 0.15 ? undefined : Math.floor(rand() * 4) * 2;
        const rpe = rand() < 0.5 ? undefined : 7 + Math.floor(rand() * 4);
        sets.push(makeSet(`s${i}`, weight, reps, rpe));
      }
      expect(History_getMaxWeightSet(sets), `weight, trial ${trial}`).to.equal(sortedFirst(sets, weightOf));
      expect(History_getMax1RMSet(sets), `1RM, trial ${trial}`).to.equal(sortedFirst(sets, oneRmOf));
    }
  });
});
