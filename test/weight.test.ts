import { Weight } from "../src/models/weight";

describe("Weight", () => {
  describe(".calculatePlates()", () => {
    it("when enough pair plates", () => {
      const availablePlates = [
        { weight: 45, num: 4 },
        { weight: 25, num: 4 },
        { weight: 10, num: 4 },
        { weight: 5, num: 4 },
        { weight: 2.5, num: 4 },
      ];
      const result = Weight.calculatePlates(availablePlates, 215, 45);
      expect(result).toEqual([
        { weight: 45, num: 2 },
        { weight: 25, num: 2 },
        { weight: 10, num: 2 },
        { weight: 5, num: 2 },
      ]);
    });

    it("when not enough pair plates", () => {
      const availablePlates = [
        { weight: 45, num: 4 },
        { weight: 5, num: 4 },
        { weight: 2.5, num: 4 },
      ];
      const result = Weight.calculatePlates(availablePlates, 215, 45);
      expect(result).toEqual([
        { weight: 45, num: 2 },
        { weight: 5, num: 4 },
        { weight: 2.5, num: 4 },
      ]);
    });
  });

  describe(".platesWeight()", () => {
    it("calculates properly", () => {
      const plates = [
        { weight: 45, num: 2 },
        { weight: 25, num: 2 },
        { weight: 10, num: 2 },
        { weight: 5, num: 2 },
      ];
      expect(Weight.platesWeight(plates)).toEqual(170);
    });
  });

  describe(".formatOneSide()", () => {
    it("returns a proper string", () => {
      const plates = [
        { weight: 45, num: 4 },
        { weight: 25, num: 2 },
        { weight: 10, num: 6 },
        { weight: 5, num: 2 },
      ];
      expect(Weight.formatOneSide(plates)).toEqual("45/45/25/10/10/10/5");
    });
  });
});
