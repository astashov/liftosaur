import "mocha";
import { expect } from "chai";
import {
  WarmupScheme_addSet,
  WarmupScheme_build,
  WarmupScheme_materialize,
  WarmupScheme_prescribe,
  WarmupScheme_reconcile,
  WarmupScheme_resolve,
} from "../src/models/warmupScheme";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { IExerciseType, IHistoryEntry, ISet } from "../src/types";

const squat: IExerciseType = { id: "squat", equipment: "barbell" };
const ohp: IExerciseType = { id: "overheadPress", equipment: "barbell" };

function weights(sets: ISet[]): number[] {
  return sets.map((s) => s.weight!.value);
}

describe("WarmupScheme", function () {
  this.timeout(5000);

  describe("resolve", () => {
    it("uses the program's warmups when it has them", () => {
      const rows = WarmupScheme_resolve(squat, Settings_build(), [{ numberOfSets: 2, reps: 5, percentage: 50 }]);
      expect(rows).to.eql([
        { reps: 5, value: 0.5 },
        { reps: 5, value: 0.5 },
      ]);
    });

    it("treats an empty program list as no warmups", () => {
      expect(WarmupScheme_resolve(squat, Settings_build(), [])).to.eql([]);
    });

    it("falls back to the built-in scheme, which keeps its thresholds", () => {
      const rows = WarmupScheme_resolve(squat, Settings_build(), undefined);
      expect(rows.length).to.be.greaterThan(0);
      expect(rows.every((r) => r.threshold != null)).to.equal(true);
    });

    it("keeps a 0% warmup as 0 instead of guessing a weight", () => {
      expect(WarmupScheme_resolve(squat, Settings_build(), [{ numberOfSets: 1, reps: 6, percentage: 0 }])).to.eql([
        { reps: 6, value: 0 },
      ]);
    });

    it("guesses a weight from the reps when the set has none", () => {
      const [row] = WarmupScheme_resolve(squat, Settings_build(), [{ numberOfSets: 1, reps: 5 }]);
      expect(typeof row.value).to.equal("number");
      expect(row.value).to.be.lessThan(1);
    });
  });

  describe("prescribe", () => {
    it("skips built-in rows at or under their threshold", () => {
      const settings = Settings_build("lb");
      const rows = WarmupScheme_resolve(ohp, settings, undefined);
      expect(WarmupScheme_prescribe(rows, Weight_build(45, "lb"), ohp, settings)).to.eql([]);
    });

    it("never skips program rows, even on a light first weight", () => {
      const settings = Settings_build("lb");
      const rows = WarmupScheme_resolve(ohp, settings, [{ numberOfSets: 1, reps: 5, percentage: 100 }]);
      expect(WarmupScheme_prescribe(rows, Weight_build(45, "lb"), ohp, settings).length).to.equal(1);
    });

    it("carries the rest time of each row", () => {
      const settings = Settings_build("lb");
      const rows = WarmupScheme_resolve(squat, settings, [
        { numberOfSets: 1, reps: 5, percentage: 50, timer: 30 },
        { numberOfSets: 1, reps: 3, percentage: 80 },
      ]);
      expect(WarmupScheme_prescribe(rows, Weight_build(200, "lb"), squat, settings).map((p) => p.timer)).to.eql([
        30,
        undefined,
      ]);
    });

    it("drops % rows when there is no first weight, and keeps fixed weights", () => {
      const settings = Settings_build("kg");
      const rows = WarmupScheme_resolve(squat, settings, [
        { numberOfSets: 1, reps: 5, percentage: 50 },
        { numberOfSets: 1, reps: 5, weight: Weight_build(40, "kg") },
      ]);
      expect(WarmupScheme_prescribe(rows, undefined, squat, settings).map((p) => p.weight.value)).to.eql([40]);
    });
  });

  describe("materialize", () => {
    it("reuses the old set ids by position and makes new ones for extra sets", () => {
      const settings = Settings_build("lb");
      const old = WarmupScheme_build(squat, Weight_build(200, "lb"), settings, [
        { numberOfSets: 2, reps: 5, percentage: 50 },
      ]);
      const rows = WarmupScheme_resolve(squat, settings, [{ numberOfSets: 3, reps: 5, percentage: 40 }]);
      const sets = WarmupScheme_materialize(
        WarmupScheme_prescribe(rows, Weight_build(100, "lb"), squat, settings),
        old,
        false
      );
      expect(sets.slice(0, 2).map((s) => s.id)).to.eql(old.map((s) => s.id));
      expect(sets[2].id).to.not.be.oneOf(old.map((s) => s.id));
      expect(sets.every((s) => !s.isCompleted)).to.equal(true);
    });

    it("writes a timer only on sets that have one", () => {
      const settings = Settings_build("lb");
      const sets = WarmupScheme_build(squat, Weight_build(200, "lb"), settings, [
        { numberOfSets: 1, reps: 5, percentage: 50, timer: 45 },
        { numberOfSets: 1, reps: 3, percentage: 80 },
      ]);
      expect(sets[0].timer).to.equal(45);
      expect("timer" in sets[1]).to.equal(false);
    });
  });

  describe("reconcile", () => {
    const settings = Settings_build("lb");
    const scheme = [{ numberOfSets: 1, reps: 5, percentage: 50 }];
    function entryAt(firstWeight: number, warmupSets?: ISet[]): IHistoryEntry {
      const weight = Weight_build(firstWeight, "lb");
      return {
        vtype: "history_entry",
        id: "squat",
        index: 0,
        exercise: squat,
        sets: [{ vtype: "set", id: "w1", index: 0, reps: 5, weight, isUnilateral: false }],
        warmupSets: warmupSets ?? WarmupScheme_build(squat, weight, settings, scheme),
      };
    }

    it("rebuilds from the new first weight", () => {
      const before = entryAt(200);
      const after = { ...entryAt(100), warmupSets: before.warmupSets };
      expect(weights(WarmupScheme_reconcile(before, after, scheme, settings, false).warmupSets)).to.eql([50]);
    });

    it("leaves the warmups alone when the first weight did not change", () => {
      const before = entryAt(200, []);
      expect(WarmupScheme_reconcile(before, before, scheme, settings, false).warmupSets).to.eql([]);
    });

    it("leaves the warmups alone when the script wrote them", () => {
      const before = entryAt(200);
      const after = { ...entryAt(100), warmupSets: before.warmupSets };
      expect(WarmupScheme_reconcile(before, after, scheme, settings, true).warmupSets).to.equal(before.warmupSets);
    });

    it("leaves the warmups alone once one is completed", () => {
      const before = entryAt(200);
      const done = before.warmupSets.map((s) => ({ ...s, isCompleted: true }));
      const after = { ...entryAt(100), warmupSets: done };
      expect(WarmupScheme_reconcile(before, after, scheme, settings, false).warmupSets).to.equal(done);
    });
  });

  describe("addSet", () => {
    it("starts the first ad-hoc warmup at the empty bar, using the gym's bar weight", () => {
      const settings = Settings_build("lb");
      const barbell = settings.gyms[0].equipment.barbell!;
      settings.gyms[0].equipment.barbell = {
        ...barbell,
        bar: { lb: Weight_build(18, "lb"), kg: Weight_build(8, "kg") },
      };
      expect(weights(WarmupScheme_addSet([], squat, settings))).to.eql([18]);
    });

    it("copies the last warmup when there already are some", () => {
      const settings = Settings_build("lb");
      const existing = WarmupScheme_build(squat, Weight_build(200, "lb"), settings, [
        { numberOfSets: 1, reps: 5, percentage: 50 },
      ]);
      const added = WarmupScheme_addSet(existing, squat, settings);
      expect(weights(added)).to.eql([100, 100]);
      expect(added[1].id).to.not.equal(existing[0].id);
    });
  });

  it("build gives the empty bar for a 0% warmup", () => {
    const settings = Settings_build("kg");
    const sets = WarmupScheme_build(squat, Weight_build(100, "kg"), settings, [
      { numberOfSets: 1, reps: 6, percentage: 0 },
    ]);
    expect(weights(sets)).to.eql([20]);
  });
});
