import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import {
  Progress_getNextTimedSet,
  Progress_getFirstIncompleteWorkoutSet,
  Progress_proceedAfterTimedSet,
  Progress_closeTimedSet,
  Progress_completeSet,
  Progress_getActiveSetTimer,
  Progress_startSetTimerWork,
  Progress_isSetTimerCheckDue,
  Progress_checkSetTimer,
  Progress_advanceTimedSet,
  Progress_changeAmrapAction,
} from "../src/models/progress";
import { IQueueableCountdownTap, Thunk_startSetTimerWork } from "../src/ducks/thunks";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { IHistoryRecord, ISettings } from "../src/types";

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

  it("advances to the paired superset exercise, not the current exercise's next set", () => {
    // Superset A interleaves the two exercises: Squat s0 → Bench s0 → Squat s1 → Bench s1. When the auto
    // rest after Squat s0 ends, "next" must be Bench's set (entry 1), not Squat's own set 1.
    const progress = buildProgress(
      `# Week 1\n## Day 1\n` +
        `Squat / 2x1 60s|15s auto / superset: A\n` +
        `Bench Press / 2x1 45s|15s auto / superset: A\n`
    );

    const withRestAfter = (entryIndex: number, setIndex: number): IHistoryRecord => ({
      ...progress,
      timerEntryIndex: entryIndex,
      timerSetIndex: setIndex,
      timer: 15,
      timerSince: Date.now(),
    });

    // Squat set 0 done, its auto rest running → next is Bench set 0 (the paired exercise), not Squat set 1.
    progress.entries[0].sets[0].isCompleted = true;
    expect(Progress_getNextTimedSet(withRestAfter(0, 0))).to.eql({ entryIndex: 1, setIndex: 0 });

    // Bench set 0 done → back to Squat set 1.
    progress.entries[1].sets[0].isCompleted = true;
    expect(Progress_getNextTimedSet(withRestAfter(1, 0))).to.eql({ entryIndex: 0, setIndex: 1 });

    // Squat set 1 done → Bench set 1.
    progress.entries[0].sets[1].isCompleted = true;
    expect(Progress_getNextTimedSet(withRestAfter(0, 1))).to.eql({ entryIndex: 1, setIndex: 1 });

    // Bench set 1 (last) done → chain stops.
    progress.entries[1].sets[1].isCompleted = true;
    expect(Progress_getNextTimedSet(withRestAfter(1, 1))).to.eql(undefined);
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

describe("Get ready countdown", () => {
  const text = `# Week 1\n## Day 1\nPlank / 3x1 30s|60s\n`;

  function settingsWithGetReady(getReady?: number): ISettings {
    const settings = Settings_build();
    return { ...settings, timers: { ...settings.timers, getReady } };
  }

  function tapSet(progress: IHistoryRecord, settings: ISettings, isPlayground?: boolean): IHistoryRecord {
    return Progress_completeSet(progress, 0, 0, "workout", false, settings, isPlayground);
  }

  it("opens the countdown instead of the work clock when getReady is set", () => {
    const progress = tapSet(buildProgress(text), settingsWithGetReady(5));
    expect(progress.setTimer).to.eql(undefined);
    expect(progress.setTimerGetReady?.entryIndex).to.equal(0);
    expect(progress.setTimerGetReady?.setIndex).to.equal(0);
    expect(progress.setTimerGetReady?.getReady).to.equal(5);
  });

  it("opens the work clock directly when getReady is unset", () => {
    const progress = tapSet(buildProgress(text), settingsWithGetReady(undefined));
    expect(progress.setTimerGetReady).to.eql(undefined);
    expect(progress.setTimer?.entryIndex).to.equal(0);
  });

  it("bypasses the countdown in the playground", () => {
    const progress = tapSet(buildProgress(text), settingsWithGetReady(5), true);
    expect(progress.setTimerGetReady).to.eql(undefined);
    expect(progress.setTimer?.entryIndex).to.equal(0);
  });

  it("promotes the countdown to the work clock at expiry, backdated to the boundary", () => {
    const settings = settingsWithGetReady(5);
    const startedAt = Date.now() - 5000;
    const progress: IHistoryRecord = {
      ...buildProgress(text),
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt, getReady: 5, nonce: 42 },
    };
    expect(Progress_isSetTimerCheckDue(progress, startedAt + 4999)).to.equal(false);
    expect(Progress_isSetTimerCheckDue(progress, startedAt + 5000)).to.equal(true);

    const after = Progress_checkSetTimer(
      settings,
      Stats_getEmpty(),
      progress,
      undefined,
      undefined,
      undefined,
      startedAt + 5000
    );
    expect(after.setTimerGetReady).to.eql(undefined);
    expect(after.setTimer?.startedAt).to.equal(startedAt + 5000);
    expect(after.setTimer?.nonce).to.equal(42);
  });

  it("settles a countdown AND an already-overdue work window in a single pass", () => {
    const settings = settingsWithGetReady(5);
    const startedAt = Date.now() - 120000;
    // Weighted on purpose: a bodyweight set opens the weight prompt, which keeps the banner up.
    const progress: IHistoryRecord = {
      ...buildProgress(`# Week 1\n## Day 1\nBench Press / 3x1 100lb 30s|60s\n`),
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt, getReady: 5, nonce: 1 },
    };
    const after = Progress_checkSetTimer(settings, Stats_getEmpty(), progress, undefined, undefined, undefined);
    expect(after.setTimerGetReady).to.eql(undefined);
    expect(after.setTimer).to.eql(undefined);
    expect(after.entries[0].sets[0].isCompleted).to.equal(true);
    expect(after.entries[0].sets[0].completedSetTimer).to.equal(30);
  });

  it("keeps the promotion when the work window isn't due yet", () => {
    const settings = settingsWithGetReady(5);
    const startedAt = Date.now() - 5000;
    const progress: IHistoryRecord = {
      ...buildProgress(text),
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt, getReady: 5, nonce: 1 },
    };
    const after = Progress_checkSetTimer(settings, Stats_getEmpty(), progress, undefined, undefined, undefined);
    expect(after.setTimerGetReady).to.eql(undefined);
    expect(after.setTimer?.startedAt).to.equal(startedAt + 5000);
    expect(after.entries[0].sets[0].isCompleted).to.not.equal(true);
  });

  it("getActiveSetTimer prefers the work clock when a merge left both fields set", () => {
    const progress: IHistoryRecord = {
      ...buildProgress(text),
      setTimer: { entryIndex: 0, setIndex: 1, startedAt: 100 },
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt: 200, getReady: 5 },
    };
    const active = Progress_getActiveSetTimer(progress);
    expect(active?.phase).to.equal("work");
    expect(active?.setIndex).to.equal(1);
  });

  it("Start now opens the work clock from the current moment", () => {
    const progress: IHistoryRecord = {
      ...buildProgress(text),
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt: Date.now(), getReady: 5, nonce: 7 },
    };
    const after = Progress_startSetTimerWork(progress, 12345);
    expect(after.setTimerGetReady).to.eql(undefined);
    expect(after.setTimer).to.eql({ entryIndex: 0, setIndex: 0, startedAt: 12345, nonce: 7 });
  });

  it("Start now is a no-op when a work clock is already running, matching the readers' precedence", () => {
    const running = { entryIndex: 0, setIndex: 1, startedAt: 999 };
    const progress: IHistoryRecord = {
      ...buildProgress(text),
      setTimer: running,
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt: Date.now(), getReady: 5, nonce: 7 },
    };
    const after = Progress_startSetTimerWork(progress, 12345);
    expect(after.setTimer).to.eql(running);
    expect(after).to.equal(progress);
  });

  describe("Start now from a native surface", () => {
    // Calling the thunk directly, because a real dispatch drags in audio and the live activity bridge.
    function runStartSetTimerWork(
      progress: IHistoryRecord,
      queuedTap?: IQueueableCountdownTap
    ): { actions: unknown[]; progress: IHistoryRecord } {
      const actions: unknown[] = [];
      const state = { progress: {}, storage: { progress: [progress], settings: Settings_build() }, adminKey: "test" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = Thunk_startSetTimerWork(queuedTap) as any;
      thunk(
        (a: unknown) => actions.push(a),
        () => state,
        { audio: { play: (): void => undefined } }
      );
      return { actions, progress };
    }

    function countdownAt(setIndex: number, startedAt: number = Date.now()): IHistoryRecord {
      return {
        ...buildProgress(text),
        setTimerGetReady: { entryIndex: 0, setIndex, startedAt, getReady: 5, nonce: 7 },
      };
    }

    it("starts the work clock at the tap, not at the moment JS got to it", () => {
      const { actions } = runStartSetTimerWork(countdownAt(0), { entryIndex: 0, setIndex: 0, tappedAt: 12345 });
      expect(actions[0]).to.eql({ type: "StartSetTimerWorkAction", startedAt: 12345 });
    });

    it("ignores a tap naming a countdown that is no longer the live one", () => {
      const { actions } = runStartSetTimerWork(countdownAt(2), { entryIndex: 0, setIndex: 0, tappedAt: 12345 });
      expect(actions.some((a) => (a as { type?: string })?.type === "StartSetTimerWorkAction")).to.equal(false);
    });

    it("ignores a tap when the countdown is gone entirely", () => {
      const { actions } = runStartSetTimerWork(buildProgress(text), { entryIndex: 0, setIndex: 0, tappedAt: 12345 });
      expect(actions.some((a) => (a as { type?: string })?.type === "StartSetTimerWorkAction")).to.equal(false);
    });

    it("skips the staleness check for in-process callers, which pass no countdown", () => {
      const { actions } = runStartSetTimerWork(countdownAt(2));
      expect(actions[0]).to.eql({ type: "StartSetTimerWorkAction", startedAt: undefined });
    });

    it("ignores a tap for a discarded countdown even when the same set was reopened", () => {
      const { actions } = runStartSetTimerWork(countdownAt(0, 5_000_000), {
        entryIndex: 0,
        setIndex: 0,
        tappedAt: 12345,
        countdownStartedAt: 4_000_000,
      });
      expect(actions.some((a) => (a as { type?: string })?.type === "StartSetTimerWorkAction")).to.equal(false);
    });

    it("accepts a tap that names the live countdown instance", () => {
      const { actions } = runStartSetTimerWork(countdownAt(0, 5_000_000), {
        entryIndex: 0,
        setIndex: 0,
        tappedAt: 12345,
        countdownStartedAt: 5_000_000,
      });
      expect(actions[0]).to.eql({ type: "StartSetTimerWorkAction", startedAt: 12345 });
    });
  });

  it("tapping another timed set replaces a running work clock with its countdown", () => {
    const running: IHistoryRecord = {
      ...buildProgress(text),
      setTimer: { entryIndex: 0, setIndex: 0, startedAt: Date.now(), nonce: 1 },
    };
    const after = Progress_completeSet(running, 0, 1, "workout", false, settingsWithGetReady(5));
    expect(after.setTimer).to.eql(undefined);
    expect(after.setTimerGetReady?.setIndex).to.equal(1);
  });

  it("tapping another timed set with no countdown replaces a running countdown with its work clock", () => {
    const counting: IHistoryRecord = {
      ...buildProgress(text),
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt: Date.now(), getReady: 5, nonce: 1 },
    };
    const after = Progress_completeSet(counting, 0, 1, "workout", false, settingsWithGetReady(undefined));
    expect(after.setTimerGetReady).to.eql(undefined);
    expect(after.setTimer?.setIndex).to.equal(1);
  });

  it("closeTimedSet drops a countdown without starting a rest", () => {
    const progress: IHistoryRecord = {
      ...buildProgress(text),
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt: Date.now(), getReady: 5 },
    };
    const after = Progress_closeTimedSet(progress, settingsWithGetReady(5), undefined, false);
    expect(after.setTimerGetReady).to.eql(undefined);
    expect(after.setTimer).to.eql(undefined);
    expect(after.timer).to.eql(undefined);
  });

  it("resolving an AMRAP clears a countdown a merge left beside the work clock", () => {
    const progress = buildProgress(text);
    progress.entries[0].sets[0].isAmrap = true;
    const merged: IHistoryRecord = {
      ...progress,
      setTimer: { entryIndex: 0, setIndex: 0, startedAt: Date.now(), nonce: 1 },
      // A field-by-field merge can legally produce both; getActiveSetTimer only hides the countdown.
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt: Date.now(), getReady: 5, nonce: 2 },
      amrapModal: { entryIndex: 0, setIndex: 0, isAmrap: true },
    };
    const after = Progress_changeAmrapAction(
      Settings_build(),
      Stats_getEmpty(),
      merged,
      { type: "ChangeAMRAPAction", entryIndex: 0, setIndex: 0, isPlayground: true, amrapValue: 8 },
      undefined
    );
    expect(after.setTimer).to.eql(undefined);
    expect(after.setTimerGetReady).to.eql(undefined);
  });

  it("advanceTimedSet opens the work clock with no countdown seconds, and the countdown with them", () => {
    const autoText = `# Week 1\n## Day 1\nPlank / 3x1 20s|10s auto\n`;
    const progress = buildProgress(autoText);
    progress.entries[0].sets[0].isCompleted = true;
    const withRest: IHistoryRecord = {
      ...progress,
      timer: 10,
      timerSince: Date.now() - 10000,
      timerEntryIndex: 0,
      timerSetIndex: 0,
      timerMode: "workout",
    };
    const straight = Progress_advanceTimedSet(withRest, true);
    expect(straight.setTimerGetReady).to.eql(undefined);
    expect(straight.setTimer?.setIndex).to.equal(1);

    const withCountdown = Progress_advanceTimedSet(withRest, true, 4);
    expect(withCountdown.setTimer).to.eql(undefined);
    expect(withCountdown.setTimerGetReady?.setIndex).to.equal(1);
    expect(withCountdown.setTimerGetReady?.getReady).to.equal(4);
  });

  describe("the auto countdown, taken out of the rest", () => {
    const autoText = `# Week 1\n## Day 1\nPlank / 3x1 20s|10s auto\n`;

    function loggedFirstSet(program: string): IHistoryRecord {
      const progress = buildProgress(program);
      progress.entries[0].sets[0].isCompleted = true;
      progress.entries[0].sets[0].completedSetTimer = 20;
      return { ...progress, setTimer: { entryIndex: 0, setIndex: 0, startedAt: Date.now(), nonce: 1 } };
    }

    it("shortens the rest by the countdown so the circuit's cadence is unchanged", () => {
      const after = Progress_proceedAfterTimedSet(loggedFirstSet(autoText), 0, 0, settingsWithGetReady(4), undefined);
      // The 10s rest becomes 6s; the other 4s is the countdown, so a round still takes 20 + 10.
      expect(after.timer).to.equal(6);
      expect(after.setTimer).to.eql(undefined);
      expect(after.setTimerGetReady).to.eql(undefined);
    });

    it("starts the countdown at the rest's deadline when the tick lands late, not a full fresh one", () => {
      const progress = buildProgress(autoText);
      progress.entries[0].sets[0].isCompleted = true;
      const restDeadline = Date.now() - 3000;
      const resting: IHistoryRecord = {
        ...progress,
        timer: 6,
        timerSince: restDeadline - 6000,
        timerEntryIndex: 0,
        timerSetIndex: 0,
        timerMode: "workout",
      };
      const after = Progress_checkSetTimer(
        settingsWithGetReady(4),
        Stats_getEmpty(),
        resting,
        undefined,
        undefined,
        undefined
      );
      // Backdated to when the rest actually ended. Reading the clock here would give a full 4s from now,
      // stretching the round by the 3s the tick was late.
      expect(after.setTimerGetReady?.startedAt).to.equal(restDeadline);
    });

    it("leaves the rest alone when getReady is unset", () => {
      const after = Progress_proceedAfterTimedSet(
        loggedFirstSet(autoText),
        0,
        0,
        settingsWithGetReady(undefined),
        undefined
      );
      expect(after.timer).to.equal(10);
    });

    it("opens the countdown for the next set when the shortened rest expires", () => {
      const progress = buildProgress(autoText);
      progress.entries[0].sets[0].isCompleted = true;
      const resting: IHistoryRecord = {
        ...progress,
        timer: 6,
        timerSince: Date.now() - 6000,
        timerEntryIndex: 0,
        timerSetIndex: 0,
        timerMode: "workout",
      };
      const after = Progress_checkSetTimer(
        settingsWithGetReady(4),
        Stats_getEmpty(),
        resting,
        undefined,
        undefined,
        undefined
      );
      expect(after.setTimer).to.eql(undefined);
      expect(after.setTimerGetReady?.setIndex).to.equal(1);
      expect(after.setTimerGetReady?.getReady).to.equal(4);
      expect(after.timer).to.eql(undefined);
    });

    it("skips the rest entirely when the countdown is as long as it", () => {
      const after = Progress_proceedAfterTimedSet(
        loggedFirstSet(`# Week 1\n## Day 1\nPlank / 3x1 20s|3s auto\n`),
        0,
        0,
        settingsWithGetReady(4),
        undefined
      );
      expect(after.timer).to.eql(undefined);
      expect(after.setTimerGetReady?.getReady).to.equal(3);
    });

    it("gives a zero-rest EMOM no countdown at all", () => {
      const after = Progress_proceedAfterTimedSet(
        loggedFirstSet(`# Week 1\n## Day 1\nPlank / 3x1 20s|0s auto\n`),
        0,
        0,
        settingsWithGetReady(4),
        undefined
      );
      expect(after.setTimerGetReady).to.eql(undefined);
      expect(after.setTimer?.setIndex).to.equal(1);
    });

    it("leaves a non-auto rest at full length, since it waits for a tap", () => {
      const after = Progress_proceedAfterTimedSet(
        loggedFirstSet(`# Week 1\n## Day 1\nPlank / 3x1 20s|10s\n`),
        0,
        0,
        settingsWithGetReady(4),
        undefined
      );
      expect(after.timer).to.equal(10);
      expect(after.setTimerGetReady).to.eql(undefined);
    });
  });
});
