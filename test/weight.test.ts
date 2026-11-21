import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import {
  Weight_build,
  Weight_calculatePlates,
  Weight_platesWeight,
  Weight_rpeMultiplier,
  Weight_strictParse,
} from "../src/models/weight";
import { IPlate, ISettings } from "../src/types";
import { Exercise_toKey } from "../src/models/exercise";

function buildSettings(plates: IPlate[], bar: number = 45): ISettings {
  const settings = Settings_build();
  settings.gyms[0].equipment.barbell!.plates = plates;
  settings.gyms[0].equipment.barbell!.bar = {
    lb: Weight_build(bar, "lb"),
    kg: Weight_build(Math.floor(bar / 2), "kg"),
  };
  settings.exerciseData = settings.exerciseData || {};
  settings.exerciseData[Exercise_toKey(exerciseType)] = { equipment: { [settings.gyms[0].id]: "barbell" } };
  return settings;
}

const exerciseType = { id: "squat", equipment: "barbell" };

describe("Weight", () => {
  describe(".calculatePlates()", () => {
    it("when enough pair plates", () => {
      const settings = buildSettings([
        { weight: Weight_build(45, "lb"), num: 4 },
        { weight: Weight_build(25, "lb"), num: 4 },
        { weight: Weight_build(10, "lb"), num: 4 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
      ]);
      const result = Weight_calculatePlates(Weight_build(215, "lb"), settings, settings.units, exerciseType).plates;
      expect(result).to.eql([
        { weight: Weight_build(45, "lb"), num: 2 },
        { weight: Weight_build(25, "lb"), num: 2 },
        { weight: Weight_build(10, "lb"), num: 2 },
        { weight: Weight_build(5, "lb"), num: 2 },
      ]);
    });

    it("when naive subtracting doesnt work", () => {
      const settings = buildSettings([
        { weight: Weight_build(45, "lb"), num: 8 },
        { weight: Weight_build(35, "lb"), num: 4 },
        { weight: Weight_build(25, "lb"), num: 4 },
        { weight: Weight_build(10, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 6 },
      ]);
      const result = Weight_calculatePlates(Weight_build(130, "lb"), settings, settings.units, exerciseType).plates;
      expect(result).to.eql([
        { weight: Weight_build(35, "lb"), num: 2 },
        { weight: Weight_build(2.5, "lb"), num: 6 },
      ]);
    });

    it("when greedy picks too-large plate and misses better combo", () => {
      const settings = buildSettings([
        { weight: Weight_build(45, "lb"), num: 4 },
        { weight: Weight_build(35, "lb"), num: 4 },
        { weight: Weight_build(25, "lb"), num: 4 },
        { weight: Weight_build(15, "lb"), num: 4 },
        { weight: Weight_build(10, "lb"), num: 4 },
      ]);
      // Target plates weight = 145 - 45 = 100. Greedy: 45x2=90, nothing fits remaining 10 → total 135.
      // Optimal: 35x2 + 15x2 = 70+30=100 → total 145.
      const result = Weight_calculatePlates(Weight_build(145, "lb"), settings, settings.units, exerciseType);
      expect(result.totalWeight).to.eql(Weight_build(145, "lb"));
      expect(result.plates).to.eql([
        { weight: Weight_build(35, "lb"), num: 2 },
        { weight: Weight_build(15, "lb"), num: 2 },
      ]);
    });

    it("handles large plate counts without freezing", () => {
      const settings = buildSettings([
        { weight: Weight_build(45, "lb"), num: 500 },
        { weight: Weight_build(35, "lb"), num: 500 },
        { weight: Weight_build(25, "lb"), num: 500 },
        { weight: Weight_build(15, "lb"), num: 500 },
        { weight: Weight_build(10, "lb"), num: 500 },
      ]);
      const result = Weight_calculatePlates(Weight_build(345, "lb"), settings, settings.units, exerciseType);
      // 345 - 45 bar = 300. Best: 45x2 + 25x2 + 10x2 + 15x2 = 90+50+20+30... wait
      // 300 / 2 = 150 per side. 45+35+25+15+10+... = 150? 45+35+25+15+10=130. Need 150.
      // 45x2=90, 35x2=70, 25x2=50, 15x2=30, 10x2=20 → just need sum ≤300
      // 45*2=90, 35*2=70: 160. 25*2=50: 210. Need 90 more. 45*2=90: 300. Perfect!
      expect(result.totalWeight).to.eql(Weight_build(345, "lb"));
    });

    it("calculate with fast method", () => {
      const settings = buildSettings([
        { weight: { value: 45, unit: "lb" }, num: 50 },
        { weight: { value: 25, unit: "lb" }, num: 50 },
        { weight: { value: 10, unit: "lb" }, num: 50 },
        { weight: { value: 5, unit: "lb" }, num: 50 },
        { weight: { value: 3, unit: "lb" }, num: 50 },
        { weight: { value: 2.5, unit: "lb" }, num: 50 },
        { weight: { value: 1.5, unit: "lb" }, num: 50 },
        { weight: { value: 1.25, unit: "lb" }, num: 60 },
        { weight: { value: 1, unit: "lb" }, num: 60 },
        { weight: { value: 0.5, unit: "lb" }, num: 40 },
        { weight: { value: 0.25, unit: "lb" }, num: 200 },
      ]);
      const result = Weight_calculatePlates(Weight_build(82.3, "lb"), settings, settings.units, exerciseType).plates;
      expect(result).to.eql([
        { weight: { value: 10, unit: "lb" }, num: 2 },
        { weight: { value: 5, unit: "lb" }, num: 2 },
        { weight: { value: 3, unit: "lb" }, num: 2 },
        { weight: { value: 0.5, unit: "lb" }, num: 2 },
      ]);
    });

    it("when not enough pair plates", () => {
      const settings = buildSettings([
        { weight: Weight_build(45, "lb"), num: 4 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
      ]);
      const result = Weight_calculatePlates(Weight_build(215, "lb"), settings, settings.units, exerciseType).plates;
      expect(result).to.eql([
        { weight: Weight_build(45, "lb"), num: 2 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
      ]);
    });

    it("converts the weight into the equipment units before picking plates", () => {
      const settings = buildSettings(
        [
          { weight: Weight_build(45, "lb"), num: 10 },
          { weight: Weight_build(25, "lb"), num: 2 },
          { weight: Weight_build(10, "lb"), num: 4 },
          { weight: Weight_build(5, "lb"), num: 2 },
          { weight: Weight_build(2.5, "lb"), num: 2 },
        ],
        0
      );
      settings.units = "kg";
      settings.gyms[0].equipment.barbell!.unit = "lb";
      const result = Weight_calculatePlates(Weight_build(77.25, "kg"), settings, "lb", exerciseType);
      expect(result.plates).to.eql([
        { weight: Weight_build(45, "lb"), num: 2 },
        { weight: Weight_build(25, "lb"), num: 2 },
        { weight: Weight_build(10, "lb"), num: 2 },
        { weight: Weight_build(5, "lb"), num: 2 },
      ]);
      expect(result.totalWeight).to.eql(Weight_build(77, "kg"));
    });
  });

  describe(".platesWeight()", () => {
    it("calculates properly", () => {
      const plates = [
        { weight: Weight_build(45, "lb"), num: 2 },
        { weight: Weight_build(25, "lb"), num: 2 },
        { weight: Weight_build(10, "lb"), num: 2 },
        { weight: Weight_build(5, "lb"), num: 2 },
      ];
      expect(Weight_platesWeight(plates)).to.eql(Weight_build(170, "lb"));
    });
  });

  describe(".rpeMultiplier()", () => {
    it("matches the RTS chart inside it", () => {
      expect(Weight_rpeMultiplier(1, 10, "rts")).to.equal(1);
      expect(Weight_rpeMultiplier(12, 10, "rts")).to.be.closeTo(0.68, 0.001);
      expect(Weight_rpeMultiplier(12, 6, "rts")).to.be.closeTo(0.575, 0.001);
    });

    it("tells RPEs apart on high-rep sets past the chart", () => {
      expect(Weight_rpeMultiplier(15, 8, "rts")).to.be.closeTo(0.548, 0.001);
      expect(Weight_rpeMultiplier(15, 7, "rts")).to.be.closeTo(0.537, 0.001);
      expect(Weight_rpeMultiplier(15, 5, "rts")).to.be.closeTo(0.515, 0.001);
      expect(Weight_rpeMultiplier(21, 6, "rts")).to.be.closeTo(0.468, 0.001);
      expect(Weight_rpeMultiplier(30, 10, "rts")).to.be.closeTo(0.429, 0.001);
    });

    it("gives the plain Epley and Brzycki values at RPE 10", () => {
      for (const formula of ["epley", "brzycki"] as const) {
        expect(Weight_rpeMultiplier(1, 10, formula)).to.equal(1);
        expect(Weight_rpeMultiplier(10, 10, formula)).to.be.closeTo(0.75, 0.0001);
      }
      expect(Weight_rpeMultiplier(5, 10, "epley")).to.be.closeTo(0.857, 0.001);
      expect(Weight_rpeMultiplier(5, 10, "brzycki")).to.be.closeTo(0.889, 0.001);
    });

    it("gives the plain Lombardi values at RPE 10", () => {
      expect(Weight_rpeMultiplier(1, 10, "lombardi")).to.equal(1);
      expect(Weight_rpeMultiplier(5, 10, "lombardi")).to.be.closeTo(0.851, 0.001);
      expect(Weight_rpeMultiplier(10, 10, "lombardi")).to.be.closeTo(0.794, 0.001);
      expect(Weight_rpeMultiplier(30, 10, "lombardi")).to.be.closeTo(0.712, 0.001);
    });

    it("counts reps in reserve as extra reps for Epley, Brzycki and Lombardi", () => {
      for (const formula of ["epley", "brzycki", "lombardi"] as const) {
        expect(Weight_rpeMultiplier(8, 8, formula)).to.equal(Weight_rpeMultiplier(10, 10, formula));
      }
    });

    it("stops Brzycki at 30 reps to failure", () => {
      expect(Weight_rpeMultiplier(30, 10, "brzycki")).to.be.closeTo(0.194, 0.001);
      expect(Weight_rpeMultiplier(25, 5, "brzycki")).to.equal(Weight_rpeMultiplier(30, 10, "brzycki"));
    });

    it("falls with every extra rep up to 30 and stays positive", () => {
      for (const formula of ["rts", "epley", "lombardi"] as const) {
        for (const rpe of [1, 5, 6.5, 8, 10]) {
          for (let reps = 2; reps <= 30; reps += 1) {
            const prev = Weight_rpeMultiplier(reps - 1, rpe, formula);
            const next = Weight_rpeMultiplier(reps, rpe, formula);
            expect(next, `${formula} ${reps}@${rpe}`).to.be.lessThan(prev);
            expect(next, `${formula} ${reps}@${rpe}`).to.be.greaterThan(0);
          }
        }
        expect(Weight_rpeMultiplier(40, 10, formula)).to.equal(Weight_rpeMultiplier(30, 10, formula));
      }
      for (const rpe of [1, 5, 6.5, 8, 10]) {
        for (let reps = 2; reps <= 30; reps += 1) {
          const prev = Weight_rpeMultiplier(reps - 1, rpe, "brzycki");
          const next = Weight_rpeMultiplier(reps, rpe, "brzycki");
          expect(next, `brzycki ${reps}@${rpe}`).to.be.at.most(prev);
          expect(next, `brzycki ${reps}@${rpe}`).to.be.greaterThan(0);
        }
      }
    });
  });

  describe(".strictParse()", () => {
    it("parses well-formed weights", () => {
      expect(Weight_strictParse("45lb")).to.eql(Weight_build(45, "lb"));
      expect(Weight_strictParse("20kg")).to.eql(Weight_build(20, "kg"));
      expect(Weight_strictParse(".5kg")).to.eql(Weight_build(0.5, "kg"));
      expect(Weight_strictParse("2.5 lb")).to.eql(Weight_build(2.5, "lb"));
      expect(Weight_strictParse("-5lb")).to.eql(Weight_build(-5, "lb"));
    });

    it("rejects malformed weights instead of coercing them", () => {
      for (const s of ["...lb", "+.kg", "1.2.3lb", "lb", "45", "heavy", "", "45g"]) {
        expect(Weight_strictParse(s), `expected ${JSON.stringify(s)} to be rejected`).to.equal(undefined);
      }
    });
  });
});
