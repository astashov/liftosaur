/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { MockReducer } from "./utils/mockReducer";
import { Thunk_sync2 } from "../src/ducks/thunks";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { IHistoryRecord, ISettings } from "../src/types";
import { userTableNames, IUserDao } from "../lambda/dao/userDao";
import { lb } from "lens-shmens";
import sinon from "sinon";
import { EditStats_deleteWeightStat } from "../src/models/editStats";
import * as encoder from "../src/utils/encoder";
import { NodeEncoder_encode } from "../lambda/utils/nodeEncoder";
import {
  SyncTestUtils_initTheAppAndRecordWorkout,
  SyncTestUtils_logWorkout,
  SyncTestUtils_logStat,
  SyncTestUtils_mockDispatch,
  SyncTestUtils_initTheApp,
  SyncTestUtils_startWorkout,
  SyncTestUtils_completeCurrentProgramRepsActions,
  SyncTestUtils_finishWorkout,
} from "./utils/syncTestUtils";
import { Progress_getProgress } from "../src/models/progress";

describe("sync", () => {
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
    sandbox.stub(encoder, "Encoder_encode").callsFake((...args: [string]) => {
      return NodeEncoder_encode(...args);
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("properly runs appendable safe syncs", async () => {
    const { di, mockReducer, log } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");

    // With progress being tracked as part of storage, there will be more safe updates
    expect(log.logs.filter((l) => l === "Fetch: Safe update").length).to.be.greaterThan(0);
    expect(log.logs.filter((l) => l === "Fetch: Merging update").length).to.be.greaterThan(0);
    const programId = mockReducer.state.storage.programs.find((p) => p.name === basicBeginnerProgram.name)?.id;
    expect(mockReducer.state.storage.currentProgramId).to.equal(programId);
    expect(mockReducer.state.storage.programs).to.length(1);
    expect(mockReducer.state.storage.history).to.length(1);

    expect(await di.dynamo.scan({ tableName: userTableNames.prod.historyRecords })).to.length(1);
    expect(await di.dynamo.scan({ tableName: userTableNames.prod.programs })).to.length(1);
  });

  it("merge history and settings update", async () => {
    const { mockReducer, log, env, di } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    await SyncTestUtils_logWorkout(mockReducer2, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    await mockReducer.run([
      {
        type: "UpdateSettings",
        lensRecording: lb<ISettings>().p("isPublicProfile").record(true),
        desc: "Update public profile",
      },
    ]);
    expect(mockReducer.state.storage.settings.isPublicProfile).to.equal(true);
    expect(mockReducer.state.storage.history.length).to.equal(2);

    const dbHistoryRecords = await di.dynamo.scan<IHistoryRecord>({ tableName: userTableNames.prod.historyRecords });
    const dbUsers = await di.dynamo.scan<IUserDao>({ tableName: userTableNames.prod.users });
    expect(dbHistoryRecords.length).to.equal(2);
    expect(dbUsers[0].storage.settings.isPublicProfile).to.equal(true);

    // With progress being tracked as part of storage, there will be more sync operations
    const filteredLogs = log.logs.filter((l) => l.startsWith("Fetch:"));
    expect(filteredLogs.filter((l) => l === "Fetch: Merging update").length).to.be.greaterThan(0);
    expect(filteredLogs.filter((l) => l === "Fetch: Safe update").length).to.be.greaterThan(0);
  });

  it("merge 2 history updates", async () => {
    const { mockReducer, log, env, di } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    await SyncTestUtils_logWorkout(mockReducer2, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    await SyncTestUtils_logWorkout(mockReducer, basicBeginnerProgram, [
      [5, 4, 3],
      [5, 4, 3],
      [5, 4, 3],
    ]);
    const dbHistoryRecords = await di.dynamo.scan<IHistoryRecord>({ tableName: userTableNames.prod.historyRecords });
    expect(dbHistoryRecords.length).to.equal(3);

    // With progress being tracked as part of storage, there will be more sync operations
    const filteredLogs = log.logs.filter((l) => l.startsWith("Fetch:"));
    expect(filteredLogs.filter((l) => l === "Fetch: Merging update").length).to.be.greaterThan(0);
    expect(filteredLogs.filter((l) => l === "Fetch: Safe update").length).to.be.greaterThan(0);
  });

  it("deletes the stats properly during merging", async () => {
    const { mockReducer, env } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    await SyncTestUtils_logStat(mockReducer2, 100);
    await SyncTestUtils_logStat(mockReducer, 120);
    await SyncTestUtils_logStat(mockReducer2, 130);
    await SyncTestUtils_logStat(mockReducer, 140);

    let weights = mockReducer.state.storage.stats.weight.weight || [];
    const weight130Index = weights.findIndex((w) => w.value.value === 130) ?? 0;
    await mockReducer.run([
      SyncTestUtils_mockDispatch((ds) =>
        EditStats_deleteWeightStat(ds, "weight", weight130Index, weights[weight130Index].timestamp)
      ),
    ]);
    weights = mockReducer.state.storage.stats.weight.weight || [];
    const weight140Index = weights.findIndex((w) => w.value.value === 140) ?? 0;
    await mockReducer.run([
      SyncTestUtils_mockDispatch((ds) =>
        EditStats_deleteWeightStat(ds, "weight", weight140Index, weights[weight140Index].timestamp)
      ),
    ]);
    await SyncTestUtils_logStat(mockReducer2, 150);
    expect((mockReducer2.state.storage.stats.weight.weight || []).map((w) => w.value.value)).to.eql([100, 120, 150]);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    expect((mockReducer.state.storage.stats.weight.weight || []).map((w) => w.value.value)).to.eql([100, 120, 150]);
  });

  it("cancels sync if not the latest version", async () => {
    const { mockReducer, env } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    await SyncTestUtils_logWorkout(mockReducer2, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);

    mockReducer.state.storage.version = "20231009191950";
    // expect to throw
    let threw = false;
    let msg = "";
    global.alert = (m) => (msg = m);
    global.window = { alert: global.alert } as any;
    try {
      await mockReducer.run([Thunk_sync2({ force: true })]);
    } catch (error) {
      const e = error as Error;
      expect(e.message).to.eql("outdated_client_storage");
      threw = true;
    }
    expect(threw).to.eql(true);

    expect(msg).to.contain("kill/restart");
  });

  describe("progress", () => {
    it("starting progress on 2 devices independently picks latest workout", async () => {
      const { mockReducer, env } = await SyncTestUtils_initTheApp("web_123");
      const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
      await SyncTestUtils_startWorkout(mockReducer);
      await mockReducer.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
      await SyncTestUtils_startWorkout(mockReducer2);
      await mockReducer2.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[3, 4]]));
      await mockReducer.run([Thunk_sync2({ force: true })]);
      await mockReducer.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[], [2, 2]]));
      await mockReducer2.run([Thunk_sync2({ force: true })]);
      await mockReducer2.run(
        SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[], [undefined, 4, 3], [3, 3]])
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
      const { mockReducer, env, mockFetch } = await SyncTestUtils_initTheApp("web_123");
      const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
      await SyncTestUtils_startWorkout(mockReducer);
      await mockReducer.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[5, 5, 5]]));
      await SyncTestUtils_startWorkout(mockReducer2);
      await mockReducer2.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[3, 4, 3]]));
      await mockReducer.run([Thunk_sync2({ force: true })]);
      mockFetch.hasConnection = false;
      await mockReducer.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[], [2, 2]]));
      await mockReducer2.run(SyncTestUtils_completeCurrentProgramRepsActions(mockReducer.state, [[], [1, 1]]));
      await SyncTestUtils_finishWorkout(mockReducer);
      await SyncTestUtils_finishWorkout(mockReducer2);
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
  });
});
