import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import { Progress_getNextTimedSet, Progress_getFirstIncompleteWorkoutSet } from "../src/models/progress";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { IHistoryRecord } from "../src/types";

function buildProgress(text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0);
}

describe("Set timer triggering", () => {
  it("carries setTimer/auto from liftoscript into the workout set", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nPlank / 1x1 30s|0s\n`);
    const set = progress.entries[0].sets[0];
    expect(set.setTimer).to.equal(30);
  });

  it("Progress_getNextTimedSet returns the first incomplete timed set", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb\nPlank / 1x1 30s|0s\n`);
    // Squat (entry 0) is not timed, so the next timed set is the first incomplete set overall only
    // once Squat's incomplete sets are gone; with everything incomplete, the first incomplete set is
    // Squat (not timed), so no timer modal should open yet.
    expect(Progress_getNextTimedSet(progress)).to.eql(undefined);

    // Finish all of Squat's sets — now the first incomplete workout set is the timed Plank.
    for (const set of progress.entries[0].sets) {
      set.isCompleted = true;
    }
    expect(Progress_getFirstIncompleteWorkoutSet(progress)).to.eql({ entryIndex: 1, setIndex: 0 });
    expect(Progress_getNextTimedSet(progress)).to.eql({ entryIndex: 1, setIndex: 0 });
  });

  it("opens immediately when the very first set is timed", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nPower Clean / 5x5 135lb 60s|0s auto\n`);
    expect(Progress_getNextTimedSet(progress)).to.eql({ entryIndex: 0, setIndex: 0 });
    expect(progress.entries[0].sets[0].auto).to.equal(true);
    expect(progress.entries[0].sets[0].setTimer).to.equal(60);
  });

  it("returns undefined once all timed sets are completed", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nPlank / 2x1 30s|0s\n`);
    expect(Progress_getNextTimedSet(progress)).to.eql({ entryIndex: 0, setIndex: 0 });
    progress.entries[0].sets[0].isCompleted = true;
    expect(Progress_getNextTimedSet(progress)).to.eql({ entryIndex: 0, setIndex: 1 });
    progress.entries[0].sets[1].isCompleted = true;
    expect(Progress_getNextTimedSet(progress)).to.eql(undefined);
  });
});
