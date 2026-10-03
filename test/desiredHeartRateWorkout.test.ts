import "mocha";
import { expect } from "chai";
import { DesiredHeartRateWorkout_fromProgress } from "../src/models/desiredHeartRateWorkout";
import { IHistoryRecord, IIntervals } from "../src/types";

function buildProgress(id: number, intervals: IIntervals | undefined): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(1000).toISOString(),
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day 1",
    entries: [],
    startTime: 1000,
    id,
    intervals,
  };
}

describe("DesiredHeartRateWorkout_fromProgress", () => {
  it("wants nothing without a current workout", () => {
    const none = { workoutId: undefined, status: "none", expectWatch: false };
    expect(DesiredHeartRateWorkout_fromProgress(undefined, true)).to.eql(none);
    expect(DesiredHeartRateWorkout_fromProgress(buildProgress(1000, [[1000, undefined]]), true)).to.eql(none);
  });

  it("wants a running workout keyed by start time while the last interval is open", () => {
    expect(DesiredHeartRateWorkout_fromProgress(buildProgress(0, [[1000, undefined]]), false)).to.eql({
      workoutId: 1000,
      status: "running",
      expectWatch: false,
    });
  });

  it("wants a paused workout when the last interval is closed", () => {
    expect(DesiredHeartRateWorkout_fromProgress(buildProgress(0, [[1000, 2000]]), false)).to.eql({
      workoutId: 1000,
      status: "paused",
      expectWatch: false,
    });
  });

  it("expects the watch only for subscribers, because only they get the watch app launched from the phone", () => {
    expect(DesiredHeartRateWorkout_fromProgress(buildProgress(0, [[1000, undefined]]), true).expectWatch).to.equal(
      true
    );
  });
});
