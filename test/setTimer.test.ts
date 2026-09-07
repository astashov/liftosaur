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
  Progress_reconcileTimedSet,
  Progress_completeSetAction,
} from "../src/models/progress";
import { IQueueableCountdownTap, Thunk_startSetTimerWork, Thunk_checkSetTimer } from "../src/ducks/thunks";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { ATOMIC_TYPES, IHistoryRecord, ISet, ISettings, IStorage, ITimedSetSide } from "../src/types";
import { History_finishProgramDay } from "../src/models/history";
import { Storage_getDefault } from "../src/models/storage";
import { runMigrations } from "../src/migrations/runner";
import { TimedSet_sideToTime } from "../src/models/timedSet";
import { Reps_addSet, Reps_group, Reps_setToDisplaySet } from "../src/models/set";
import { Exercise_getIsUnilateral } from "../src/models/exercise";

function buildProgress(text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0);
}

function phase(
  progress: IHistoryRecord,
  entryIndex: number,
  setIndex: number,
  id: string = "phase1"
): { setId: string; id: string; side: ITimedSetSide } {
  return { setId: progress.entries[entryIndex].sets[setIndex].id, id, side: "bilateral" };
}

// A completed timed set (set 0) with its clock still open — the state a timed set is in right when the
// user hits "Stop & record" / "Discard".
function buildLoggedTimedSet(text: string): IHistoryRecord {
  const progress = buildProgress(text);
  progress.entries[0].sets[0].isCompleted = true;
  progress.entries[0].sets[0].completedSetTimer = 30;
  return {
    ...progress,
    setTimer: { entryIndex: 0, setIndex: 0, ...phase(progress, 0, 0), startedAt: Date.now(), nonce: Date.now() },
  };
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
      setTimer: { entryIndex: 1, setIndex: 0, ...phase(progress, 1, 0), startedAt: Date.now(), nonce: Date.now() },
    };
    expect(Progress_getNextTimedSet(withSetTimer)).to.eql({ entryIndex: 1, setIndex: 1 });

    // After the last Plank set, it stops instead of jumping back to the incomplete untimed Squat.
    progress.entries[1].sets[1].isCompleted = true;
    progress.entries[1].sets[2].isCompleted = true;
    const afterLast: IHistoryRecord = {
      ...progress,
      setTimer: { entryIndex: 1, setIndex: 2, ...phase(progress, 1, 2), startedAt: Date.now(), nonce: Date.now() },
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
    const base = buildProgress(text);
    const progress: IHistoryRecord = {
      ...base,
      setTimerGetReady: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), startedAt, getReady: 5, nonce: 42 },
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
    const base = buildProgress(`# Week 1\n## Day 1\nBench Press / 3x1 100lb 30s|60s\n`);
    const progress: IHistoryRecord = {
      ...base,
      setTimerGetReady: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), startedAt, getReady: 5, nonce: 1 },
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
    const base = buildProgress(text);
    const progress: IHistoryRecord = {
      ...base,
      setTimerGetReady: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), startedAt, getReady: 5, nonce: 1 },
    };
    const after = Progress_checkSetTimer(settings, Stats_getEmpty(), progress, undefined, undefined, undefined);
    expect(after.setTimerGetReady).to.eql(undefined);
    expect(after.setTimer?.startedAt).to.equal(startedAt + 5000);
    expect(after.entries[0].sets[0].isCompleted).to.not.equal(true);
  });

  it("getActiveSetTimer prefers the work clock when a merge left both fields set", () => {
    const base = buildProgress(text);
    const progress: IHistoryRecord = {
      ...base,
      setTimer: { entryIndex: 0, setIndex: 1, ...phase(base, 0, 1), startedAt: 100 },
      setTimerGetReady: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0, "phase2"), startedAt: 200, getReady: 5 },
    };
    const active = Progress_getActiveSetTimer(progress);
    expect(active?.phase).to.equal("work");
    expect(active?.setIndex).to.equal(1);
  });

  it("Start now opens the work clock from the current moment", () => {
    const base = buildProgress(text);
    const progress: IHistoryRecord = {
      ...base,
      setTimerGetReady: {
        entryIndex: 0,
        setIndex: 0,
        ...phase(base, 0, 0),
        startedAt: Date.now(),
        getReady: 5,
        nonce: 7,
      },
    };
    const after = Progress_startSetTimerWork(progress, 12345);
    expect(after.setTimerGetReady).to.eql(undefined);
    expect(after.setTimer).to.eql({
      entryIndex: 0,
      setIndex: 0,
      ...phase(base, 0, 0),
      startedAt: 12345,
      nonce: 7,
    });
  });

  it("Start now is a no-op when a work clock is already running, matching the readers' precedence", () => {
    const base = buildProgress(text);
    const running = { entryIndex: 0, setIndex: 1, ...phase(base, 0, 1), startedAt: 999 };
    const progress: IHistoryRecord = {
      ...base,
      setTimer: running,
      setTimerGetReady: {
        entryIndex: 0,
        setIndex: 0,
        ...phase(base, 0, 0, "phase2"),
        startedAt: Date.now(),
        getReady: 5,
        nonce: 7,
      },
    };
    const after = Progress_startSetTimerWork(progress, 12345);
    expect(after.setTimer).to.eql(running);
    expect(after).to.equal(progress);
  });

  describe("Start now from a native surface", () => {
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
      const base = buildProgress(text);
      return {
        ...base,
        setTimerGetReady: { entryIndex: 0, setIndex, ...phase(base, 0, setIndex), startedAt, getReady: 5, nonce: 7 },
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
    const base = buildProgress(text);
    const running: IHistoryRecord = {
      ...base,
      setTimer: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), startedAt: Date.now(), nonce: 1 },
    };
    const after = Progress_completeSet(running, 0, 1, "workout", false, settingsWithGetReady(5));
    expect(after.setTimer).to.eql(undefined);
    expect(after.setTimerGetReady?.setIndex).to.equal(1);
  });

  it("tapping another timed set with no countdown replaces a running countdown with its work clock", () => {
    const base = buildProgress(text);
    const counting: IHistoryRecord = {
      ...base,
      setTimerGetReady: {
        entryIndex: 0,
        setIndex: 0,
        ...phase(base, 0, 0),
        startedAt: Date.now(),
        getReady: 5,
        nonce: 1,
      },
    };
    const after = Progress_completeSet(counting, 0, 1, "workout", false, settingsWithGetReady(undefined));
    expect(after.setTimerGetReady).to.eql(undefined);
    expect(after.setTimer?.setIndex).to.equal(1);
  });

  it("closeTimedSet drops a countdown without starting a rest", () => {
    const base = buildProgress(text);
    const progress: IHistoryRecord = {
      ...base,
      setTimerGetReady: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), startedAt: Date.now(), getReady: 5 },
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
      setTimer: { entryIndex: 0, setIndex: 0, ...phase(progress, 0, 0), startedAt: Date.now(), nonce: 1 },
      // A field-by-field merge can legally produce both; getActiveSetTimer only hides the countdown.
      setTimerGetReady: {
        entryIndex: 0,
        setIndex: 0,
        ...phase(progress, 0, 0, "phase2"),
        startedAt: Date.now(),
        getReady: 5,
        nonce: 2,
      },
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
    const straight = Progress_advanceTimedSet(withRest, Settings_build(), true);
    expect(straight.setTimerGetReady).to.eql(undefined);
    expect(straight.setTimer?.setIndex).to.equal(1);

    const withCountdown = Progress_advanceTimedSet(withRest, Settings_build(), true, 4);
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
      return {
        ...progress,
        setTimer: { entryIndex: 0, setIndex: 0, ...phase(progress, 0, 0), startedAt: Date.now(), nonce: 1 },
      };
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

describe("The recorded pair", () => {
  const text = `# Week 1\n## Day 1\nPlank / 3x1 30s|60s\n`;

  function setWith(fields: Partial<ISet>): ISet {
    return { ...buildProgress(text).entries[0].sets[0], ...fields };
  }

  it("opens on the left when only the right duration is recorded, instead of refusing to time it at all", () => {
    expect(TimedSet_sideToTime(setWith({ completedSetTimer: 30 }), true)).to.equal("left");
    expect(TimedSet_sideToTime(setWith({ completedSetTimer: 30 }), false)).to.equal(undefined);
  });

  it("walks left, then right, then stops", () => {
    expect(TimedSet_sideToTime(setWith({}), true)).to.equal("left");
    expect(TimedSet_sideToTime(setWith({ completedSetTimerLeft: 28 }), true)).to.equal("right");
    expect(TimedSet_sideToTime(setWith({ completedSetTimerLeft: 28, completedSetTimer: 30 }), true)).to.equal(
      undefined
    );
  });

  it("times a bilateral set once", () => {
    expect(TimedSet_sideToTime(setWith({}), false)).to.equal("bilateral");
    expect(TimedSet_sideToTime(setWith({ completedSetTimer: 30 }), false)).to.equal(undefined);
  });

  it("renders a half nobody recorded as missing, not as the programmed target", () => {
    const display = Reps_setToDisplaySet(setWith({ completedSetTimerLeft: 28 }), false, "lb");
    expect(display.setTimerLeft).to.equal(28);
    expect(display.setTimer).to.equal(undefined);
  });

  it("keeps the pair together under a merge, because a set is atomic", () => {
    expect(ATOMIC_TYPES).to.include("set");
  });

  it("clears the left duration when a set is added from the previous one", () => {
    const previous = setWith({ completedSetTimerLeft: 22, completedSetTimer: 20, isCompleted: true });
    const added = Reps_addSet([previous], true);
    expect(added[1].completedSetTimerLeft).to.equal(undefined);
    expect(added[1].completedSetTimer).to.equal(undefined);
    expect(TimedSet_sideToTime(added[1], true)).to.equal("left");
  });

  it("does not group two sets whose left durations differ", () => {
    const a = setWith({ completedSetTimerLeft: 22, completedSetTimer: 20 });
    const b = { ...setWith({ completedSetTimerLeft: 15, completedSetTimer: 20 }), id: "other" };
    expect(Reps_group([a, b], false).length).to.equal(2);
  });
});

describe("Unilateral set timers", () => {
  const text = `# Week 1\n## Day 1\nBulgarian Split Squat / 3x1 20lb 30s|60s\n`;
  const autoText = `# Week 1\n## Day 1\nBulgarian Split Squat / 3x1 20lb 20s|10s auto\n`;

  function settingsWith(getReady?: number): ISettings {
    const settings = Settings_build();
    return { ...settings, timers: { ...settings.timers, getReady } };
  }

  function record(
    progress: IHistoryRecord,
    settings: ISettings,
    opts: { keepTiming?: boolean; recordedSeconds?: number } = {}
  ): IHistoryRecord {
    return Progress_completeSetAction(
      settings,
      Stats_getEmpty(),
      progress,
      {
        type: "CompleteSetAction",
        entryIndex: 0,
        setIndex: 0,
        mode: "workout",
        forceUpdateEntryIndex: false,
        isExternal: false,
        isPlayground: false,
        keepSetTimerRunning: opts.keepTiming,
        recordedSeconds: opts.recordedSeconds,
      },
      undefined
    );
  }

  it("opens the clock on the left side of a unilateral set", () => {
    const progress = buildProgress(text);
    expect(Exercise_getIsUnilateral(progress.entries[0].exercise, Settings_build())).to.equal(true);
    const opened = Progress_completeSet(progress, 0, 0, "workout", false, settingsWith(undefined));
    expect(opened.setTimer?.side).to.equal("left");
  });

  it("banks the left, hands off to the right's countdown, and completes nothing yet", () => {
    const opened = Progress_completeSet(buildProgress(text), 0, 0, "workout", false, settingsWith(5));
    const started = Progress_startSetTimerWork(opened, Date.now());
    const banked = record(started, settingsWith(5), { recordedSeconds: 28 });

    expect(banked.entries[0].sets[0].completedSetTimerLeft).to.equal(28);
    expect(banked.entries[0].sets[0].completedSetTimer).to.eql(undefined);
    expect(banked.entries[0].sets[0].isCompleted).to.not.equal(true);
    expect(banked.setTimerGetReady?.side).to.equal("right");
    expect(banked.setTimerGetReady?.getReady).to.equal(5);
    expect(banked.timer).to.eql(undefined);
  });

  it("completes the set on the right half, and only then", () => {
    const opened = Progress_completeSet(buildProgress(text), 0, 0, "workout", false, settingsWith(undefined));
    const banked = record(opened, settingsWith(undefined), { recordedSeconds: 28 });
    expect(banked.setTimer?.side).to.equal("right");

    const done = record(banked, settingsWith(undefined), { recordedSeconds: 31 });
    expect(done.entries[0].sets[0].completedSetTimerLeft).to.equal(28);
    expect(done.entries[0].sets[0].completedSetTimer).to.equal(31);
    expect(done.entries[0].sets[0].isCompleted).to.equal(true);
    expect(done.timer).to.equal(60);
  });

  it("keeps a left banked early when the clock later reaches its target", () => {
    const startedAt = Date.now() - 30000;
    const base = buildProgress(text);
    const kept: IHistoryRecord = {
      ...base,
      entries: [
        {
          ...base.entries[0],
          sets: [{ ...base.entries[0].sets[0], completedSetTimerLeft: 18 }, ...base.entries[0].sets.slice(1)],
        },
      ],
      setTimer: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), side: "left", startedAt, nonce: 1 },
    };
    const after = Progress_checkSetTimer(settingsWith(5), Stats_getEmpty(), kept, undefined, undefined, undefined);
    expect(after.entries[0].sets[0].completedSetTimerLeft).to.equal(18);
    expect(after.setTimerGetReady?.side).to.equal("right");
  });

  it("keeps the banked left on a second Next side tap rather than re-deriving from the clock", () => {
    const base = buildProgress(text);
    const banked: IHistoryRecord = {
      ...base,
      entries: [
        {
          ...base.entries[0],
          sets: [{ ...base.entries[0].sets[0], completedSetTimerLeft: 18 }, ...base.entries[0].sets.slice(1)],
        },
      ],
      setTimer: {
        entryIndex: 0,
        setIndex: 0,
        ...phase(base, 0, 0),
        side: "left",
        startedAt: Date.now() - 9000,
        nonce: 1,
      },
    };
    const after = record(banked, settingsWith(undefined));
    expect(after.entries[0].sets[0].completedSetTimerLeft).to.equal(18);
    expect(after.setTimer?.side).to.equal("right");
  });

  it("makes an auto round two sides plus one countdown plus the rest", () => {
    const opened = Progress_completeSet(buildProgress(autoText), 0, 0, "workout", false, settingsWith(5));
    const started = Progress_startSetTimerWork(opened, 1000);
    const banked = record(started, settingsWith(5), { recordedSeconds: 20 });
    expect(banked.setTimerGetReady?.getReady).to.equal(5);
    const right = Progress_startSetTimerWork(banked, 26000);
    const done = record(right, settingsWith(5), { recordedSeconds: 20 });
    expect(done.timer).to.equal(5);
  });

  it("opens on the left when an auto circuit rolls from a bilateral exercise into a unilateral one", () => {
    const progress = buildProgress(
      `# Week 1\n## Day 1\nSquat / 1x5 95lb 20s|0s auto\nBulgarian Split Squat / 2x5 95lb 20s|0s auto\n`
    );
    const withClock: IHistoryRecord = {
      ...progress,
      setTimer: { entryIndex: 0, setIndex: 0, ...phase(progress, 0, 0), startedAt: Date.now(), nonce: 1 },
    };
    const advanced = Progress_advanceTimedSet(withClock, settingsWith(undefined), false, 0, Date.now());
    expect(advanced.setTimer?.entryIndex).to.equal(1);
    expect(advanced.setTimer?.side).to.equal("left");
  });

  it("times only the left when a hand edit left just a right duration", () => {
    const base = buildProgress(text);
    const rightOnly: IHistoryRecord = {
      ...base,
      entries: [
        {
          ...base.entries[0],
          sets: [{ ...base.entries[0].sets[0], completedSetTimer: 30 }, ...base.entries[0].sets.slice(1)],
        },
      ],
    };
    const opened = Progress_completeSet(rightOnly, 0, 0, "workout", false, settingsWith(undefined));
    expect(opened.setTimer?.side).to.equal("left");

    const banked = record(opened, settingsWith(undefined), { recordedSeconds: 27 });
    expect(banked.entries[0].sets[0].completedSetTimerLeft).to.equal(27);
    expect(banked.entries[0].sets[0].completedSetTimer).to.equal(30);
    expect(banked.setTimer).to.eql(undefined);
    expect(banked.setTimerGetReady).to.eql(undefined);
  });
});

