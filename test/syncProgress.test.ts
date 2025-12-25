import "mocha";
import { expect } from "chai";
import { MockReducer } from "./utils/mockReducer";
import { Thunk } from "../src/ducks/thunks";
import sinon from "sinon";
import { Encoder } from "../src/utils/encoder";
import { NodeEncoder } from "../lambda/utils/nodeEncoder";
import { SyncTestUtils } from "./utils/syncTestUtils";
import { lb } from "lens-shmens";
import { IHistoryRecord } from "../src/types";
import { Progress } from "../src/models/progress";

describe("sync progress", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    // @ts-ignore
    global.__API_HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__ENV__ = "prod";
    // @ts-ignore
    global.__FULL_COMMIT_HASH__ = "abc123";
    // @ts-ignore
    global.Rollbar = {
      configure: () => undefined,
    };
    let ts = 0;
    sandbox = sinon.createSandbox();
    sandbox.stub(Date, "now").callsFake(() => {
      ts += 1;
      return ts;
    });
    sandbox.stub(Encoder, "encode").callsFake((...args) => {
      return NodeEncoder.encode(...args);
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("starting progress on 2 devices independently picks latest workout", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    await SyncTestUtils.startWorkout(mockReducer2);
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[3, 4]]));
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [2, 2]]));
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run(
      SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [undefined, 4, 3], [3, 3]])
    );
    await mockReducer.run([Thunk.sync2({ force: true })]);
    const completedSets = Progress.getProgress(mockReducer.state)?.entries.map((e) =>
      e.sets.map((s) => `${[s.completedReps, s.isCompleted]}`)
    );
    expect(completedSets).to.eql([
      ["3,true", "4,true", ",false"],
      ["2,true", "4,false", "3,true"],
      ["3,true", "3,true", ",false"],
    ]);
  });

  it("finishing 2 progress without network should resolve in single workout", async () => {
    const { mockReducer, env, mockFetch } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    await SyncTestUtils.startWorkout(mockReducer2);
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[3, 4, 3]]));
    await mockReducer.run([Thunk.sync2({ force: true })]);
    mockFetch.hasConnection = false;
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [2, 2]]));
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [1, 1]]));
    await SyncTestUtils.finishWorkout(mockReducer);
    await SyncTestUtils.finishWorkout(mockReducer2);
    mockFetch.hasConnection = true;
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer.run([Thunk.sync2({ force: true })]);
    const historyIds1 = mockReducer.state.storage.history.map((h) => h.startTime);
    const historyIds2 = mockReducer2.state.storage.history.map((h) => h.startTime);
    expect(historyIds1.length).to.equal(1);
    expect(historyIds2.length).to.equal(1);
    const completedSets1 = mockReducer.state.storage.history[0].entries.map((e) => ({
      name: e.exercise.id,
      sets: e.sets.map((s) => [s.completedReps, s.isCompleted]),
    }));
    const completedSets2 = mockReducer2.state.storage.history[0].entries.map((e) => ({
      name: e.exercise.id,
      sets: e.sets.map((s) => [s.completedReps, s.isCompleted]),
    }));
    const expectedSets = [
      {
        name: "bentOverRow",
        sets: [
          [3, true],
          [4, true],
          [3, true],
        ],
      },
      {
        name: "benchPress",
        sets: [
          [1, true],
          [1, true],
          [undefined, false],
        ],
      },
      {
        name: "squat",
        sets: [
          [undefined, false],
          [undefined, false],
          [undefined, false],
        ],
      },
    ];
    expect(completedSets1).to.eql(expectedSets);
    expect(completedSets2).to.eql(expectedSets);
  });

  it("completing sets on different entries from different devices preserves both", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // Device A completes entry 0 sets
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    // Device B completes entry 1 sets
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [4, 4, 4]]));

    // Sync and verify both entries have their sets preserved
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    const entry0Sets = Progress.getProgress(mockReducer.state)!.entries[0].sets.map((s) => [
      s.completedReps,
      s.isCompleted,
    ]);
    const entry1Sets = Progress.getProgress(mockReducer.state)!.entries[1].sets.map((s) => [
      s.completedReps,
      s.isCompleted,
    ]);

    expect(entry0Sets).to.eql([
      [5, true],
      [5, true],
      [5, true],
    ]);
    expect(entry1Sets).to.eql([
      [4, true],
      [4, true],
      [4, true],
    ]);
  });

  it("different sets on same entry from different devices merge correctly", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // Device A completes sets 0 and 1 on entry 0
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5]]));

    // Device B completes set 2 on entry 0 (the AMRAP set)
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run(
      SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[undefined, undefined, 8]])
    );

    // Sync both devices
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    const entry0Sets = Progress.getProgress(mockReducer.state)!.entries[0].sets.map((s) => [
      s.completedReps,
      s.isCompleted,
    ]);

    expect(entry0Sets).to.eql([
      [5, true],
      [5, true],
      [8, true],
    ]);
  });

  it("notes field syncs independently from sets", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // Device A adds notes to entry 0
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("notes").record("Note from device A")],
        desc: "Add notes",
      },
    ]);

    // Device B completes sets on entry 0
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[5, 5, 5]]));

    // Sync
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // Both notes and sets should be preserved
    expect(Progress.getProgress(mockReducer.state)!.entries[0].notes).to.equal("Note from device A");
    const entry0Sets = Progress.getProgress(mockReducer.state)!.entries[0].sets.map((s) => [
      s.completedReps,
      s.isCompleted,
    ]);
    expect(entry0Sets).to.eql([
      [5, true],
      [5, true],
      [5, true],
    ]);
  });

  it("warmupSets and state sync independently", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // Device A modifies warmupSets
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [
          lb<IHistoryRecord>()
            .p("entries")
            .i(0)
            .p("warmupSets")
            .record([
              {
                vtype: "set",
                weight: { value: 45, unit: "lb" },
                reps: 10,
                completedReps: 10,
                isCompleted: true,
                index: 0,
              },
            ]),
        ],
        desc: "Add warmup set",
      },
    ]);

    // Device B modifies state
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("state").record({ testVar: 123 })],
        desc: "Modify state",
      },
    ]);

    // Sync
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // Both warmupSets and state should be preserved
    expect(Progress.getProgress(mockReducer.state)!.entries[0].warmupSets.length).to.equal(1);
    expect(Progress.getProgress(mockReducer.state)!.entries[0].state).to.deep.equal({ testVar: 123 });
  });

  it("progress timer fields sync independently", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // Device A updates timer
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("timer").record(60)],
        desc: "Set timer",
      },
    ]);

    // Device B updates timerSince
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("timerSince").record(1000)],
        desc: "Set timerSince",
      },
    ]);

    // Sync
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // Both timer fields should be preserved
    expect(Progress.getProgress(mockReducer.state)!.timer).to.equal(60);
    expect(Progress.getProgress(mockReducer.state)!.timerSince).to.equal(1000);
  });

  it("start workout on device A, continue on device B", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    // Start on device A
    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5]]));
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // Continue on device B
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    expect(mockReducer2.state.storage.progress).to.not.be.undefined;
    await mockReducer2.run(
      SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[undefined, undefined, 8]])
    );

    // Sync back
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    const entry0Sets = Progress.getProgress(mockReducer.state)!.entries[0].sets.map((s) => [
      s.completedReps,
      s.isCompleted,
    ]);
    expect(entry0Sets).to.eql([
      [5, true],
      [5, true],
      [8, true],
    ]);
  });

  it("three-way sync between devices", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    const mockReducer3 = MockReducer.clone(mockReducer, "web_789", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk.sync2({ force: true })]);

    // All devices sync to get the progress
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer3.run([Thunk.sync2({ force: true })]);

    // Each device completes different entries
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [4, 4, 4]]));
    await mockReducer3.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer3.state, [[], [], [3, 3, 3]]));

    // Sync all devices
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer3.run([Thunk.sync2({ force: true })]);
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    await mockReducer3.run([Thunk.sync2({ force: true })]);

    const expectedEntries = [
      [
        [5, true],
        [5, true],
        [5, true],
      ],
      [
        [4, true],
        [4, true],
        [4, true],
      ],
      [
        [3, true],
        [3, true],
        [3, true],
      ],
    ];

    // Verify all three devices have the same merged state
    for (const reducer of [mockReducer, mockReducer2, mockReducer3]) {
      const entries = Progress.getProgress(reducer.state)!.entries.map((e) =>
        e.sets.map((s) => [s.completedReps, s.isCompleted])
      );
      expect(entries).to.eql(expectedEntries);
    }
  });

  it("finish workout on device A while device B continues editing", async () => {
    const { mockReducer, env, mockFetch } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk.sync2({ force: true })]);
    await mockReducer2.run([Thunk.sync2({ force: true })]);

    // Device A completes and finishes
    await mockReducer.run(
      SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [
        [5, 5, 5],
        [5, 5, 5],
        [5, 5, 5],
      ])
    );

    mockFetch.hasConnection = false;
    await SyncTestUtils.finishWorkout(mockReducer);

    // Device B makes edits without knowing A finished
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("notes").record("B's notes")],
        desc: "Add notes",
      },
    ]);

    mockFetch.hasConnection = true;
    await mockReducer.run([Thunk.sync2({ force: true })]);
    console.log("Syncing B");
    await mockReducer2.run([Thunk.sync2({ force: true })]);
    console.log("Syncing C");
    await mockReducer.run([Thunk.sync2({ force: true })]);
    console.log("Syncing D");

    // Both devices should have the history record
    expect(mockReducer.state.storage.history.length).to.equal(1);
    expect(mockReducer2.state.storage.history.length).to.equal(1);

    // Progress should be cleared on both devices (A's finish wins since it's later)
    expect(Progress.getProgress(mockReducer.state)).to.be.undefined;
    expect(Progress.getProgress(mockReducer2.state)).to.be.undefined;
  });
});
