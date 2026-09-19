import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import {
  Weight_build,
  Weight_calculatePlates,
  Weight_platesWeight,
  Weight_formatOneSide,
  Weight_formatOneSideOrdered,
  Weight_calculatePlatesSequence,
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

  describe(".calculatePlatesSequence()", () => {
    it("preserves a useful inner stack across increasing targets", () => {
      const settings = buildSettings(
        [
          { weight: Weight_build(10, "lb"), num: 2 },
          { weight: Weight_build(5, "lb"), num: 2 },
          { weight: Weight_build(2, "lb"), num: 2 },
        ],
        0
      );
      const results = Weight_calculatePlatesSequence(
        [Weight_build(24, "lb"), Weight_build(34, "lb")],
        settings,
        "lb",
        exerciseType
      );

      expect(results.map((result) => result.totalWeight)).to.eql([Weight_build(24, "lb"), Weight_build(34, "lb")]);
      expect(results[1].plates).to.eql([
        { weight: Weight_build(10, "lb"), num: 2 },
        { weight: Weight_build(2, "lb"), num: 2 },
        { weight: Weight_build(5, "lb"), num: 2 },
      ]);
      expect(Weight_formatOneSideOrdered(settings, results[1].plates, exerciseType)).to.equal("10/2/5");
      expect(Weight_formatOneSide(settings, results[1].plates, exerciseType)).to.equal("10/5/2");
    });

    it("retains the conventional descending answer when ordering saves no actions", () => {
      const settings = buildSettings(
        [
          { weight: Weight_build(10, "lb"), num: 2 },
          { weight: Weight_build(5, "lb"), num: 2 },
          { weight: Weight_build(2, "lb"), num: 2 },
        ],
        0
      );
      const result = Weight_calculatePlatesSequence([Weight_build(24, "lb")], settings, "lb", exerciseType)[0];
      expect(result.plates).to.eql([
        { weight: Weight_build(10, "lb"), num: 2 },
        { weight: Weight_build(2, "lb"), num: 2 },
      ]);
    });

    it("uses exact gram units for kilogram plates", () => {
      const settings = buildSettings(
        [
          { weight: Weight_build(10, "kg"), num: 2 },
          { weight: Weight_build(2.5, "kg"), num: 2 },
          { weight: Weight_build(1.25, "kg"), num: 2 },
        ],
        0
      );
      const results = Weight_calculatePlatesSequence(
        [Weight_build(22.5, "kg"), Weight_build(27.5, "kg")],
        settings,
        "kg",
        exerciseType
      );

      expect(results.map((result) => result.totalWeight)).to.eql([Weight_build(22.5, "kg"), Weight_build(27.5, "kg")]);
      expect(Weight_formatOneSideOrdered(settings, results[1].plates, exerciseType)).to.equal("10/1.25/2.5");
    });

    it("keeps the legacy result for plate precision below one milli-unit", () => {
      const settings = buildSettings([{ weight: Weight_build(0.3333, "lb"), num: 2 }], 0);
      const result = Weight_calculatePlatesSequence([Weight_build(0.6666, "lb")], settings, "lb", exerciseType)[0];
      expect(result.plates).to.eql([{ weight: Weight_build(0.3333, "lb"), num: 2 }]);
      expect(result.totalWeight).to.eql(Weight_build(0.6666, "lb"));
    });

    it("preserves assisting equipment with a bodyweight bar", () => {
      const settings = buildSettings(
        [
          { weight: Weight_build(10, "lb"), num: 4 },
          { weight: Weight_build(5, "lb"), num: 2 },
        ],
        0
      );
      const equipment = settings.gyms[0].equipment.barbell!;
      equipment.multiplier = 1;
      equipment.useBodyweightForBar = true;
      equipment.isAssisting = true;
      settings.currentBodyweight = Weight_build(100, "lb");
      const targets = [Weight_build(80, "lb"), Weight_build(70, "lb")];
      const results = Weight_calculatePlatesSequence(targets, settings, "lb", exerciseType);

      expect(results.map((result) => result.totalWeight)).to.eql(targets);
      expect(results.map((result) => result.platesWeight)).to.eql([Weight_build(-20, "lb"), Weight_build(-30, "lb")]);
    });

    it("handles intermediate and advanced sequences with the default inventory", () => {
      const settings = buildSettings([
        { weight: Weight_build(45, "lb"), num: 8 },
        { weight: Weight_build(25, "lb"), num: 4 },
        { weight: Weight_build(10, "lb"), num: 4 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
        { weight: Weight_build(1.25, "lb"), num: 2 },
      ]);
      const targets = [45, 135, 225, 315, 405, 495, 455, 495].map((value) => Weight_build(value, "lb"));
      const results = Weight_calculatePlatesSequence(targets, settings, "lb", exerciseType);
      expect(results.map((result) => result.totalWeight)).to.eql(targets);

      const legacy = targets.map((target) => Weight_calculatePlates(target, settings, "lb", exerciseType));
      expect(sequenceActionCount(results, 2)).to.be.at.most(sequenceActionCount(legacy, 2));
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

  describe(".formatOneSide()", () => {
    it("returns a proper string", () => {
      const plates = [
        { weight: Weight_build(45, "lb"), num: 4 },
        { weight: Weight_build(25, "lb"), num: 2 },
        { weight: Weight_build(10, "lb"), num: 6 },
        { weight: Weight_build(5, "lb"), num: 2 },
      ];
      expect(Weight_formatOneSide(buildSettings(plates), plates, exerciseType)).to.eql("45/45/25/3x10/5");
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

function sequenceActionCount(results: { plates: IPlate[] }[], multiplier: number): number {
  let actions = 0;
  let previous: number[] = [];
  for (const result of [...results, { plates: [] }]) {
    const current = result.plates.flatMap((plate) =>
      new Array(Math.floor(plate.num / multiplier)).fill(plate.weight.value)
    );
    let retained = 0;
    while (retained < previous.length && retained < current.length && previous[retained] === current[retained]) {
      retained += 1;
    }
    actions += previous.length + current.length - 2 * retained;
    previous = current;
  }
  return actions;
}
