import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import {
  Progress_changeAmrapAction,
  Progress_checkSetTimer,
  Progress_closeTimedSet,
  Progress_completeSetAction,
  Progress_finishWorkout,
  Progress_startTimer,
  Progress_stopTimer,
} from "../src/models/progress";
import { History_resumeWorkout } from "../src/models/history";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { Storage_getDefault } from "../src/models/storage";
import { IHistoryRecord, ISettings, ISubscription } from "../src/types";
import { INativeEffect, NativeEffects_apply } from "../src/models/nativeEffects";
import { MockBridges_build } from "./utils/mockBridges";

(globalThis as unknown as { __HOST__: string }).__HOST__ = "https://www.liftosaur.com";

const subscribed: ISubscription = { apple: [], google: [], key: "test-key" };
const free: ISubscription = { apple: [], google: [] };

function buildProgress(text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0);
}

function types(effects: INativeEffect[]): string[] {
  return effects.map((e) => e.type);
}

function completeSet(
  effects: INativeEffect[],
  progress: IHistoryRecord,
  entryIndex: number,
  setIndex: number,
  settings: ISettings = Settings_build(),
  subscription: ISubscription = subscribed
): IHistoryRecord {
  return Progress_completeSetAction(
    effects,
    settings,
    Stats_getEmpty(),
    progress,
    {
      type: "CompleteSetAction",
      entryIndex,
      setIndex,
      mode: "workout",
      forceUpdateEntryIndex: false,
      isExternal: false,
      isPlayground: false,
    },
    subscription
  );
}

