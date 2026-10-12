import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import { Progress_finishWorkout } from "../src/models/progress";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { Storage_fillVersions, Storage_getDefault, Storage_updateVersions } from "../src/models/storage";
import { buildState } from "../src/models/state";
import { reducer } from "../src/ducks/reducer";
import { VersionTracker } from "../src/models/versionTracker";
import {
  WorkoutOutcome_add,
  WorkoutOutcome_healthPayload,
  WorkoutOutcome_healthSaves,
  WorkoutOutcome_syncId,
} from "../src/models/workoutOutcome";
import { ATOMIC_TYPES, IHistoryRecord, IStorage, IWorkoutOutcome, STORAGE_VERSION_TYPES } from "../src/types";

(globalThis as unknown as { __HOST__: string }).__HOST__ = "https://www.liftosaur.com";

const hour = 60 * 60 * 1000;
const now = 1760000000000;

function outcome(id: number, overrides: Partial<IWorkoutOutcome> = {}): IWorkoutOutcome {
  return { vtype: "workout_outcome", id, outcome: "finish", healthSync: true, endTime: now - hour, ...overrides };
}

function record(id: number, overrides: Partial<IHistoryRecord> = {}): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(id).toISOString(),
    programId: "emptyprogram",
    programName: "Adhoc",
    day: 1,
    dayName: "Workout",
    entries: [],
    startTime: id,
    id,
    ...overrides,
  };
}

