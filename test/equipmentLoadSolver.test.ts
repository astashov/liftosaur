import "mocha";
import { expect } from "chai";
import {
  EquipmentLoadSolver_next,
  EquipmentLoadSolver_previous,
  EquipmentLoadSolver_reachable,
  EquipmentLoadSolver_realize,
  EquipmentLoadSolver_select,
} from "../src/models/equipmentLoadSolver";
import { EquipmentLoadText_format } from "../src/models/equipmentLoadText";
import { IEquipmentSetup, IPlateCount, IUnit, IWeight } from "../src/types";

function w(value: number, unit: IUnit = "lb"): IWeight {
  return { value, unit };
}

const barbellPlates: IPlateCount[] = [
  { weight: 45, num: 8 },
  { weight: 25, num: 4 },
  { weight: 10, num: 4 },
  { weight: 5, num: 4 },
  { weight: 2.5, num: 4 },
];

const barbell: IEquipmentSetup = { type: "plates", unit: "lb", base: 45, plates: barbellPlates, sides: 2 };

const prime: IEquipmentSetup = {
  type: "plates",
  unit: "lb",
  base: 0,
  plates: barbellPlates,
  sides: 2,
  horns: [
    { name: "Top", ratio: 3 },
    { name: "Middle", ratio: 1 },
    { name: "Low", ratio: 0 },
  ],
  warmupPlates: [45, 25],
};

const cableStack: IEquipmentSetup = {
  type: "stack",
  unit: "lb",
  ranges: [
    { from: 10, to: 200, step: 10 },
    { from: 200, to: 300, step: 20 },
  ],
  builtin: [5, 10],
  pullRatio: 0.5,
};

