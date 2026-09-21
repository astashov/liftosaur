import "mocha";
import { expect } from "chai";
import { WorkoutProgressView_next } from "../src/utils/workoutProgressView";
import { IHistoryRecord } from "../src/types";

function record(overrides: Partial<IHistoryRecord> = {}): IHistoryRecord {
  return {
    id: 0,
    date: "2026-09-20T00:00:00.000Z",
    programId: "p1",
    programName: "Program",
    day: 1,
    dayName: "Day 1",
    entries: [],
    startTime: 1000,
    ...overrides,
  } as IHistoryRecord;
}

describe("WorkoutProgressView_next", () => {
  it("keeps the previous view when only timer fields and the notification flag changed", () => {
    const entries: IHistoryRecord["entries"] = [];
    const first = WorkoutProgressView_next(undefined, record({ entries }));
    const second = WorkoutProgressView_next(
      first,
      record({
        entries,
        timer: 90,
        timerSince: 5000,
        timerMode: "workout",
        ui: { nativeNotificationScheduled: true },
      })
    );
    expect(second).to.equal(first);
  });

  it("returns a new view when a picked field changed", () => {
    const first = WorkoutProgressView_next(undefined, record());
    const second = WorkoutProgressView_next(first, record({ currentEntryIndex: 2 }));
    expect(second).to.not.equal(first);
    expect(second.currentEntryIndex).to.equal(2);
  });

  it("returns a new view when the entries array identity changed", () => {
    const first = WorkoutProgressView_next(undefined, record({ entries: [] }));
    const second = WorkoutProgressView_next(first, record({ entries: [] }));
    expect(second).to.not.equal(first);
  });

  it("flattens the ui flags and defaults the current index to 0", () => {
    const view = WorkoutProgressView_next(undefined, record({ ui: { forceUpdateEntryIndex: true, isExternal: true } }));
    expect(view.forceUpdateEntryIndex).to.equal(true);
    expect(view.isExternal).to.equal(true);
    expect(view.currentEntryIndex).to.equal(0);
  });
});