describe("Native effects", () => {
  it("completing a set resumes the workout, starts the rest timer and updates the live activity", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    completeSet(effects, progress, 0, 0);
    expect(types(effects)).to.eql(["startTimer", "resumeWorkout", "updateLiveActivity"]);
  });

  it("gives a free user no rest notification and no live activity", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    completeSet(effects, progress, 0, 0, Settings_build(), free);
    expect(types(effects)).to.eql(["resumeWorkout"]);
  });

  it("carries the rest duration and the next set's text into the startTimer payload", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    completeSet(effects, progress, 0, 0);
    const start = effects.find((e) => e.type === "startTimer");
    expect(start?.type === "startTimer" && start.params.timerSeconds).to.equal(60);
    expect(start?.type === "startTimer" && start.params.title).to.equal("It's time for the next set!");
  });

  it("resumes only once, since the second set finds the workout already running", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const firstEffects: INativeEffect[] = [];
    const afterFirst = completeSet(firstEffects, progress, 0, 0);
    const secondEffects: INativeEffect[] = [];
    completeSet(secondEffects, afterFirst, 0, 1);
    expect(types(firstEffects)).to.contain("resumeWorkout");
    expect(types(secondEffects)).to.not.contain("resumeWorkout");
  });

  it("marks the first resume as a start, so the watch workout begins", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    completeSet(effects, progress, 0, 0);
    const resume = effects.find((e) => e.type === "resumeWorkout");
    expect(resume?.type === "resumeWorkout" && resume.isStart).to.equal(true);
    expect(resume?.type === "resumeWorkout" && resume.hasSubscription).to.equal(true);
  });

  it("stops the timer when the last set of the workout is done", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 1x5 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    completeSet(effects, progress, 0, 0);
    expect(types(effects)[0]).to.equal("stopTimer");
  });

  it("stops the timer when a workout is finished", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    Progress_finishWorkout(effects, { ...Storage_getDefault(), progress: [progress] }, progress);
    expect(types(effects)).to.eql(["stopTimer"]);
  });

  it("closing a timed set banner starts the deferred rest", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nPlank / 3x1 30s|60s\n`);
    progress.entries[0].sets[0].isCompleted = true;
    progress.entries[0].sets[0].completedSetTimer = 30;
    const withClock: IHistoryRecord = {
      ...progress,
      setTimer: {
        entryIndex: 0,
        setIndex: 0,
        setId: progress.entries[0].sets[0].id,
        id: "phase1",
        side: "bilateral",
        startedAt: Date.now(),
        nonce: Date.now(),
      },
    };
    const effects: INativeEffect[] = [];
    Progress_closeTimedSet(effects, withClock, Settings_build(), subscribed, false);
    expect(types(effects)).to.contain("startTimer");
  });

  it("gives the playground no effects at all", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    Progress_completeSetAction(
      effects,
      Settings_build(),
      Stats_getEmpty(),
      progress,
      {
        type: "CompleteSetAction",
        entryIndex: 0,
        setIndex: 0,
        mode: "workout",
        forceUpdateEntryIndex: false,
        isExternal: false,
        isPlayground: true,
      },
      undefined
    );
    expect(effects).to.eql([]);
  });

  it("resolving an AMRAP starts the rest and updates the live activity", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5+ 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    Progress_changeAmrapAction(
      effects,
      Settings_build(),
      Stats_getEmpty(),
      progress,
      {
        type: "ChangeAMRAPAction",
        entryIndex: 0,
        setIndex: 0,
        isPlayground: false,
        amrapValue: 5,
      },
      subscribed
    );
    expect(types(effects)).to.contain("startTimer");
    expect(types(effects)).to.contain("updateLiveActivity");
  });

  it("a check that is not due sends nothing", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    Progress_checkSetTimer(effects, Settings_build(), Stats_getEmpty(), progress, subscribed, undefined, undefined);
    expect(effects).to.eql([]);
  });

  it("resuming a paused workout sends resumeWorkout, not a start", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const paused: IHistoryRecord = { ...progress, intervals: [[Date.now() - 60000, Date.now() - 1000]] };
    const effects: INativeEffect[] = [];
    History_resumeWorkout(effects, paused, false, 30, true);
    const resume = effects.find((e) => e.type === "resumeWorkout");
    expect(resume?.type === "resumeWorkout" && resume.isStart).to.equal(false);
    expect(resume?.type === "resumeWorkout" && resume.reminder).to.equal(30);
  });

  it("sends nothing when the workout is already running", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    const running: IHistoryRecord = { ...progress, intervals: [[Date.now() - 60000, undefined]] };
    const effects: INativeEffect[] = [];
    History_resumeWorkout(effects, running, false, 30, true);
    expect(effects).to.eql([]);
  });

  it("an overrun rest stops the timer instead of scheduling one", () => {
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
    progress.entries[0].sets[0].isCompleted = true;
    const effects: INativeEffect[] = [];
    Progress_startTimer(effects, progress, Date.now() - 120000, "workout", 0, 0, Settings_build(), subscribed, 60);
    expect(types(effects)).to.eql(["stopTimer"]);
  });

  it("runs the bridges in list order", () => {
    const bridges = MockBridges_build();
    NativeEffects_apply(bridges, [
      { type: "stopTimer" },
      { type: "discardWorkout" },
      { type: "sendDiscardWorkoutToWatch" },
      { type: "resetWatchWorkoutState" },
      { type: "pauseWorkout" },
      { type: "resumeWorkout", reminder: 30, isStart: true, hasSubscription: true },
    ]);
    expect(bridges.log.names()).to.eql([
      "timer.stopTimer",
      "workout.discardWorkout",
      "watch.sendDiscardWorkoutToWatch",
      "mirroring.resetWatchWorkoutState",
      "workout.pauseWorkout",
      "workout.resumeWorkout",
    ]);
  });

  it("sends a stopTimer through to the timer bridge only once per effect", () => {
    const bridges = MockBridges_build();
    const progress = buildProgress(`# Week 1\n## Day 1\nSquat / 1x5 100lb / 60s\n`);
    const effects: INativeEffect[] = [];
    Progress_stopTimer(effects, progress);
    NativeEffects_apply(bridges, effects);
    expect(bridges.log.names()).to.eql(["timer.stopTimer"]);
  });
});
