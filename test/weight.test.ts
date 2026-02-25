import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import { Weight_build, Weight_calculatePlates, Weight_platesWeight, Weight_formatOneSide } from "../src/models/weight";
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
});
