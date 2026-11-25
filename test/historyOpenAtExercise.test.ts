import "mocha";
import { expect } from "chai";
import { History_createCustomEntry, History_openAtExercise } from "../src/models/history";
import { IHistoryRecord } from "../src/types";

function makeRecord(currentEntryIndex?: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id: 1,
    date: "2026-11-24T10:00:00.000Z",
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day 1",
    startTime: 1,
    entries: [
      History_createCustomEntry({ id: "squat", equipment: "barbell" }, 0),
      History_createCustomEntry({ id: "benchPress", equipment: "barbell" }, 1),
      History_createCustomEntry({ id: "benchPress", equipment: "dumbbell" }, 2),
    ],
    currentEntryIndex,
  };
}

describe("History_openAtExercise", () => {
  it("selects the entry of the tapped exercise", () => {
    const record = History_openAtExercise(makeRecord(0), { id: "benchPress", equipment: "dumbbell" });
    expect(record.currentEntryIndex).to.equal(2);
  });

  it("keeps the saved entry when the exercise is not in the workout", () => {
    const record = History_openAtExercise(makeRecord(1), { id: "deadlift", equipment: "barbell" });
    expect(record.currentEntryIndex).to.equal(1);
  });

  it("keeps the saved entry when no exercise is given", () => {
    expect(History_openAtExercise(makeRecord(1)).currentEntryIndex).to.equal(1);
  });
});
