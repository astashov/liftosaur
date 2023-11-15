import { Settings } from "../src/models/settings";
import { Weight } from "../src/models/weight";
import { IPlate, ISettings } from "../src/types";
import util from "util";

function buildSettings(plates: IPlate[], bar: number = 45): ISettings {
  const settings = Settings.build();
  settings.equipment.barbell!.plates = plates;
  settings.equipment.barbell!.bar = { lb: Weight.build(bar, "lb"), kg: Weight.build(Math.floor(bar / 2), "kg") };
  return settings;
}

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
      const result = Weight.calculatePlates(Weight.build(215, "lb"), settings, "barbell").plates;
      expect(result).toEqual([
        { weight: Weight.build(45, "lb"), num: 2 },
        { weight: Weight.build(25, "lb"), num: 2 },
        { weight: Weight.build(10, "lb"), num: 2 },
        { weight: Weight.build(5, "lb"), num: 2 },
      ]);
    });

    it("when not enough pair plates", () => {
      const settings = buildSettings([
        { weight: Weight.build(45, "lb"), num: 4 },
        { weight: Weight.build(5, "lb"), num: 4 },
        { weight: Weight.build(2.5, "lb"), num: 4 },
      ]);
      const result = Weight.calculatePlates(Weight.build(215, "lb"), settings, "barbell").plates;
      expect(result).toEqual([
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
      expect(Weight.platesWeight(plates)).toEqual(Weight.build(170, "lb"));
    });
  });

  describe.only(".formatOneSide()", () => {
    it("returns a proper string", () => {
      const plates = [
        { weight: Weight.build(45, "lb"), num: 4 },
        { weight: Weight.build(25, "lb"), num: 2 },
        { weight: Weight.build(10, "lb"), num: 6 },
        { weight: Weight.build(5, "lb"), num: 2 },
      ];
      expect(Weight.formatOneSide(buildSettings(plates), plates, "barbell")).toEqual("45/45/25/3x10/5");
    });

    it.only("returns a proper string 2", () => {
      const plates = [
        { weight: Weight.build(45, "lb"), num: 10 },
        { weight: Weight.build(25, "lb"), num: 4 },
        { weight: Weight.build(10, "lb"), num: 6 },
        { weight: Weight.build(5, "lb"), num: 4 },
        { weight: Weight.build(2.5, "lb"), num: 2 },
        { weight: Weight.build(1.25, "lb"), num: 2 },
      ];
      const rounded = Weight.calculatePlates(Weight.build(155, "lb"), buildSettings(plates, 35), "barbell");
      console.log(util.inspect(rounded, false, null, true /* enable colors */));
    });
  });
});
