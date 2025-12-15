/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { MockReducer } from "./utils/mockReducer";
import { Thunk } from "../src/ducks/thunks";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { IHistoryRecord, ISettings } from "../src/types";
import { userTableNames, IUserDao } from "../lambda/dao/userDao";
import { ObjectUtils } from "../src/utils/object";
import { lb } from "lens-shmens";
import sinon from "sinon";
import { EditStats } from "../src/models/editStats";
import { Encoder } from "../src/utils/encoder";
import { NodeEncoder } from "../lambda/utils/nodeEncoder";
import { SyncTestUtils } from "./utils/syncTestUtils";
import { CollectionUtils } from "../src/utils/collection";
import { cl } from "./utils/testUtils";

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
    sandbox.stub(Encoder, "encode").callsFake((...args) => {
      return NodeEncoder.encode(...args);
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("properly runs appendable safe syncs", async () => {
    const { di, mockReducer, log } = await SyncTestUtils.initTheAppAndRecordWorkout();

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
    const { mockReducer, log, env, di } = await SyncTestUtils.initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await SyncTestUtils.logWorkout(mockReducer2, basicBeginnerProgram, [
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
    const { mockReducer, log, env, di } = await SyncTestUtils.initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await SyncTestUtils.logWorkout(mockReducer2, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    await SyncTestUtils.logWorkout(mockReducer, basicBeginnerProgram, [
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
    const { mockReducer, env } = await SyncTestUtils.initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await SyncTestUtils.logStat(mockReducer2, 100);
    await SyncTestUtils.logStat(mockReducer, 120);
    await SyncTestUtils.logStat(mockReducer2, 130);
    await SyncTestUtils.logStat(mockReducer, 140);

    let weights = mockReducer.state.storage.stats.weight.weight || [];
    const weight130Index = weights.findIndex((w) => w.value.value === 130) ?? 0;
    await mockReducer.run([
      SyncTestUtils.mockDispatch((ds) =>
        EditStats.deleteWeightStat(ds, "weight", weight130Index, weights[weight130Index].timestamp)
      ),
    ]);
    weights = mockReducer.state.storage.stats.weight.weight || [];
    const weight140Index = weights.findIndex((w) => w.value.value === 140) ?? 0;
    await mockReducer.run([
      SyncTestUtils.mockDispatch((ds) =>
        EditStats.deleteWeightStat(ds, "weight", weight140Index, weights[weight140Index].timestamp)
      ),
    ]);
    await SyncTestUtils.logStat(mockReducer2, 150);
    expect((mockReducer2.state.storage.stats.weight.weight || []).map((w) => w.value.value)).to.eql([100, 120, 150]);
    await mockReducer.run([Thunk.sync2({ force: true })]);
    expect((mockReducer.state.storage.stats.weight.weight || []).map((w) => w.value.value)).to.eql([100, 120, 150]);
  });

  it("cancels sync if not the latest version", async () => {
    const { mockReducer, env } = await SyncTestUtils.initTheAppAndRecordWorkout();
    const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
    await SyncTestUtils.logWorkout(mockReducer2, basicBeginnerProgram, [
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
      await mockReducer.run([Thunk.sync2({ force: true })]);
    } catch (error) {
      const e = error as Error;
      expect(e.message).to.eql("outdated_client_storage");
      threw = true;
    }
    expect(threw).to.eql(true);

    expect(msg).to.contain("kill/restart");
  });

  describe("progress", () => {
    it("syncs progress updates properly", async () => {
      const { mockReducer, fetchLogs } = await SyncTestUtils.initTheApp();
      // const mockFetch = env.service.client as unknown as MockFetch;
      // const mockReducer2 = MockReducer.build(ObjectUtils.clone(mockReducer.state), env);
      await SyncTestUtils.startWorkout(mockReducer);
      await mockReducer.run(
        SyncTestUtils.completeRepsActions(
          mockReducer.state.storage.programs.find((p) => p.id === mockReducer.state.storage.currentProgramId)!,
          mockReducer.state.storage.progress!,
          [[5, 5]]
        )
      );
      await mockReducer.run([Thunk.sync2({ force: true })]);
      const sync2Logs = CollectionUtils.compact(
        await Promise.all(
          fetchLogs
            .filter((r) => r.request.url.includes("api/sync2"))
            .map(
              async (r) =>
                JSON.parse(await NodeEncoder.decode((r.request.body as { data: any }).data)).storageUpdate.storage
            )
        )
      );
      cl(sync2Logs.map((s) => s.progress?.entries));
      console.log(mockReducer.state.storage.progress?.entries[0].sets.map((set) => set.isCompleted));
    });
  });
});