describe("Reconciling a timed set", () => {
  const text = `# Week 1\n## Day 1\nPlank / 3x1 30s|60s\n`;

  function counting(startedAt: number): IHistoryRecord {
    const base = buildProgress(text);
    return {
      ...base,
      setTimerGetReady: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), startedAt, getReady: 5, nonce: 7 },
    };
  }

  it("returns the same reference when nothing is due, and again on a second pass", () => {
    const progress = counting(1000);
    expect(Progress_reconcileTimedSet(progress, 3000)).to.equal(progress);

    const settled = Progress_reconcileTimedSet(progress, 9000);
    expect(settled).to.not.equal(progress);
    expect(Progress_reconcileTimedSet(settled, 9000)).to.equal(settled);
    expect(Progress_reconcileTimedSet(settled, 999999)).to.equal(settled);
  });

  it("promotes to the boundary, not to now, so a late pass does not stretch the round", () => {
    const settled = Progress_reconcileTimedSet(counting(1000), 60000);
    expect(settled.setTimerGetReady).to.eql(undefined);
    expect(settled.setTimer?.startedAt).to.equal(6000);
  });

  it("records nothing and starts no rest — that is the completion half", () => {
    const settled = Progress_reconcileTimedSet(counting(1000), 999999);
    expect(settled.entries[0].sets[0].completedSetTimer).to.eql(undefined);
    expect(settled.entries[0].sets[0].isCompleted).to.not.equal(true);
    expect(settled.timer).to.eql(undefined);
  });
});

