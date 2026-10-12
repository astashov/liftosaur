import "mocha";
import { expect } from "chai";
import { WatchHealthDecision_decide } from "../src/models/watchHealthDecision";
import { IHistoryRecord, IWorkoutOutcome } from "../src/types";

const now = 1760000000000;
const minute = 60 * 1000;

function progress(startTime: number): IHistoryRecord {
  return {
    vtype: "progress",
    date: new Date(startTime).toISOString(),
    programId: "emptyprogram",
    programName: "Adhoc",
    day: 1,
    dayName: "Workout",
    entries: [],
    startTime,
    id: 0,
  };
}

function outcome(id: number, overrides: Partial<IWorkoutOutcome> = {}): IWorkoutOutcome {
  return { vtype: "workout_outcome", id, outcome: "finish", healthSync: true, endTime: now - minute, ...overrides };
}

describe("WatchHealthDecision_decide", () => {
  it("starts a session bound to the active workout when there is none", () => {
    const decision = WatchHealthDecision_decide({
      progress: progress(100),
      outcomes: [],
      binding: undefined,
      hasSession: false,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "start", binding: { id: 100 } });
  });

  it("does nothing without a session and without a workout", () => {
    const decision = WatchHealthDecision_decide({
      progress: undefined,
      outcomes: [outcome(100)],
      binding: { id: 100 },
      hasSession: false,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "none" });
  });

  it("ends and saves at the outcome's end time for a finish with healthSync", () => {
    const decision = WatchHealthDecision_decide({
      progress: undefined,
      outcomes: [outcome(100)],
      binding: { id: 100 },
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "end", save: true, endTime: now - minute, reason: "finish" });
  });

  it("ends without saving for a finish without healthSync", () => {
    const decision = WatchHealthDecision_decide({
      progress: undefined,
      outcomes: [outcome(100, { healthSync: false })],
      binding: { id: 100 },
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "end", save: false, endTime: now - minute, reason: "finish" });
  });

  it("ends without saving for a discard", () => {
    const decision = WatchHealthDecision_decide({
      progress: undefined,
      outcomes: [outcome(100, { outcome: "discard" })],
      binding: { id: 100 },
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "end", save: false, reason: "discard" });
  });

  it("ends the bound workout even when the next workout already started", () => {
    const decision = WatchHealthDecision_decide({
      progress: progress(200),
      outcomes: [outcome(100)],
      binding: { id: 100 },
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "end", save: true, endTime: now - minute, reason: "finish" });
  });

  it("keeps the session for the same workout and clears missingSince", () => {
    const decision = WatchHealthDecision_decide({
      progress: progress(100),
      outcomes: [],
      binding: { id: 100, missingSince: now - minute },
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "keep", binding: { id: 100 } });
  });

  it("rebinds to the active workout when its start time changed", () => {
    const decision = WatchHealthDecision_decide({
      progress: progress(150),
      outcomes: [],
      binding: { id: 100 },
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "keep", binding: { id: 150 } });
  });

  it("binds a session that has no binding yet", () => {
    const decision = WatchHealthDecision_decide({
      progress: progress(100),
      outcomes: [],
      binding: undefined,
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "keep", binding: { id: 100 } });
  });

  it("starts the missing clock when there is no workout and no outcome", () => {
    const decision = WatchHealthDecision_decide({
      progress: undefined,
      outcomes: [],
      binding: { id: 100 },
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "keep", binding: { id: 100, missingSince: now } });
  });

  it("starts the missing clock for a session without a binding", () => {
    const decision = WatchHealthDecision_decide({
      progress: undefined,
      outcomes: [],
      binding: undefined,
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "keep", binding: { missingSince: now } });
  });

  it("keeps the session just before 30 minutes without a workout", () => {
    const decision = WatchHealthDecision_decide({
      progress: undefined,
      outcomes: [],
      binding: { id: 100, missingSince: now - 30 * minute + 1 },
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "keep", binding: { id: 100, missingSince: now - 30 * minute + 1 } });
  });

  it("ends without saving after 30 minutes without a workout", () => {
    const decision = WatchHealthDecision_decide({
      progress: undefined,
      outcomes: [],
      binding: { id: 100, missingSince: now - 30 * minute },
      hasSession: true,
      nowMs: now,
    });
    expect(decision).to.eql({ type: "end", save: false, reason: "missing" });
  });
});
