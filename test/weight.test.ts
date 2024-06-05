import "mocha";
import { expect } from "chai";
import { Settings } from "../src/models/settings";
import { Weight } from "../src/models/weight";
import { IPlate, ISettings } from "../src/types";
import { Exercise } from "../src/models/exercise";

function buildSettings(plates: IPlate[], bar: number = 45): ISettings {
  const settings = Settings.build();
  settings.gyms[0].equipment.barbell!.plates = plates;
  settings.gyms[0].equipment.barbell!.bar = {
    lb: Weight.build(bar, "lb"),
    kg: Weight.build(Math.floor(bar / 2), "kg"),
  };
  settings.exerciseData = settings.exerciseData || {};
  settings.exerciseData[Exercise.toKey(exerciseType)] = { equipment: { [settings.gyms[0].id]: "barbell" } };
  return settings;
}

const exerciseType = { id: "squat", equipment: "barbell" };

describe("Weight", () => {
  describe(".calculatePlates()", () => {
    it("when enough pair plates", () => {
      const settings = buildSettings([
        { weight: Weight.build(45, "lb"), num: 4 },
        { weight: Weight.build(25, "lb"), num: 4 },
        { weight: Weight.build(10, "lb"), num: 4 },
        { weight: Weight.build(5, "lb"), num: 4 },
        { weight: Weight.build(2.5, "lb"), num: 4 },
      ]);
      const result = Weight.calculatePlates(Weight.build(215, "lb"), settings, exerciseType).plates;
      expect(result).to.eql([
        { weight: Weight.build(45, "lb"), num: 2 },
        { weight: Weight.build(25, "lb"), num: 2 },
        { weight: Weight.build(10, "lb"), num: 2 },
        { weight: Weight.build(5, "lb"), num: 2 },
      ]);
    });

    it("when naive subtracting doesnt work", () => {
      const settings = buildSettings([
        { weight: Weight.build(45, "lb"), num: 8 },
        { weight: Weight.build(35, "lb"), num: 4 },
        { weight: Weight.build(25, "lb"), num: 4 },
        { weight: Weight.build(10, "lb"), num: 4 },
        { weight: Weight.build(2.5, "lb"), num: 6 },
      ]);
      const result = Weight.calculatePlates(Weight.build(130, "lb"), settings, exerciseType).plates;
      expect(result).to.eql([
        { weight: Weight.build(35, "lb"), num: 2 },
        { weight: Weight.build(2.5, "lb"), num: 6 },
      ]);
    });

    it("skipping plates", () => {
      const settings = buildSettings([
        { weight: Weight.build(45, "lb"), num: 4 },
        { weight: Weight.build(35, "lb"), num: 2 },
        { weight: Weight.build(25, "lb"), num: 2 },
        { weight: Weight.build(10, "lb"), num: 4 },
        { weight: Weight.build(5, "lb"), num: 4 },
        { weight: Weight.build(2.5, "lb"), num: 4 },
        { weight: Weight.build(1.25, "lb"), num: 2 },
        { weight: Weight.build(0.5, "lb"), num: 8 },
      ]);
      const result = Weight.calculatePlates(Weight.build(83, "lb"), settings, exerciseType).plates;
      expect(result).to.eql([
        { weight: { value: 10, unit: "lb" }, num: 2 },
        { weight: { value: 5, unit: "lb" }, num: 2 },
        { weight: { value: 2.5, unit: "lb" }, num: 2 },
        { weight: { value: 0.5, unit: "lb" }, num: 6 },
      ]);
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
      const result = Weight.calculatePlates(Weight.build(82.3, "lb"), settings, exerciseType).plates;
      expect(result).to.eql([
        { weight: { value: 10, unit: "lb" }, num: 2 },
        { weight: { value: 5, unit: "lb" }, num: 2 },
        { weight: { value: 3, unit: "lb" }, num: 2 },
        { weight: { value: 0.5, unit: "lb" }, num: 2 },
      ]);
    });

    it("calculate on the borderline with the slow method", () => {
      const settings = buildSettings([
        { weight: { value: 45, unit: "lb" }, num: 10 },
        { weight: { value: 25, unit: "lb" }, num: 20 },
        { weight: { value: 10, unit: "lb" }, num: 20 },
        { weight: { value: 5, unit: "lb" }, num: 20 },
        { weight: { value: 2.5, unit: "lb" }, num: 10 },
        { weight: { value: 1.5, unit: "lb" }, num: 10 },
      ]);
      const result = Weight.calculatePlates(Weight.build(82.3, "lb"), settings, exerciseType).plates;
      expect(result).to.eql([
        { weight: { value: 10, unit: "lb" }, num: 2 },
        { weight: { value: 2.5, unit: "lb" }, num: 2 },
        { weight: { value: 1.5, unit: "lb" }, num: 8 },
      ]);
    });

    it("when not enough pair plates", () => {
      const settings = buildSettings([
        { weight: Weight.build(45, "lb"), num: 4 },
        { weight: Weight.build(5, "lb"), num: 4 },
        { weight: Weight.build(2.5, "lb"), num: 4 },
      ]);
      const result = Weight.calculatePlates(Weight.build(215, "lb"), settings, exerciseType).plates;
      expect(result).to.eql([
        { weight: Weight.build(45, "lb"), num: 2 },
        { weight: Weight.build(5, "lb"), num: 4 },
        { weight: Weight.build(2.5, "lb"), num: 4 },
      ]);
    });
  });

  describe(".platesWeight()", () => {
    it("calculates properly", () => {
      const plates = [
        { weight: Weight.build(45, "lb"), num: 2 },
        { weight: Weight.build(25, "lb"), num: 2 },
        { weight: Weight.build(10, "lb"), num: 2 },
        { weight: Weight.build(5, "lb"), num: 2 },
      ];
      expect(Weight.platesWeight(plates)).to.eql(Weight.build(170, "lb"));
    });
  });

  describe(".formatOneSide()", () => {
    it("returns a proper string", () => {
      const plates = [
        { weight: Weight.build(45, "lb"), num: 4 },
        { weight: Weight.build(25, "lb"), num: 2 },
        { weight: Weight.build(10, "lb"), num: 6 },
        { weight: Weight.build(5, "lb"), num: 2 },
      ];
      expect(Weight.formatOneSide(buildSettings(plates), plates, exerciseType)).to.eql("45/45/25/3x10/5");
    });
  });
});
