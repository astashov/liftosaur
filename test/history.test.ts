import "mocha";
import { expect } from "chai";
import { History_getMaxWeightSetFromEntry } from "../src/models/history";
import { IHistoryEntry } from "../src/types";
import { UidFactory_generateUid } from "../src/utils/generator";

describe("History", () => {
  describe(".getMaxSet()", () => {
    it("returns the set with the highest completed reps", () => {
      const entry: IHistoryEntry = {
        vtype: "history_entry",
        index: 0,
        exercise: { id: "squat" },
        sets: [
          {
            vtype: "set",
            id: UidFactory_generateUid(6),
            index: 0,
            reps: 10,
            completedReps: 10,
            weight: { value: 10, unit: "kg" },
            isUnilateral: false,
            originalWeight: { value: 10, unit: "kg" },
          },
          {
            vtype: "set",
            id: UidFactory_generateUid(6),
            index: 1,
            reps: 5,
            completedReps: 5,
            isUnilateral: false,
            weight: { value: 50, unit: "kg" },
            originalWeight: { value: 50, unit: "kg" },
          },
          {
            vtype: "set",
            index: 2,
            id: UidFactory_generateUid(6),
            reps: 5,
            completedReps: 6,
            isAmrap: true,
            isUnilateral: false,
            weight: { value: 50, unit: "kg" },
            originalWeight: { value: 50, unit: "kg" },
          },
        ],
        warmupSets: [],
      };
      const maxSet = History_getMaxWeightSetFromEntry(entry);
      expect(maxSet?.weight?.value).to.eql(50);
      expect(maxSet?.completedReps).to.eql(6);
    });
  });
});
