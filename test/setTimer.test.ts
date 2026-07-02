import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import {
  Progress_getNextTimedSet,
  Progress_getFirstIncompleteWorkoutSet,
  Progress_proceedAfterTimedSet,
  Progress_closeTimedSet,
} from "../src/models/progress";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { IHistoryRecord } from "../src/types";

function buildProgress(text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0);
}

// A completed timed set (set 0) with its clock still open — the state a timed set is in right when the
// user hits "Stop & record" / "Discard".
function buildLoggedTimedSet(text: string): IHistoryRecord {
  const progress = buildProgress(text);
  progress.entries[0].sets[0].isCompleted = true;
  progress.entries[0].sets[0].completedSetTimer = 30;
  return { ...progress, setTimer: { entryIndex: 0, setIndex: 0, startedAt: Date.now(), nonce: Date.now() } };
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

  it("advances to the next timed set even when an earlier untimed exercise is incomplete", () => {
    // Regression: users don't work exercises top-to-bottom, so when the timed exercise isn't first, an
    // earlier untimed exercise (Squat) is still incomplete. The auto-advance must find the next Plank set,
    // not resolve "next" to the globally-first incomplete (untimed) set and silently stop the chain.
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb\nPlank / 3x1 30s|15s auto\n`);
    progress.entries[1].sets[0].isCompleted = true;

    // Rest-timer context (auto rest running after Plank set 0).
    const withRest: IHistoryRecord = {
      ...progress,
      timerEntryIndex: 1,
      timerSetIndex: 0,
      timer: 15,
      timerSince: Date.now(),
    };
    expect(Progress_getNextTimedSet(withRest)).to.eql({ entryIndex: 1, setIndex: 1 });

    // EMOM/set-timer context (banner still open on Plank set 0).
    const withSetTimer: IHistoryRecord = {
      ...progress,
      setTimer: { entryIndex: 1, setIndex: 0, startedAt: Date.now(), nonce: Date.now() },
    };
    expect(Progress_getNextTimedSet(withSetTimer)).to.eql({ entryIndex: 1, setIndex: 1 });

    // After the last Plank set, it stops instead of jumping back to the incomplete untimed Squat.
    progress.entries[1].sets[1].isCompleted = true;
    progress.entries[1].sets[2].isCompleted = true;
    const afterLast: IHistoryRecord = {
      ...progress,
      setTimer: { entryIndex: 1, setIndex: 2, startedAt: Date.now(), nonce: Date.now() },
    };
    expect(Progress_getNextTimedSet(afterLast)).to.eql(undefined);
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

  // The playground is a tap-through simulation with no rest timers (normal-set completion already skips
  // them); a timed set must behave the same — close the banner, no deferred rest, no EMOM/auto advance.
  it("proceedAfterTimedSet starts the rest timer in a workout but not in the playground", () => {
    const text = `# Week 1\n## Day 1\nPlank / 3x1 30s|15s auto\n`;

    const workout = Progress_proceedAfterTimedSet(buildLoggedTimedSet(text), 0, 0, Settings_build(), undefined, false);
    expect(workout.setTimer).to.eql(undefined);
    expect(workout.timer).to.not.eql(undefined);

    const playground = Progress_proceedAfterTimedSet(
      buildLoggedTimedSet(text),
      0,
      0,
      Settings_build(),
      undefined,
      true
    );
    expect(playground.setTimer).to.eql(undefined);
    expect(playground.timer).to.eql(undefined);
  });

  it("closeTimedSet starts the deferred rest in a workout but not in the playground", () => {
    const text = `# Week 1\n## Day 1\nPlank / 3x1 30s|15s auto\n`;

    const workout = Progress_closeTimedSet(buildLoggedTimedSet(text), Settings_build(), undefined, false);
    expect(workout.setTimer).to.eql(undefined);
    expect(workout.timer).to.not.eql(undefined);

    const playground = Progress_closeTimedSet(buildLoggedTimedSet(text), Settings_build(), undefined, true);
    expect(playground.setTimer).to.eql(undefined);
    expect(playground.timer).to.eql(undefined);
  });
});
