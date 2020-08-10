import { Weight, IPlate } from "../src/models/weight";
import { ISettings } from "../src/models/settings";

function buildSettings(plates: IPlate[]): ISettings {
  return {
    plates,
    bars: {
      lb: {
        barbell: Weight.build(45, "lb"),
        ezbar: Weight.build(20, "lb"),
        dumbbell: Weight.build(10, "lb"),
      },
      kg: {
        barbell: Weight.build(20, "kg"),
        ezbar: Weight.build(10, "kg"),
        dumbbell: Weight.build(5, "kg"),
      },
    },
    timers: {
      warmup: 90,
      workout: 180,
    },
    units: "lb",
  };
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

  describe(".formatOneSide()", () => {
    it("returns a proper string", () => {
      const plates = [
        { weight: Weight.build(45, "lb"), num: 4 },
        { weight: Weight.build(25, "lb"), num: 2 },
        { weight: Weight.build(10, "lb"), num: 6 },
        { weight: Weight.build(5, "lb"), num: 2 },
      ];
      expect(Weight.formatOneSide(plates, "barbell")).toEqual("45/45/25/10/10/10/5");
    });
  });
});
