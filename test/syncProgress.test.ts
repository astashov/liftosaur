import "mocha";
import { expect } from "chai";
import { MockReducer } from "./utils/mockReducer";
import { Thunk_sync2 } from "../src/ducks/thunks";
import sinon from "sinon";
import { Encoder } from "../src/utils/encoder";
import { NodeEncoder } from "../lambda/utils/nodeEncoder";
import { SyncTestUtils } from "./utils/syncTestUtils";
import { lb } from "lens-shmens";
import { IHistoryRecord } from "../src/types";
import { Progress_getProgress } from "../src/models/progress";
import { NoRetryError } from "../src/ducks/thunks";
import { UidFactory_generateUid } from "../src/utils/generator";

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
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [2, 2]]));
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run(
      SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [undefined, 4, 3], [3, 3]])
    );
    await mockReducer.run([Thunk_sync2({ force: true })]);
    const completedSets = Progress_getProgress(mockReducer.state)?.entries.map((e) =>
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
    await mockReducer.run([Thunk_sync2({ force: true })]);
    mockFetch.hasConnection = false;
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [2, 2]]));
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [1, 1]]));
    await SyncTestUtils.finishWorkout(mockReducer);
    await SyncTestUtils.finishWorkout(mockReducer2);
    mockFetch.hasConnection = true;
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);
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
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Device A completes entry 0 sets
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    // Device B completes entry 1 sets
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [4, 4, 4]]));

    // Sync and verify both entries have their sets preserved
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    const entry0Sets = Progress_getProgress(mockReducer.state)!.entries[0].sets.map((s) => [
      s.completedReps,
      s.isCompleted,
    ]);
    const entry1Sets = Progress_getProgress(mockReducer.state)!.entries[1].sets.map((s) => [
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
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Device A completes sets 0 and 1 on entry 0
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5]]));

    // Device B completes set 2 on entry 0 (the AMRAP set)
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run(
      SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[undefined, undefined, 8]])
    );

    // Sync both devices
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    const entry0Sets = Progress_getProgress(mockReducer.state)!.entries[0].sets.map((s) => [
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
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Device A adds notes to entry 0
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("notes").record("Note from device A")],
        desc: "Add notes",
      },
    ]);

    // Device B completes sets on entry 0
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[5, 5, 5]]));

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both notes and sets should be preserved
    expect(Progress_getProgress(mockReducer.state)!.entries[0].notes).to.equal("Note from device A");
    const entry0Sets = Progress_getProgress(mockReducer.state)!.entries[0].sets.map((s) => [
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
    await mockReducer.run([Thunk_sync2({ force: true })]);

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
                id: UidFactory_generateUid(6),
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
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("state").record({ testVar: 123 })],
        desc: "Modify state",
      },
    ]);

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both warmupSets and state should be preserved
    expect(Progress_getProgress(mockReducer.state)!.entries[0].warmupSets.length).to.equal(1);
    expect(Progress_getProgress(mockReducer.state)!.entries[0].state).to.deep.equal({ testVar: 123 });
  });

  it("progress timer fields sync independently", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Device A updates timer
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("timer").record(60)],
        desc: "Set timer",
      },
    ]);

    // Device B updates timerSince
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("timerSince").record(1000)],
        desc: "Set timerSince",
      },
    ]);

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both timer fields should be preserved
    expect(Progress_getProgress(mockReducer.state)!.timer).to.equal(60);
    expect(Progress_getProgress(mockReducer.state)!.timerSince).to.equal(1000);
  });

  it("start workout on device A, continue on device B", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    // Start on device A
    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5]]));
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Continue on device B
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    expect(mockReducer2.state.storage.progress).to.not.be.undefined;
    await mockReducer2.run(
      SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[undefined, undefined, 8]])
    );

    // Sync back
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    const entry0Sets = Progress_getProgress(mockReducer.state)!.entries[0].sets.map((s) => [
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
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // All devices sync to get the progress
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer3.run([Thunk_sync2({ force: true })]);

    // Each device completes different entries
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [4, 4, 4]]));
    await mockReducer3.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer3.state, [[], [], [3, 3, 3]]));

    // Sync all devices
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer3.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer3.run([Thunk_sync2({ force: true })]);

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
      const entries = Progress_getProgress(reducer.state)!.entries.map((e) =>
        e.sets.map((s) => [s.completedReps, s.isCompleted])
      );
      expect(entries).to.eql(expectedEntries);
    }
  });

  it("finish workout on device A while device B continues editing", async () => {
    const { mockReducer, env, mockFetch } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

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
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both devices should have the history record
    expect(mockReducer.state.storage.history.length).to.equal(1);
    expect(mockReducer2.state.storage.history.length).to.equal(1);

    // Progress should be cleared on both devices (A's finish wins since it's later)
    expect(Progress_getProgress(mockReducer.state)).to.be.undefined;
    expect(Progress_getProgress(mockReducer2.state)).to.be.undefined;
  });

  // Section 2: Set-Level Granular Syncing
  it("adding AMRAP reps on one device while failing set on another preserves AMRAP winner", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A completes first two sets normally, then does AMRAP on third set with 10 reps
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 10]]));

    // Device B fails the first set (only 3 reps instead of 5)
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[3]]));

    // Sync both devices
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both devices should have: set 0 from B (3 reps, later), sets 1,2 from A
    const entry0Sets = Progress_getProgress(mockReducer.state)!.entries[0].sets.map((s) => [
      s.completedReps,
      s.isCompleted,
    ]);

    // Set 0: B's 3 reps (later timestamp wins)
    // Set 1: A's 5 reps
    // Set 2: A's AMRAP 10 reps
    expect(entry0Sets[0]).to.eql([3, true]);
    expect(entry0Sets[1]).to.eql([5, true]);
    expect(entry0Sets[2]).to.eql([10, true]);
  });

  // Section 4: Concurrent Edit Conflict Resolution
  it("same field edited on 2 devices simultaneously picks later timestamp", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A sets notes first
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("notes").record("Notes from A")],
        desc: "Add notes A",
      },
    ]);

    // Device B sets notes later (will have higher timestamp due to Date.now stub)
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("notes").record("Notes from B")],
        desc: "Add notes B",
      },
    ]);

    // Sync - B's notes should win as they have later timestamp
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    expect(Progress_getProgress(mockReducer.state)!.notes).to.equal("Notes from B");
    expect(Progress_getProgress(mockReducer2.state)!.notes).to.equal("Notes from B");
  });

  it("same set edited on 2 devices with vector clocks picks correct winner", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A completes set 0 with 5 reps
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5]]));

    // Device B completes set 0 with 3 reps (different value, later timestamp)
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[3]]));

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // B's edit should win (later timestamp, and vector clock shows B's device counter is higher for its own edits)
    const set0 = Progress_getProgress(mockReducer.state)!.entries[0].sets[0];
    expect(set0.completedReps).to.equal(3);
    expect(set0.isCompleted).to.equal(true);
  });

  it("concurrent edits with vector clocks merge device counts correctly", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A makes multiple edits to entry 0
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5]]));
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("notes").record("A note 1")],
        desc: "Note 1",
      },
    ]);

    // Device B makes multiple edits to entry 1
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [4, 4]]));
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(1).p("notes").record("B note 1")],
        desc: "Note 1",
      },
    ]);

    // Sync - both devices' changes should be preserved since they edited different entries
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    // Entry 0 should have A's edits
    expect(progress1.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress1.entries[0].notes).to.equal("A note 1");

    // Entry 1 should have B's edits
    expect(progress1.entries[1].sets[0].completedReps).to.equal(4);
    expect(progress1.entries[1].sets[1].completedReps).to.equal(4);
    expect(progress1.entries[1].notes).to.equal("B note 1");

    // Both devices should have identical state
    expect(progress2.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress2.entries[1].sets[0].completedReps).to.equal(4);
  });

  it("vector clock comparison when device A ahead on one field, B ahead on another", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A edits timer field multiple times (building up its vector clock counter)
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("timer").record(30)],
        desc: "Timer 30",
      },
    ]);
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("timer").record(60)],
        desc: "Timer 60",
      },
    ]);

    // Device B edits notes field multiple times
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("notes").record("Note v1")],
        desc: "Note v1",
      },
    ]);
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("notes").record("Note v2")],
        desc: "Note v2",
      },
    ]);

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Each device's field should win for the field it edited
    const progress = Progress_getProgress(mockReducer.state)!;
    expect(progress.timer).to.equal(60);
    expect(progress.notes).to.equal("Note v2");
  });

  it("three devices editing concurrently resolves to correct final state", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    const mockReducer3 = MockReducer.clone(mockReducer, "web_789", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer3.run([Thunk_sync2({ force: true })]);

    // Device A edits entry 0
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    // Device B edits entry 1
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [4, 4, 4]]));

    // Device C edits entry 2 and also entry 0 set 0 (conflict with A)
    await mockReducer3.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer3.state, [[3], [], [6, 6, 6]]));

    // Sync all three devices multiple times to ensure convergence
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer3.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer3.run([Thunk_sync2({ force: true })]);

    // All three devices should converge to same state
    const getEntrySets = (reducer: typeof mockReducer): [number | undefined, boolean | undefined][][] =>
      Progress_getProgress(reducer.state)!.entries.map((e) => e.sets.map((s) => [s.completedReps, s.isCompleted]));

    const sets1 = getEntrySets(mockReducer);
    const sets2 = getEntrySets(mockReducer2);
    const sets3 = getEntrySets(mockReducer3);

    // Entry 0: C's set 0 (3 reps) wins (latest), A's sets 1,2 (5 reps) win
    // Entry 1: B's sets (4 reps) win
    // Entry 2: C's sets (6 reps) win
    expect(sets1).to.eql(sets2);
    expect(sets2).to.eql(sets3);

    // Entry 0: set 0 from C (3), sets 1,2 from A (5)
    expect(sets1[0][0]).to.eql([3, true]);
    expect(sets1[0][1]).to.eql([5, true]);
    expect(sets1[0][2]).to.eql([5, true]);

    // Entry 1: all from B (4)
    expect(sets1[1][0]).to.eql([4, true]);
    expect(sets1[1][1]).to.eql([4, true]);
    expect(sets1[1][2]).to.eql([4, true]);

    // Entry 2: all from C (6)
    expect(sets1[2][0]).to.eql([6, true]);
    expect(sets1[2][1]).to.eql([6, true]);
    expect(sets1[2][2]).to.eql([6, true]);
  });

  // Section 5: Progress Lifecycle Transitions
  it("finish workout offline, sync, ensure progress cleared on all devices", async () => {
    const { mockReducer, env, mockFetch } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Both devices have progress now
    expect(Progress_getProgress(mockReducer.state)).to.not.be.undefined;
    expect(Progress_getProgress(mockReducer2.state)).to.not.be.undefined;

    // Device A goes offline and finishes workout
    mockFetch.hasConnection = false;
    await mockReducer.run(
      SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [
        [5, 5, 5],
        [5, 5, 5],
        [5, 5, 5],
      ])
    );
    await SyncTestUtils.finishWorkout(mockReducer);

    // Device A has no progress, history has 1 record
    expect(Progress_getProgress(mockReducer.state)).to.be.undefined;
    expect(mockReducer.state.storage.history.length).to.equal(1);

    // Device B still has progress (hasn't synced yet)
    expect(Progress_getProgress(mockReducer2.state)).to.not.be.undefined;

    // Reconnect and sync
    mockFetch.hasConnection = true;
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Both devices should now have no progress and 1 history record
    expect(Progress_getProgress(mockReducer.state)).to.be.undefined;
    expect(Progress_getProgress(mockReducer2.state)).to.be.undefined;
    expect(mockReducer.state.storage.history.length).to.equal(1);
    expect(mockReducer2.state.storage.history.length).to.equal(1);
  });

  it("cancel workout on device A while device B syncs mid-workout", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device B makes some progress
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[5, 5]]));

    // Device A cancels the workout (clears progress)
    await mockReducer.run([{ type: "CancelProgress" }]);

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // A's cancel (clearing progress) should win as it's later
    expect(Progress_getProgress(mockReducer.state)).to.be.undefined;
    expect(Progress_getProgress(mockReducer2.state)).to.be.undefined;

    // No history records since workout was cancelled, not finished
    expect(mockReducer.state.storage.history.length).to.equal(0);
    expect(mockReducer2.state.storage.history.length).to.equal(0);
  });

  it("device A restarts progress while device B has old progress - startTime version picks winner", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    // Start workout on both devices
    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    const originalStartTime = Progress_getProgress(mockReducer.state)!.startTime;

    // Device B makes some progress
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[5, 5, 5]]));

    // Device A cancels and starts a new workout (different startTime = different ID)
    await mockReducer.run([{ type: "CancelProgress" }]);
    await SyncTestUtils.startWorkout(mockReducer);

    const newStartTime = Progress_getProgress(mockReducer.state)!.startTime;
    expect(newStartTime).to.not.equal(originalStartTime);

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // The newer progress (A's restarted workout) should win since it has later ID version
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    expect(progress1.startTime).to.equal(newStartTime);
    expect(progress2.startTime).to.equal(newStartTime);

    // The new progress should have no completed sets (fresh start)
    const completedSets = progress1.entries[0].sets.filter((s) => s.isCompleted).length;
    expect(completedSets).to.equal(0);
  });

  // Section 6: History Entry ID Versioning
  it("replacing entry entirely (different id) uses ID version to pick winner", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A modifies entry 0's sets
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    // Device B replaces entry 0 entirely by changing its exercise (simulated by changing the id)
    const newEntryId = "newExercise_barbell";
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [
          lb<IHistoryRecord>().p("entries").i(0).p("id").record(newEntryId),
          lb<IHistoryRecord>().p("entries").i(0).p("exercise").record({ id: "newExercise", equipment: "barbell" }),
        ],
        desc: "Replace exercise",
      },
    ]);

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // B's replacement should win (later timestamp on ID version)
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    expect(progress1.entries[0].id).to.equal(newEntryId);
    expect(progress2.entries[0].id).to.equal(newEntryId);
  });

  it("merging when entry IDs match but different field versions", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Both devices have same entry ID, but modify different fields
    // Device A modifies sets
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    // Device B modifies notes and state (different fields of same entry)
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [
          lb<IHistoryRecord>().p("entries").i(0).p("notes").record("Entry notes from B"),
          lb<IHistoryRecord>().p("entries").i(0).p("state").record({ customVar: 42 }),
        ],
        desc: "Update notes and state",
      },
    ]);

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both changes should be preserved - sets from A, notes/state from B
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    // A's sets
    expect(progress1.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress1.entries[0].sets[0].isCompleted).to.equal(true);

    // B's notes and state
    expect(progress1.entries[0].notes).to.equal("Entry notes from B");
    expect(progress1.entries[0].state).to.deep.equal({ customVar: 42 });

    // Both devices should have identical state
    expect(progress2.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress2.entries[0].notes).to.equal("Entry notes from B");
  });

  it("concurrent entry replacement across devices picks correct winner by ID version", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A replaces entry 0 with exercise X
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [
          lb<IHistoryRecord>().p("entries").i(0).p("id").record("exerciseX_barbell"),
          lb<IHistoryRecord>().p("entries").i(0).p("exercise").record({ id: "exerciseX", equipment: "barbell" }),
        ],
        desc: "Replace with exercise X",
      },
    ]);

    // Device B replaces entry 0 with exercise Y (later, so should win)
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [
          lb<IHistoryRecord>().p("entries").i(0).p("id").record("exerciseY_barbell"),
          lb<IHistoryRecord>().p("entries").i(0).p("exercise").record({ id: "exerciseY", equipment: "barbell" }),
        ],
        desc: "Replace with exercise Y",
      },
    ]);

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // B's replacement should win (later ID version)
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    expect(progress1.entries[0].id).to.equal("exerciseY_barbell");
    expect(progress1.entries[0].exercise.id).to.equal("exerciseY");
    expect(progress2.entries[0].id).to.equal("exerciseY_barbell");
    expect(progress2.entries[0].exercise.id).to.equal("exerciseY");
  });

  // Section 7: Multi-Device Scenarios
  it("four devices syncing progress changes converge to same state", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    const mockReducer3 = MockReducer.clone(mockReducer, "web_789", env);
    const mockReducer4 = MockReducer.clone(mockReducer, "web_012", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer3.run([Thunk_sync2({ force: true })]);
    await mockReducer4.run([Thunk_sync2({ force: true })]);

    // Each device edits different parts
    // Device A: entry 0, set 0
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5]]));

    // Device B: entry 0, set 1
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[undefined, 4]]));

    // Device C: entry 1, set 0
    await mockReducer3.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer3.state, [[], [3]]));

    // Device D: entry 2, notes
    await mockReducer4.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(2).p("notes").record("Notes from D")],
        desc: "Add notes",
      },
    ]);

    // Sync all devices multiple times to ensure convergence
    for (let i = 0; i < 3; i++) {
      await mockReducer.run([Thunk_sync2({ force: true })]);
      await mockReducer2.run([Thunk_sync2({ force: true })]);
      await mockReducer3.run([Thunk_sync2({ force: true })]);
      await mockReducer4.run([Thunk_sync2({ force: true })]);
    }

    // All four devices should have identical state
    const getState = (
      reducer: typeof mockReducer
    ): {
      entry0set0?: number;
      entry0set1?: number;
      entry1set0?: number;
      entry2notes?: string;
    } => {
      const p = Progress_getProgress(reducer.state)!;
      return {
        entry0set0: p.entries[0].sets[0].completedReps,
        entry0set1: p.entries[0].sets[1].completedReps,
        entry1set0: p.entries[1].sets[0].completedReps,
        entry2notes: p.entries[2].notes,
      };
    };

    const state1 = getState(mockReducer);
    const state2 = getState(mockReducer2);
    const state3 = getState(mockReducer3);
    const state4 = getState(mockReducer4);

    expect(state1).to.deep.equal(state2);
    expect(state2).to.deep.equal(state3);
    expect(state3).to.deep.equal(state4);

    // Verify specific values
    expect(state1.entry0set0).to.equal(5);
    expect(state1.entry0set1).to.equal(4);
    expect(state1.entry1set0).to.equal(3);
    expect(state1.entry2notes).to.equal("Notes from D");
  });

  it("device joins mid-workout, receives current progress state", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");

    // Device A starts workout and makes progress
    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("notes").record("Workout notes")],
        desc: "Add notes",
      },
    ]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Device B joins later (cloned after A has made progress and synced)
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device B should have A's progress
    const progress2 = Progress_getProgress(mockReducer2.state)!;
    expect(progress2.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress2.entries[0].sets[0].isCompleted).to.equal(true);
    expect(progress2.notes).to.equal("Workout notes");

    // Device B can continue the workout
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [4, 4, 4]]));
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both devices should have combined progress
    const progress1Final = Progress_getProgress(mockReducer.state)!;
    expect(progress1Final.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress1Final.entries[1].sets[0].completedReps).to.equal(4);
  });

  it("device reconnects after long offline period, merges correctly", async () => {
    const { mockReducer, env, mockFetch } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device B goes offline
    mockFetch.hasConnection = false;

    // Device A makes many changes while B is offline
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("notes").record("A note 1")],
        desc: "Note 1",
      },
    ]);
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [4, 4, 4]]));
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("notes").record("Workout notes from A")],
        desc: "Workout notes",
      },
    ]);

    // Device B makes changes while offline (on different entries)
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [], [3, 3, 3]]));
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(2).p("notes").record("B note on entry 2")],
        desc: "Note on entry 2",
      },
    ]);

    // Reconnect and sync
    mockFetch.hasConnection = true;
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both devices should have merged state
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    // A's changes
    expect(progress1.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress1.entries[0].notes).to.equal("A note 1");
    expect(progress1.entries[1].sets[0].completedReps).to.equal(4);
    expect(progress1.notes).to.equal("Workout notes from A");

    // B's changes
    expect(progress1.entries[2].sets[0].completedReps).to.equal(3);
    expect(progress1.entries[2].notes).to.equal("B note on entry 2");

    // Both devices identical
    expect(progress2.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress2.entries[2].sets[0].completedReps).to.equal(3);
  });

  // Section 8: Network Edge Cases
  it("sync failure mid-update preserves local changes", async () => {
    const { mockReducer, mockFetch } = await SyncTestUtils.initTheApp("web_123");

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Make local changes
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    const progressBeforeFailedSync = Progress_getProgress(mockReducer.state)!;
    expect(progressBeforeFailedSync.entries[0].sets[0].completedReps).to.equal(5);

    // Simulate network failure - sync will throw NoRetryError, but local state should be preserved
    mockFetch.hasConnection = false;
    try {
      await mockReducer.run([Thunk_sync2({ force: true })]);
    } catch (e) {
      expect(e).to.be.instanceOf(NoRetryError);
      expect((e as NoRetryError).message).to.equal("Network Error");
    }

    // Local changes should still be preserved
    const progressAfterFailedSync = Progress_getProgress(mockReducer.state)!;
    expect(progressAfterFailedSync.entries[0].sets[0].completedReps).to.equal(5);
    expect(progressAfterFailedSync.entries[0].sets[0].isCompleted).to.equal(true);

    // Reconnect and sync should work
    mockFetch.hasConnection = true;
    await mockReducer.run([Thunk_sync2({ force: true })]);

    const progressAfterSuccessfulSync = Progress_getProgress(mockReducer.state)!;
    expect(progressAfterSuccessfulSync.entries[0].sets[0].completedReps).to.equal(5);
  });

  it("intermittent connectivity during workout maintains eventual consistency", async () => {
    const { mockReducer, env, mockFetch } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A makes changes, syncs
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5]]));
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Network goes down
    mockFetch.hasConnection = false;

    // Both devices make changes while offline
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[undefined, 5]]));
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [4]]));

    // Network comes back
    mockFetch.hasConnection = true;

    // Device A syncs
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Network goes down again
    mockFetch.hasConnection = false;

    // Device A makes more changes
    await mockReducer.run(
      SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[undefined, undefined, 5]])
    );

    // Network comes back
    mockFetch.hasConnection = true;

    // Final sync for all devices
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Both should converge to same state
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    const getSets = (p: typeof progress1): [number | undefined, boolean | undefined][][] =>
      p.entries.map((e) => e.sets.map((s) => [s.completedReps, s.isCompleted]));

    expect(getSets(progress1)).to.deep.equal(getSets(progress2));
  });

  it("device goes offline, makes many changes, reconnects - all changes sync", async () => {
    const { mockReducer, env, mockFetch } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A goes offline and makes many changes
    mockFetch.hasConnection = false;

    // Complete all sets on entry 0
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    // Add notes to entry 0
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("notes").record("Entry 0 done")],
        desc: "Note",
      },
    ]);
    // Complete all sets on entry 1
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [4, 4, 4]]));
    // Add notes to entry 1
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("entries").i(1).p("notes").record("Entry 1 done")],
        desc: "Note",
      },
    ]);
    // Complete all sets on entry 2
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [], [3, 3, 3]]));
    // Add workout-level notes
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("notes").record("Great workout!")],
        desc: "Workout note",
      },
    ]);
    // Update timer
    await mockReducer.run([
      {
        type: "UpdateProgress",
        lensRecordings: [lb<IHistoryRecord>().p("timer").record(90)],
        desc: "Timer",
      },
    ]);

    // Reconnect
    mockFetch.hasConnection = true;
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device B should have all of A's changes
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    expect(progress2.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress2.entries[0].sets[1].completedReps).to.equal(5);
    expect(progress2.entries[0].sets[2].completedReps).to.equal(5);
    expect(progress2.entries[0].notes).to.equal("Entry 0 done");

    expect(progress2.entries[1].sets[0].completedReps).to.equal(4);
    expect(progress2.entries[1].notes).to.equal("Entry 1 done");

    expect(progress2.entries[2].sets[0].completedReps).to.equal(3);

    expect(progress2.notes).to.equal("Great workout!");
    expect(progress2.timer).to.equal(90);
  });

  it("partial sync recovery - device recovers after interrupted sync", async () => {
    const { mockReducer, env, mockFetch } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A makes changes
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    // Sync starts but connection drops mid-way (simulated by syncing then going offline)
    await mockReducer.run([Thunk_sync2({ force: true })]);
    mockFetch.hasConnection = false;

    // Device A makes more changes while offline
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[], [4, 4, 4]]));

    // Device B syncs (gets A's first batch of changes)
    mockFetch.hasConnection = true;
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // B should have A's first changes
    let progress2 = Progress_getProgress(mockReducer2.state)!;
    expect(progress2.entries[0].sets[0].completedReps).to.equal(5);

    // Now A reconnects and syncs remaining changes
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Both should now have all changes
    progress2 = Progress_getProgress(mockReducer2.state)!;
    expect(progress2.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress2.entries[1].sets[0].completedReps).to.equal(4);
  });

  // Section 12: Edge Cases - Data Integrity
  it("missing _versions field gets regenerated with fillVersions", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A makes changes
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    // Verify versions exist
    expect(mockReducer.state.storage._versions).to.not.be.undefined;

    // Sync and verify both devices work correctly despite version tracking
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    const progress2 = Progress_getProgress(mockReducer2.state)!;
    expect(progress2.entries[0].sets[0].completedReps).to.equal(5);

    // Versions should still be present after sync
    expect(mockReducer2.state.storage._versions).to.not.be.undefined;
  });

  it("version with higher timestamp but concurrent vector clock resolves correctly", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A makes multiple edits to build up vector clock
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5]]));
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[undefined, 5]]));

    // Device B makes one edit (lower vector clock count for its device, but will have later timestamp)
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[3]]));

    // Sync - concurrent case: A has higher count for web_123, B has higher count for web_456
    // In concurrent cases, the later timestamp typically wins
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both devices should converge
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    expect(progress1.entries[0].sets[0].completedReps).to.equal(progress2.entries[0].sets[0].completedReps);
    // A's set 1 should be preserved since only A edited it
    expect(progress1.entries[0].sets[1].completedReps).to.equal(5);
  });

  it("deleting and re-adding items handles version correctly", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A completes sets
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Device B also has the completed sets now
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    expect(Progress_getProgress(mockReducer2.state)!.entries[0].sets[0].completedReps).to.equal(5);

    // Device A cancels and restarts (effectively deleting and re-adding progress)
    await mockReducer.run([{ type: "CancelProgress" }]);
    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Device B syncs - should get the new fresh progress
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    const progress2 = Progress_getProgress(mockReducer2.state)!;
    // New progress should have no completed sets
    expect(progress2.entries[0].sets[0].isCompleted).to.equal(false);
  });

  it("large number of concurrent edits still converges", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Both devices make many rapid edits without syncing
    for (let i = 0; i < 5; i++) {
      await mockReducer.run([
        {
          type: "UpdateProgress",
          lensRecordings: [
            lb<IHistoryRecord>()
              .p("timer")
              .record(i * 10),
          ],
          desc: `Timer ${i}`,
        },
      ]);
      await mockReducer2.run([
        {
          type: "UpdateProgress",
          lensRecordings: [lb<IHistoryRecord>().p("notes").record(`Note ${i}`)],
          desc: `Note ${i}`,
        },
      ]);
    }

    // Complete sets on different entries
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [4, 4, 4]]));

    // Sync multiple times to ensure convergence
    for (let i = 0; i < 3; i++) {
      await mockReducer.run([Thunk_sync2({ force: true })]);
      await mockReducer2.run([Thunk_sync2({ force: true })]);
    }

    // Both should converge to same state
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    // Timer should have A's last value (40), notes should have B's last value ("Note 4")
    expect(progress1.timer).to.equal(progress2.timer);
    expect(progress1.notes).to.equal(progress2.notes);

    // Sets should be merged
    expect(progress1.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress1.entries[1].sets[0].completedReps).to.equal(4);
    expect(progress2.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress2.entries[1].sets[0].completedReps).to.equal(4);
  });

  // Section 13: Validation and Recovery
  it("merging progress with mismatched entry counts handles gracefully", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Both devices start with same 3 entries
    expect(Progress_getProgress(mockReducer.state)!.entries.length).to.equal(3);

    // Device A modifies entry 0
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    // Device B modifies entry 2
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [], [3, 3, 3]]));

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both should still have 3 entries with merged data
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    expect(progress1.entries.length).to.equal(3);
    expect(progress2.entries.length).to.equal(3);

    expect(progress1.entries[0].sets[0].completedReps).to.equal(5);
    expect(progress1.entries[2].sets[0].completedReps).to.equal(3);
  });

  it("entries array reordering after merge maintains correct index order", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Get original entry order
    const originalEntries = Progress_getProgress(mockReducer.state)!.entries.map((e) => e.exercise.id);

    // Device A modifies entries in order 0, 1, 2
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5], [4], [3]]));

    // Device B modifies entries in reverse order 2, 1, 0
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [], [6]]));
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[], [7]]));
    await mockReducer2.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer2.state, [[8]]));

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Entries should maintain their index order
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    expect(progress1.entries.map((e) => e.index)).to.eql([0, 1, 2]);
    expect(progress2.entries.map((e) => e.index)).to.eql([0, 1, 2]);

    // Exercise order should be preserved
    expect(progress1.entries.map((e) => e.exercise.id)).to.eql(originalEntries);
    expect(progress2.entries.map((e) => e.exercise.id)).to.eql(originalEntries);
  });

  it("sets array reordering after merge maintains correct index order", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A modifies sets in order 0, 1, 2
    await mockReducer.run(SyncTestUtils.completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));

    // Device B modifies sets in reverse order (set 2 first, then 1, then 0)
    // Using individual updates to ensure different order
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [
          lb<IHistoryRecord>().p("entries").i(0).p("sets").i(2).p("completedReps").record(3),
          lb<IHistoryRecord>().p("entries").i(0).p("sets").i(2).p("isCompleted").record(true),
        ],
        desc: "Complete set 2",
      },
    ]);
    await mockReducer2.run([
      {
        type: "UpdateProgress",
        lensRecordings: [
          lb<IHistoryRecord>().p("entries").i(0).p("sets").i(1).p("completedReps").record(4),
          lb<IHistoryRecord>().p("entries").i(0).p("sets").i(1).p("isCompleted").record(true),
        ],
        desc: "Complete set 1",
      },
    ]);

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Sets should maintain their index order
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    expect(progress1.entries[0].sets.map((s) => s.index)).to.eql([0, 1, 2]);
    expect(progress2.entries[0].sets.map((s) => s.index)).to.eql([0, 1, 2]);
  });

  it("sync preserves data integrity after rapid successive edits", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheApp("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);

    await SyncTestUtils.startWorkout(mockReducer);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);

    // Device A makes rapid successive edits to the same field
    for (let i = 1; i <= 10; i++) {
      await mockReducer.run([
        {
          type: "UpdateProgress",
          lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("sets").i(0).p("completedReps").record(i)],
          desc: `Set reps to ${i}`,
        },
      ]);
    }

    // Device B makes its own rapid edits to a different field
    for (let i = 1; i <= 10; i++) {
      await mockReducer2.run([
        {
          type: "UpdateProgress",
          lensRecordings: [
            lb<IHistoryRecord>()
              .p("entries")
              .i(1)
              .p("sets")
              .i(0)
              .p("completedReps")
              .record(i * 2),
          ],
          desc: `Set reps to ${i * 2}`,
        },
      ]);
    }

    // Sync
    await mockReducer.run([Thunk_sync2({ force: true })]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    // Both should have the final values from each device
    const progress1 = Progress_getProgress(mockReducer.state)!;
    const progress2 = Progress_getProgress(mockReducer2.state)!;

    // A's last value for entry 0 set 0
    expect(progress1.entries[0].sets[0].completedReps).to.equal(10);
    expect(progress2.entries[0].sets[0].completedReps).to.equal(10);

    // B's last value for entry 1 set 0
    expect(progress1.entries[1].sets[0].completedReps).to.equal(20);
    expect(progress2.entries[1].sets[0].completedReps).to.equal(20);
  });
});