describe("Self-healing targets the live workout", () => {
  function runCheckSetTimer(state: unknown): unknown[] {
    const actions: unknown[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const thunk = Thunk_checkSetTimer() as any;
    thunk(
      (a: unknown) => actions.push(a),
      () => state,
      { audio: { play: () => undefined } }
    );
    return actions;
  }

  function dueAutoRest(): IHistoryRecord {
    const progress = buildProgress(`# Week 1\n## Day 1\nPlank / 3x1 20lb 20s|10s auto\n`);
    progress.entries[0].sets[0].isCompleted = true;
    return { ...progress, timer: 10, timerSince: Date.now() - 20000, timerEntryIndex: 0, timerSetIndex: 0 };
  }

  function stateWith(progress: IHistoryRecord, edited: Record<number, IHistoryRecord>): unknown {
    return {
      progress: edited,
      storage: { progress: [progress], settings: Settings_build(), programs: [], currentProgramId: undefined },
      adminKey: "test",
    };
  }

  it("checks the live workout when nothing else is open", () => {
    const progress = dueAutoRest();
    expect(Progress_isSetTimerCheckDue(progress, Date.now())).to.equal(true);
    const actions = runCheckSetTimer(stateWith(progress, {}));
    expect(actions.some((a) => (a as { type?: string })?.type === "CheckSetTimerAction")).to.equal(true);
  });

  it("dispatches nothing while a past workout is open, rather than checking that record instead", () => {
    const actions = runCheckSetTimer(
      stateWith(dueAutoRest(), { 1234: buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`) })
    );
    expect(actions).to.eql([]);
  });
});

describe("Timed set phase identity", () => {
  const text = `# Week 1\n## Day 1\nPlank / 3x1 30s|60s\n`;

  function noCountdown(): ISettings {
    const settings = Settings_build();
    return { ...settings, timers: { ...settings.timers, getReady: undefined } };
  }

  it("hides a phase whose set was deleted rather than retargeting the one that took its index", () => {
    const base = buildProgress(text);
    const progress: IHistoryRecord = {
      ...base,
      setTimer: { entryIndex: 0, setIndex: 1, ...phase(base, 0, 1), startedAt: Date.now(), nonce: 1 },
    };
    expect(Progress_getActiveSetTimer(progress)?.setIndex).to.equal(1);

    const withSetRemoved: IHistoryRecord = {
      ...progress,
      entries: [{ ...progress.entries[0], sets: [progress.entries[0].sets[0], progress.entries[0].sets[2]] }],
    };
    expect(Progress_getActiveSetTimer(withSetRemoved)).to.eql(undefined);
  });

  it("still shows a clock an older writer opened without the identity keys", () => {
    const base = buildProgress(text);
    const legacy = {
      entryIndex: 0,
      setIndex: 0,
      startedAt: Date.now(),
      nonce: 1,
    } as unknown as NonNullable<IHistoryRecord["setTimer"]>;
    const progress: IHistoryRecord = { ...base, setTimer: legacy };

    const active = Progress_getActiveSetTimer(progress);
    expect(active?.phase).to.equal("work");
    expect(active?.side).to.equal("bilateral");
  });

  it("carries one id across the countdown to work flip, so a tap made against either matches both", () => {
    const base = buildProgress(text);
    const counting: IHistoryRecord = {
      ...base,
      setTimerGetReady: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), startedAt: 1000, getReady: 5, nonce: 7 },
    };
    const after = Progress_startSetTimerWork(counting, 6000);
    expect(after.setTimer?.id).to.equal(counting.setTimerGetReady?.id);
    expect(after.setTimer?.setId).to.equal(counting.setTimerGetReady?.setId);
  });

  it("opens a clock with the set's own id, and a fresh phase id per opening", () => {
    const progress = buildProgress(text);
    const first = Progress_completeSet(progress, 0, 0, "workout", false, noCountdown());
    expect(first.setTimer?.setId).to.equal(progress.entries[0].sets[0].id);
    expect(first.setTimer?.side).to.equal("bilateral");

    const closed = Progress_closeTimedSet(first, noCountdown(), undefined, false);
    const second = Progress_completeSet(closed, 0, 0, "workout", false, noCountdown());
    expect(second.setTimer?.id).to.not.equal(first.setTimer?.id);
  });

  it("leaves no running clock on the record a finished workout becomes", () => {
    const base = buildProgress(text);
    const progress: IHistoryRecord = {
      ...base,
      setTimer: { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), startedAt: Date.now(), nonce: 1 },
      setTimerGetReady: { entryIndex: 0, setIndex: 1, ...phase(base, 0, 1), startedAt: 1, getReady: 5 },
    };
    const record = History_finishProgramDay(progress, Settings_build(), progress.day);
    expect(record.setTimer).to.eql(undefined);
    expect(record.setTimerGetReady).to.eql(undefined);
  });

  it("drops a clock written before the id key existed, in history as well as in progress", () => {
    const base = buildProgress(text);
    const legacy = { entryIndex: 0, setIndex: 0, startedAt: 500, nonce: 500 };
    const withId = { entryIndex: 0, setIndex: 0, ...phase(base, 0, 0), startedAt: 500, nonce: 500 };
    const storage = {
      ...Storage_getDefault(),
      version: "20260903120000",
      progress: [{ ...base, setTimer: legacy }],
      history: [
        { ...base, id: 1, setTimer: legacy },
        { ...base, id: 2, setTimer: withId },
      ],
    } as unknown as IStorage;

    const migrated = runMigrations(storage);
    expect(migrated.progress?.[0].setTimer).to.eql(undefined);
    expect(migrated.history[0].setTimer).to.eql(undefined);
    expect(migrated.history[1].setTimer?.id).to.equal("phase1");
  });
});
