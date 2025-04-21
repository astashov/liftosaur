import "mocha";
import { expect } from "chai";
import { History } from "../src/models/history";
import { IHistoryEntry } from "../src/types";

describe("History", () => {
  describe(".getMaxSet()", () => {
    it("returns the set with the highest completed reps", () => {
      const entry: IHistoryEntry = {
        exercise: { id: "squat" },
        sets: [
          {
            reps: 10,
            completedReps: 10,
            weight: { value: 10, unit: "kg" },
            originalWeight: { value: 10, unit: "kg" },
          },
          {
            reps: 5,
            completedReps: 5,
            weight: { value: 50, unit: "kg" },
            originalWeight: { value: 50, unit: "kg" },
          },
          {
            reps: 5,
            completedReps: 6,
            isAmrap: true,
            weight: { value: 50, unit: "kg" },
            originalWeight: { value: 50, unit: "kg" },
          },
        ],
        warmupSets: [],
      };
      const maxSet = History.getMaxWeightSetFromEntry(entry);
      expect(maxSet?.weight?.value).to.eql(50);
      expect(maxSet?.completedReps).to.eql(6);
    });
  });
});