describe("EquipmentLoadSolver", () => {
  describe("plates", () => {
    it("loads the Figma barbell", () => {
      const load = EquipmentLoadSolver_select(barbell, w(135), {});
      expect(load.total).to.eql(w(135));
      expect(load.exact).to.equal(true);
      expect(EquipmentLoadText_format(load)).to.equal("45");
      expect(EquipmentLoadSolver_reachable(barbell, {}, 1000).values).to.have.length(107);
    });

    it("returns the bar when the target is below it", () => {
      expect(EquipmentLoadSolver_select(barbell, w(20), {}).total).to.eql(w(45));
    });

    it("splits the Prime row 3:1 between horns", () => {
      const load = EquipmentLoadSolver_select(prime, w(380), {});
      expect(load.total).to.eql(w(380));
      expect(load.instruction).to.eql({
        type: "plates",
        sides: 2,
        horns: [
          {
            name: "Top",
            plates: [
              { weight: 45, num: 3 },
              { weight: 5, num: 1 },
              { weight: 2.5, num: 1 },
            ],
          },
          {
            name: "Middle",
            plates: [
              { weight: 45, num: 1 },
              { weight: 2.5, num: 1 },
            ],
          },
          { name: "Low", plates: [] },
        ],
      });
      expect(EquipmentLoadText_format(load)).to.equal("Top 3x45/5/2.5 · Middle 45/2.5");
    });

    it("hands out the side's plates when loading horn by horn misses the total", () => {
      const setup: IEquipmentSetup = {
        type: "plates",
        unit: "lb",
        base: 0,
        plates: [
          { weight: 8, num: 1 },
          { weight: 6, num: 2 },
        ],
        sides: 1,
        horns: [
          { name: "A", ratio: 2 },
          { name: "B", ratio: 1 },
        ],
      };
      const load = EquipmentLoadSolver_select(setup, w(12), {});
      expect(load.total).to.eql(w(12));
      expect(load.instruction).to.eql({
        type: "plates",
        sides: 1,
        horns: [
          { name: "A", plates: [{ weight: 6, num: 1 }] },
          { name: "B", plates: [{ weight: 6, num: 1 }] },
        ],
      });
    });

    it("uses only warmup plates for warmups", () => {
      const load = EquipmentLoadSolver_select(prime, w(380), { warmup: { firstWorkingWeight: w(380) } });
      expect(load.total).to.eql(w(370));
    });

    it("caps a warmup at the first working weight", () => {
      const setup: IEquipmentSetup = {
        type: "plates",
        unit: "lb",
        base: 45,
        plates: [
          { weight: 45, num: 8 },
          { weight: 25, num: 4 },
        ],
        sides: 2,
        rounding: "nearest",
      };
      expect(EquipmentLoadSolver_select(setup, w(210), {}).total).to.eql(w(225));
      expect(EquipmentLoadSolver_select(setup, w(210), { warmup: { firstWorkingWeight: w(215) } }).total).to.eql(
        w(185)
      );
    });

    it("realizes a logged warmup with warmup plates first, then all plates", () => {
      const setup: IEquipmentSetup = { ...barbell, warmupPlates: [45, 25] };
      const warmup = { warmup: {} };
      expect(EquipmentLoadText_format(EquipmentLoadSolver_realize(setup, w(185), warmup))).to.equal("45/25");
      const mixed = EquipmentLoadSolver_realize(setup, w(140), warmup);
      expect(mixed.exact).to.equal(true);
      expect(EquipmentLoadText_format(mixed)).to.equal("45/2.5");
    });

    it("adds bodyweight for a dip belt", () => {
      const belt: IEquipmentSetup = {
        type: "plates",
        unit: "lb",
        base: 0,
        plates: barbellPlates,
        sides: 1,
        bodyweight: {},
      };
      const query = { bodyweight: w(176) };
      expect(EquipmentLoadSolver_reachable(belt, query, 1000).values).to.have.length(213);
      const load = EquipmentLoadSolver_select(belt, w(221), query);
      expect(load.total).to.eql(w(221));
      expect(EquipmentLoadText_format(load)).to.equal("45");
    });

    it("loads a weighted vest", () => {
      const vest: IEquipmentSetup = {
        type: "plates",
        unit: "lb",
        base: 5,
        plates: [{ weight: 2.5, num: 16 }],
        sides: 1,
        bodyweight: {},
      };
      const query = { bodyweight: w(180) };
      expect(EquipmentLoadSolver_reachable(vest, query, 1000).values).to.have.length(17);
      expect(EquipmentLoadSolver_select(vest, w(200), query).instruction).to.eql({
        type: "plates",
        sides: 1,
        horns: [{ plates: [{ weight: 2.5, num: 6 }] }],
      });
    });

    it("subtracts plates on an assisted dip", () => {
      const dip: IEquipmentSetup = {
        type: "plates",
        unit: "kg",
        base: 0,
        plates: [
          { weight: 20, num: 4 },
          { weight: 10, num: 4 },
          { weight: 5, num: 4 },
          { weight: 2.5, num: 4 },
        ],
        sides: 1,
        direction: "assists",
        bodyweight: {},
      };
      const load = EquipmentLoadSolver_select(dip, w(55, "kg"), { bodyweight: w(80, "kg") });
      expect(load.total).to.eql(w(55, "kg"));
      expect(EquipmentLoadText_format(load)).to.equal("20/5");
    });
  });

  describe("stack", () => {
    const simpleStack: IEquipmentSetup = { type: "stack", unit: "lb", ranges: [{ from: 10, to: 200, step: 10 }] };

    it("rounds down by default and to nearest when asked", () => {
      expect(EquipmentLoadSolver_select(simpleStack, w(57.5), {}).total).to.eql(w(50));
      expect(EquipmentLoadSolver_select({ ...simpleStack, rounding: "nearest" }, w(57.5), {}).total).to.eql(w(60));
    });

    it("combines two ranges, built-in add-ons and a pull ratio", () => {
      expect(EquipmentLoadSolver_reachable(cableStack, {}, 1000).values).to.have.length(56);
      const load = EquipmentLoadSolver_select(cableStack, w(57.5), {});
      expect(load.total).to.eql(w(57.5));
      expect(load.exact).to.equal(true);
      expect(EquipmentLoadText_format(load)).to.equal("Pin 110 + 5");
    });

    it("combines added plates", () => {
      const setup: IEquipmentSetup = {
        ...cableStack,
        builtin: undefined,
        addOn: [
          { weight: 2.5, num: 1 },
          { weight: 1.25, num: 1 },
        ],
        rounding: "nearest",
      };
      expect(EquipmentLoadSolver_reachable(setup, {}, 1000).values).to.have.length(100);
      const load = EquipmentLoadSolver_select(setup, w(57.5), {});
      expect(load.total).to.eql(w(56.875));
      expect(EquipmentLoadText_format(load)).to.equal("Pin 110 + 2.5/1.25");
    });

    it("skips add-ons in warmups when asked", () => {
      const setup: IEquipmentSetup = { ...cableStack, skipAddOnsInWarmups: true };
      expect(EquipmentLoadSolver_select(setup, w(57.5), { warmup: {} }).total).to.eql(w(55));
    });

    it("handles a stack base, add-on plates and a 2:1 ratio together", () => {
      const trainer: IEquipmentSetup = {
        type: "stack",
        unit: "lb",
        base: 6,
        ranges: [{ from: 11, to: 132, step: 11 }],
        addOn: [
          { weight: 0.5, num: 8 },
          { weight: 5, num: 4 },
        ],
        pullRatio: 0.5,
      };
      const load = EquipmentLoadSolver_select(trainer, w(33.25), {});
      expect(load.total).to.eql(w(33.25));
      expect(load.instruction).to.eql({
        type: "stack",
        pin: 55,
        builtin: undefined,
        addOn: [
          { weight: 5, num: 1 },
          { weight: 0.5, num: 1 },
        ],
      });
    });

    it("rounds the assistance down on an assisted machine", () => {
      const assisted: IEquipmentSetup = {
        type: "stack",
        unit: "kg",
        ranges: [{ from: 10, to: 150, step: 10 }],
        direction: "assists",
        bodyweight: {},
      };
      const query = { bodyweight: w(80, "kg") };
      expect(EquipmentLoadText_format(EquipmentLoadSolver_select(assisted, w(60, "kg"), query))).to.equal("Pin 20");
      expect(EquipmentLoadSolver_select(assisted, w(55, "kg"), query).total).to.eql(w(60, "kg"));
      const values = EquipmentLoadSolver_reachable(assisted, query, 1000).values;
      expect(values.every((v) => v >= 0)).to.equal(true);
    });

    it("logs assistance only as negative weights", () => {
      const assisted: IEquipmentSetup = {
        type: "stack",
        unit: "kg",
        ranges: [{ from: 10, to: 150, step: 10 }],
        direction: "assists",
      };
      const load = EquipmentLoadSolver_select(assisted, w(-20, "kg"), {});
      expect(load.total).to.eql(w(-20, "kg"));
      expect(EquipmentLoadText_format(load)).to.equal("Pin 20");
    });

    it("steps to the next and previous weight", () => {
      expect(EquipmentLoadSolver_next(simpleStack, w(50), {})).to.eql(w(60));
      expect(EquipmentLoadSolver_previous(simpleStack, w(50), {})).to.eql(w(40));
      expect(EquipmentLoadSolver_previous(simpleStack, w(10), {})).to.eql(w(10));
      expect(EquipmentLoadSolver_next(simpleStack, w(-20), {})).to.eql(w(-10));
      expect(EquipmentLoadSolver_previous(simpleStack, w(-20), {})).to.eql(w(-30));
    });

    it("never repeats or skips a value when stepping in another unit", () => {
      const setup: IEquipmentSetup = {
        type: "stack",
        unit: "lb",
        ranges: [{ from: 10, to: 100, step: 10 }],
        addOn: [{ weight: 2.5, num: 1 }],
      };
      const seen: number[] = [4.5];
      for (let i = 0; i < 30; i++) {
        const next = EquipmentLoadSolver_next(setup, w(seen[seen.length - 1], "kg"), {});
        if (next.value === seen[seen.length - 1]) {
          break;
        }
        seen.push(next.value);
      }
      expect(seen).to.have.length(20);
      expect(seen.every((value, i) => i === 0 || value > seen[i - 1])).to.equal(true);
    });
  });

  describe("fixed, electric and bands", () => {
    it("covers SelectTech dumbbells", () => {
      const selectTech: IEquipmentSetup = {
        type: "fixed",
        unit: "lb",
        ranges: [
          { from: 5, to: 25, step: 2.5 },
          { from: 30, to: 50, step: 5 },
        ],
        values: [52.5],
      };
      expect(EquipmentLoadSolver_reachable(selectTech, {}, 1000).values).to.have.length(15);
      expect(EquipmentLoadSolver_select(selectTech, w(28), {}).total).to.eql(w(25));
    });

    it("rounds an electric trainer to its step and clamps to its range", () => {
      const voltra: IEquipmentSetup = { type: "electric", unit: "lb", min: 5, max: 200, step: 1 };
      expect(EquipmentLoadSolver_select(voltra, w(57), {}).total).to.eql(w(57));
      expect(EquipmentLoadSolver_select(voltra, w(57.4), {}).total).to.eql(w(57));
      expect(EquipmentLoadSolver_select(voltra, w(3), {}).total).to.eql(w(5));
    });

    it("picks one band or combines bands", () => {
      const bands: IEquipmentSetup = {
        type: "bands",
        unit: "lb",
        bands: [
          { name: "Yellow", weight: 10, num: 1 },
          { name: "Red", weight: 25, num: 2 },
          { name: "Blue", weight: 40, num: 1 },
        ],
        combine: true,
      };
      expect(EquipmentLoadText_format(EquipmentLoadSolver_select(bands, w(65), {}))).to.equal("Blue + Red");
      const single = EquipmentLoadSolver_select({ ...bands, combine: false }, w(65), {});
      expect(EquipmentLoadText_format(single)).to.equal("Blue");
    });
  });

  describe("review fixes", () => {
    const lbBarbell: IEquipmentSetup = {
      type: "plates",
      unit: "lb",
      base: 45,
      plates: [
        { weight: 45, num: 8 },
        { weight: 2.5, num: 4 },
      ],
      sides: 2,
    };

    it("keeps a kg weight that came from lb plates, and steps from it", () => {
      const selected = EquipmentLoadSolver_select(lbBarbell, w(63, "kg"), {});
      expect(selected.total).to.eql(w(61, "kg"));
      const realized = EquipmentLoadSolver_realize(lbBarbell, selected.total, {});
      expect(realized.exact).to.equal(true);
      expect(EquipmentLoadText_format(realized)).to.equal("45");
      expect(EquipmentLoadSolver_next(lbBarbell, selected.total, {}).value).to.be.greaterThan(61);
    });

    it("merges duplicate plate rows", () => {
      const setup: IEquipmentSetup = {
        type: "plates",
        unit: "lb",
        base: 0,
        plates: [
          { weight: 10, num: 2 },
          { weight: 10, num: 2 },
        ],
        sides: 2,
      };
      expect(EquipmentLoadSolver_next(setup, w(0), {})).to.eql(w(20));
      expect(EquipmentLoadSolver_reachable(setup, {}, 100).values).to.eql([0, 20, 40]);
    });

    it("keeps band names apart when bands count the same", () => {
      const bands: IEquipmentSetup = {
        type: "bands",
        unit: "lb",
        bands: [
          { name: "Red", weight: 10, num: 1 },
          { name: "Blue", weight: 10, num: 1 },
        ],
        combine: true,
      };
      expect(EquipmentLoadText_format(EquipmentLoadSolver_select(bands, w(20), {}))).to.equal("Red + Blue");
    });

    it("reports an empty inventory as nothing to load", () => {
      const load = EquipmentLoadSolver_select({ type: "fixed", unit: "lb", ranges: [], values: [] }, w(30), {});
      expect(load.exact).to.equal(false);
      expect(load.instruction).to.equal(undefined);
      expect(EquipmentLoadText_format(load)).to.equal("");
    });

    it("never steps or lists assistance above bodyweight", () => {
      const assisted: IEquipmentSetup = {
        type: "stack",
        unit: "kg",
        ranges: [{ from: 10, to: 1000000, step: 1 }],
        direction: "assists",
        bodyweight: {},
      };
      const query = { bodyweight: w(80, "kg") };
      expect(EquipmentLoadSolver_previous(assisted, w(0, "kg"), query)).to.eql(w(0, "kg"));
      const startedAt = Date.now();
      const { values } = EquipmentLoadSolver_reachable(assisted, query, 100);
      expect(Date.now() - startedAt).to.be.lessThan(500);
      expect(Math.min(...values)).to.equal(0);
      expect(Math.max(...values)).to.equal(70);
    });

    it("stays fast with very large add-on inventories", () => {
      const setup: IEquipmentSetup = {
        type: "fixed",
        unit: "lb",
        ranges: [],
        values: [10],
        addOn: [
          { weight: 5, num: 200 },
          { weight: 2.5, num: 200 },
          { weight: 0.25, num: 200 },
        ],
      };
      const startedAt = Date.now();
      EquipmentLoadSolver_select(setup, w(500), {});
      expect(Date.now() - startedAt).to.be.lessThan(500);
    });
  });
});