function buildProgress(): IHistoryRecord {
  const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat / 3x5 100lb / 60s\n`);
  return Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0);
}

describe("WorkoutOutcome_add", () => {
  it("keeps a backdated workout that just finished", () => {
    let outcomes: IWorkoutOutcome[] = [];
    for (let i = 1; i <= 20; i += 1) {
      outcomes = WorkoutOutcome_add(outcomes, {
        id: 1000 + i,
        outcome: "finish",
        healthSync: false,
        endTime: 1000 + i,
      });
    }
    outcomes = WorkoutOutcome_add(outcomes, { id: 5, outcome: "finish", healthSync: true, endTime: 2000 });
    expect(outcomes).to.have.lengthOf(20);
    expect(outcomes[outcomes.length - 1].id).to.equal(5);
    expect(outcomes[0].id).to.equal(1002);
  });

  it("keeps the newest 20 outcomes, sorted by end time", () => {
    let outcomes: IWorkoutOutcome[] = [];
    for (let i = 25; i >= 1; i -= 1) {
      outcomes = WorkoutOutcome_add(outcomes, { id: i, outcome: "finish", healthSync: false, endTime: i });
    }
    expect(outcomes.map((o) => o.id)).to.eql(Array.from({ length: 20 }, (_, i) => i + 6));
  });

  it("replaces an outcome with the same id", () => {
    const outcomes = WorkoutOutcome_add([outcome(1, { outcome: "discard" })], {
      id: 1,
      outcome: "finish",
      healthSync: true,
      endTime: 5,
    });
    expect(outcomes).to.eql([outcome(1, { endTime: 5 })]);
  });
});

describe("WorkoutOutcome_healthSaves", () => {
  it("returns a payload for a new finish outcome with healthSync", () => {
    const history = [
      record(100, {
        intervals: [
          [100, 200],
          [300, 400],
        ],
        endTime: 400,
      }),
    ];
    const payloads = WorkoutOutcome_healthSaves([], [outcome(100)], history, now);
    expect(payloads).to.eql([
      {
        startMs: 100,
        endMs: 400,
        calories: 0,
        intervals: [
          [100, 200],
          [300, 400],
        ],
        syncId: "liftosaur-workout-100",
      },
    ]);
  });

  it("skips outcomes that were already there", () => {
    expect(WorkoutOutcome_healthSaves([outcome(100)], [outcome(100)], [record(100)], now)).to.eql([]);
  });

  it("skips discards and finishes without healthSync", () => {
    const outcomes = [outcome(100, { outcome: "discard" }), outcome(200, { healthSync: false })];
    expect(WorkoutOutcome_healthSaves([], outcomes, [record(100), record(200)], now)).to.eql([]);
  });

  it("skips outcomes that ended more than 24 hours ago", () => {
    expect(WorkoutOutcome_healthSaves([], [outcome(100, { endTime: now - 25 * hour })], [record(100)], now)).to.eql([]);
  });

  it("skips outcomes whose history record has not arrived", () => {
    expect(WorkoutOutcome_healthSaves(undefined, [outcome(100)], [], now)).to.eql([]);
  });
});

describe("WorkoutOutcome_healthPayload", () => {
  it("falls back to startTime and endTime without intervals", () => {
    const payload = WorkoutOutcome_healthPayload(record(100, { endTime: 900 }));
    expect([payload.startMs, payload.endMs, payload.syncId]).to.eql([100, 900, WorkoutOutcome_syncId(100)]);
  });
});

describe("workout outcome writers", () => {
  it("Progress_finishWorkout writes a finish outcome for the current workout", () => {
    const progress = buildProgress();
    const storage = Progress_finishWorkout([], { ...Storage_getDefault(), progress: [progress] }, progress, true);
    const finished = storage.history[0];
    expect(storage.workoutOutcomes).to.eql([
      {
        vtype: "workout_outcome",
        id: progress.startTime,
        outcome: "finish",
        healthSync: true,
        endTime: finished.endTime,
      },
    ]);
  });

  it("Progress_finishWorkout writes no outcome when a past workout is saved", () => {
    const past = { ...record(100), endTime: 200 };
    const storage = Progress_finishWorkout([], { ...Storage_getDefault(), history: [past] }, past, true);
    expect(storage.workoutOutcomes).to.equal(undefined);
  });

  it("DeleteProgress writes a discard outcome for the current workout", () => {
    const progress = buildProgress();
    const state = buildState({ storage: { ...Storage_getDefault(), progress: [progress] }, deviceId: "test-device" });
    const newState = reducer(state, { type: "DeleteProgress", id: 0 }, []);
    const outcomes = newState.storage.workoutOutcomes ?? [];
    expect(outcomes.map((o) => [o.id, o.outcome, o.healthSync])).to.eql([[progress.startTime, "discard", false]]);
  });

  it("FinishProgramDayAction does nothing when the current workout was replaced", () => {
    const progress = buildProgress();
    const state = buildState({ storage: { ...Storage_getDefault(), progress: [progress] }, deviceId: "test-device" });
    const action = {
      type: "FinishProgramDayAction",
      id: 0,
      startTime: progress.startTime - 1,
      healthSync: true,
    } as const;
    const newState = reducer(state, action, []);
    expect(newState.storage).to.equal(state.storage);
  });

  it("FinishProgramDayAction finishes the workout it was asked to finish", () => {
    const progress = buildProgress();
    const state = buildState({ storage: { ...Storage_getDefault(), progress: [progress] }, deviceId: "test-device" });
    const action = { type: "FinishProgramDayAction", id: 0, startTime: progress.startTime, healthSync: true } as const;
    const newState = reducer(state, action, []);
    expect(newState.storage.progress).to.eql([]);
    expect(newState.storage.history.map((r) => r.id)).to.eql([progress.startTime]);
  });
});

describe("workout outcome deletion records", () => {
  it("drops deletion records older than 30 days", () => {
    const day = 24 * hour;
    const clock = sinon.useFakeTimers(now);
    try {
      let storage = Storage_fillVersions(Storage_getDefault(), "phone");
      const write = (id: number): void => {
        const next: IStorage = {
          ...storage,
          workoutOutcomes: WorkoutOutcome_add(storage.workoutOutcomes, {
            id,
            outcome: "finish",
            healthSync: false,
            endTime: Date.now(),
          }),
        };
        storage = { ...next, _versions: Storage_updateVersions(storage, next, "phone") };
      };
      for (let id = 1; id <= 21; id += 1) {
        clock.tick(1000);
        write(id);
      }
      const deletedBefore = deletedOutcomeIds(storage);
      clock.tick(31 * day);
      write(22);
      expect(deletedBefore).to.eql(["1"]);
      expect(deletedOutcomeIds(storage)).to.eql(["2"]);
    } finally {
      clock.restore();
    }
  });
});

function deletedOutcomeIds(storage: IStorage): string[] {
  const versions = storage._versions as { workoutOutcomes?: { deleted?: Record<string, number> } } | undefined;
  return Object.keys(versions?.workoutOutcomes?.deleted ?? {});
}

describe("workout outcomes on a client that does not know the type", () => {
  const oldClientTypes = {
    ...STORAGE_VERSION_TYPES,
    atomicTypes: ATOMIC_TYPES.filter((t) => t !== "workout_outcome"),
  };

  it("merges storage that holds outcomes without throwing", () => {
    const base = Storage_fillVersions(Storage_getDefault(), "phone");
    const withOutcomes: IStorage = { ...base, workoutOutcomes: [outcome(100), outcome(200)] };
    const newClient: IStorage = { ...withOutcomes, _versions: Storage_updateVersions(base, withOutcomes, "phone") };

    const tracker = new VersionTracker(oldClientTypes, { deviceId: "watch" });
    const { _versions: baseVersions, ...baseClean } = base;
    const { _versions: newVersions, ...newClean } = newClient;
    const merge = (): unknown => {
      tracker.mergeVersions(baseVersions || {}, newVersions || {});
      return tracker.mergeByVersions(baseClean, baseVersions || {}, newVersions || {}, newClean);
    };
    expect(merge).to.not.throw();
  });

  it("updates versions of storage that holds outcomes without throwing", () => {
    const { _versions: baseVersions, ...base } = Storage_fillVersions(Storage_getDefault(), "phone");
    const withOutcomes = { ...base, workoutOutcomes: [outcome(100)] };
    const tracker = new VersionTracker(oldClientTypes, { deviceId: "watch" });
    const update = (): unknown =>
      tracker.updateVersions(base, withOutcomes, baseVersions || {}, baseVersions || {}, Date.now());
    expect(update).to.not.throw();
  });
});
