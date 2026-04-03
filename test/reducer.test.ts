import "mocha";
import { expect } from "chai";
import { buildCardsReducer } from "../src/ducks/reducer";
import { IHistoryRecord } from "../src/types";
import { Settings_build } from "../src/models/settings";
import { lb } from "lens-shmens";
import { UidFactory_generateUid } from "../src/utils/generator";

describe("buildCardsReducer", () => {
  it("handles UpdateProgress with stale entry index gracefully", () => {
    const settings = Settings_build();
    const stats = { weight: {}, length: {}, percentage: {} };
    const progress: IHistoryRecord = {
      vtype: "progress",
      date: new Date().toISOString().slice(0, 10),
      programId: "test",
      programName: "Test",
      day: 1,
      dayName: "Day 1",
      startTime: Date.now(),
      id: 0,
      entries: [
        {
          vtype: "history_entry",
          index: 0,
          id: UidFactory_generateUid(6),
          exercise: { id: "squat" },
          sets: [
            {
              vtype: "set",
              id: UidFactory_generateUid(6),
              index: 0,
              reps: 5,
              weight: { value: 100, unit: "kg" },
              isUnilateral: false,
              originalWeight: { value: 100, unit: "kg" },
            },
          ],
          warmupSets: [],
        },
      ],
    };

    const reducer = buildCardsReducer(settings, stats);
    const lbSet = lb<IHistoryRecord>().p("entries").i(3).p("sets").i(2);
    const result = reducer(progress, {
      type: "UpdateProgress",
      lensRecordings: [lbSet.recordModify((s) => ({ ...s, completedReps: 5 }))],
      desc: "blur-weight",
    });

    expect(result).to.equal(progress);
  });
});
