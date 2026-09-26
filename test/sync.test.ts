/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { MockReducer } from "./utils/mockReducer";
import { Thunk_handleWatchStorageMerge, Thunk_sync2 } from "../src/ducks/thunks";
import { SyncBaseline_MAX_AGE_MS } from "../src/utils/syncBaseline";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { IHistoryRecord, ISettings } from "../src/types";
import { userTableNames, IUserDao } from "../lambda/dao/userDao";
import { lb } from "lens-shmens";
import sinon from "sinon";
import {
  EditStats_deleteWeightStat,
  EditStats_setHealthStatHidden,
  EditStats_uploadDailyMetrics,
  EditStats_uploadHealthStats,
} from "../src/models/editStats";
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
import { Program_exportProgram } from "../src/models/program";
import { ObjectUtils_clone } from "../src/utils/object";
import { IEnv, IState, updateState } from "../src/models/state";
import { IAction } from "../src/ducks/reducer";
import { History_deleteRecords } from "../src/models/history";
import { ICollectionVersions } from "../src/models/versionTracker";

describe("sync", () => {
  let sandbox: sinon.SinonSandbox;
  let clock = 0;

  beforeEach(() => {
    clock = 0;
    // @ts-ignore
    global.__API_HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__ENV__ = "prod";
    // @ts-ignore
    global.__FULL_COMMIT_HASH__ = "abc123";
    // @ts-ignore
    global.__COMMIT_HASH__ = "abc123";
    // @ts-ignore
    global.Rollbar = {
      configure: () => undefined,
    };
    sandbox = sinon.createSandbox();
    sandbox.stub(Date, "now").callsFake(() => {
      clock += 1;
      return clock;
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

  it("syncs health stats to the server and across devices, preserving hidden and source uuids", async () => {
    const { mockReducer, env, di } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    const day1 = 1700000000000;
    const day2 = day1 + 86400000;
    await mockReducer.run([
      SyncTestUtils_mockDispatch((ds) =>
        EditStats_uploadDailyMetrics("ios", ds, {
          values: [
            { type: "sleep", timestamp: day1, value: 432, uuid: "sleep-day1" },
            { type: "sleep", timestamp: day2, value: 401, uuid: "sleep-day2" },
            { type: "protein", timestamp: day1, value: 150.5, uuid: "protein-day1" },
          ],
        })
      ),
    ]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    const statsRows = Object.values(di.dynamo.data[userTableNames.prod.stats] || {}) as {
      name: string;
      type: string;
      value: number;
      appleUuid?: string;
    }[];
    const sleepRow = statsRows.find((r) => r.name === `${day1}_sleep`);
    expect(sleepRow?.type).to.equal("health");
    expect(sleepRow?.value).to.equal(432);
    expect(sleepRow?.appleUuid).to.equal("sleep-day1");
    expect(statsRows.find((r) => r.name === `${day1}_protein`)?.value).to.equal(150.5);

    await mockReducer2.run([Thunk_sync2({ force: true })]);
    const sleep2 = mockReducer2.state.storage.stats.health?.sleep || [];
    expect(sleep2.find((v) => v.timestamp === day1)?.value).to.equal(432);
    expect(sleep2.find((v) => v.timestamp === day1)?.appleUuid).to.equal("sleep-day1");
    expect(sleep2.find((v) => v.timestamp === day2)?.value).to.equal(401);
    expect((mockReducer2.state.storage.stats.health?.protein || [])[0]?.value).to.equal(150.5);

    await mockReducer2.run([
      SyncTestUtils_mockDispatch((ds) => EditStats_setHealthStatHidden(ds, "sleep", day1, true)),
    ]);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    const sleep1 = mockReducer.state.storage.stats.health?.sleep || [];
    expect(sleep1.find((v) => v.timestamp === day1)?.hidden).to.equal(true);
    expect(sleep1.find((v) => v.timestamp === day2)?.hidden).to.equal(undefined);
  });

  it("preserves measurement source uuids across the server round-trip", async () => {
    const { mockReducer, env, di } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
    const mockReducer2 = MockReducer.clone(mockReducer, "web_456", env);
    const ts = 1700000000000;
    const settings = mockReducer.state.storage.settings;
    await mockReducer.run([
      SyncTestUtils_mockDispatch((ds) =>
        EditStats_uploadHealthStats(
          "android",
          ds,
          {
            data: {
              added: [
                { type: "bodyweight", timestamp: ts, uuid: "hc-bw-1", value: { value: 80, unit: settings.units } },
              ],
              deleted: [],
              anchor: "a1",
            },
          },
          settings,
          []
        )
      ),
    ]);
    await mockReducer.run([Thunk_sync2({ force: true })]);

    const statsRows = Object.values(di.dynamo.data[userTableNames.prod.stats] || {}) as {
      name: string;
      googleUuid?: string;
    }[];
    expect(statsRows.find((r) => r.name === `${ts}_weight`)?.googleUuid).to.equal("hc-bw-1");

    await mockReducer2.run([Thunk_sync2({ force: true })]);
    const weight = (mockReducer2.state.storage.stats.weight.weight || []).find((v) => v.timestamp === ts);
    expect(weight?.value.value).to.equal(80);
    expect(weight?.googleUuid).to.equal("hc-bw-1");
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

  it("doesn't reset nextDay when saving a stale program snapshot from the web editor", async () => {
    const { mockReducer, env } = await SyncTestUtils_initTheApp("web_123");
    const program = mockReducer.state.storage.programs[0];
    expect(program.nextDay).to.equal(1);
    const webEditorSnapshot = ObjectUtils_clone(Program_exportProgram(program, mockReducer.state.storage.settings));

    await SyncTestUtils_logWorkout(mockReducer, basicBeginnerProgram, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    const advancedNextDay = mockReducer.state.storage.programs[0].nextDay;
    expect(advancedNextDay).to.not.equal(1);

    webEditorSnapshot.program.name = "Renamed Program";
    const result = await env.service.postSaveProgram(webEditorSnapshot, "web_456");
    expect(result.success).to.equal(true);

    await mockReducer.run([Thunk_sync2({ force: true })]);
    expect(mockReducer.state.storage.programs[0].name).to.equal("Renamed Program");
    expect(mockReducer.state.storage.programs[0].nextDay).to.equal(advancedNextDay);
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

  describe("history after a dirty sync", () => {
    const WORKOUTS = 22;

    async function twoDevicesWithHistory(): Promise<{
      a: MockReducer<IState, IAction, IEnv>;
      b: MockReducer<IState, IAction, IEnv>;
      env: IEnv;
      historyRequestsSince: (mark: number) => string[];
      mark: () => number;
    }> {
      const { mockReducer, env, mockFetch } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
      const template = mockReducer.state.storage.history[0];
      const history = Array.from({ length: WORKOUTS }, (_, i) => {
        const id = template.id + (WORKOUTS - i) * 1000;
        return { ...template, id, startTime: id, endTime: id + 100, date: new Date(id).toISOString() };
      });
      await mockReducer.run([
        SyncTestUtils_mockDispatch((ds) =>
          updateState(ds, [lb<IState>().p("storage").p("history").record(history)], "seed")
        ),
      ]);
      await mockReducer.run([Thunk_sync2({ force: true })]);
      const b = MockReducer.clone(mockReducer, "web_456", env);
      return {
        a: mockReducer,
        b,
        env,
        mark: () => mockFetch.logs.length,
        historyRequestsSince: (mark) =>
          mockFetch.logs
            .slice(mark)
            .map((l) => l.request.url)
            .filter((url) => url.includes("/api/history")),
      };
    }

    it("fetches only an edited old workout, by id", async () => {
      const { a, b, mark, historyRequestsSince } = await twoDevicesWithHistory();
      const oldest = a.state.storage.history[a.state.storage.history.length - 1];
      await a.run([
        SyncTestUtils_mockDispatch((ds) =>
          updateState(
            ds,
            [lb<IState>().p("storage").p("history").findBy("id", oldest.id).p("notes").record("edited on A")],
            "edit"
          )
        ),
      ]);
      await a.run([Thunk_sync2({ force: true })]);
      const start = mark();
      await b.run([Thunk_sync2({ force: true })]);
      const requests = historyRequestsSince(start);
      expect(requests.length).to.equal(1);
      expect(requests[0]).to.include(`ids=${oldest.id}`);
      expect(requests[0]).to.not.include("after=");
      expect(b.state.storage.history.find((r) => r.id === oldest.id)?.notes).to.equal("edited on A");
      expect(b.state.storage.history.map((r) => r.id)).to.eql(a.state.storage.history.map((r) => r.id));
    });

    it("falls back to paging when a requested record does not come back", async () => {
      const { a, b, env, mark, historyRequestsSince } = await twoDevicesWithHistory();
      const oldest = a.state.storage.history[a.state.storage.history.length - 1];
      await a.run([
        SyncTestUtils_mockDispatch((ds) =>
          updateState(
            ds,
            [lb<IState>().p("storage").p("history").findBy("id", oldest.id).p("notes").record("edited on A")],
            "edit"
          )
        ),
      ]);
      await a.run([Thunk_sync2({ force: true })]);
      const byIds = sandbox.stub(env.service, "getHistoryByIds").onFirstCall().resolves([]);
      byIds.callThrough();
      const start = mark();
      await b.run([Thunk_sync2({ force: true })]);
      const requests = historyRequestsSince(start);
      expect(requests.some((url) => url.includes("limit="))).to.equal(true);
      expect(b.state.storage.history.find((r) => r.id === oldest.id)?.notes).to.equal("edited on A");
    });

    it("makes no history request when the change is inside the newest records", async () => {
      const { a, b, mark, historyRequestsSince } = await twoDevicesWithHistory();
      const newest = a.state.storage.history[0];
      const id = newest.id + 1000;
      const added = { ...newest, id, startTime: id, endTime: id + 100, date: new Date(id).toISOString() };
      await a.run([
        SyncTestUtils_mockDispatch((ds) =>
          updateState(
            ds,
            [
              lb<IState>()
                .p("storage")
                .p("history")
                .recordModify((h) => [added, ...h]),
            ],
            "add"
          )
        ),
      ]);
      await a.run([Thunk_sync2({ force: true })]);
      const start = mark();
      await b.run([Thunk_sync2({ force: true })]);
      expect(historyRequestsSince(start)).to.eql([]);
      expect(b.state.storage.history.length).to.equal(WORKOUTS + 1);
      expect(b.state.storage.history[0].id).to.equal(a.state.storage.history[0].id);
    });

    it("drops a workout the other device deleted without fetching it", async () => {
      const { a, b, mark, historyRequestsSince } = await twoDevicesWithHistory();
      const victim = a.state.storage.history[a.state.storage.history.length - 1];
      await a.run([
        SyncTestUtils_mockDispatch((ds) =>
          updateState(
            ds,
            [
              lb<IState>()
                .p("storage")
                .recordModify((s) => History_deleteRecords(s, [victim.id])),
            ],
            "delete"
          )
        ),
      ]);
      await a.run([Thunk_sync2({ force: true })]);
      const start = mark();
      await b.run([Thunk_sync2({ force: true })]);
      expect(historyRequestsSince(start)).to.eql([]);
      expect(b.state.storage.history.some((r) => r.id === victim.id)).to.equal(false);
      const deleted = (b.state.storage._versions?.history as ICollectionVersions | undefined)?.deleted || {};
      expect(Object.keys(deleted)).to.include(`${victim.id}`);
    });
  });

  describe("sync baseline", () => {
    async function serverUser(di: {
      dynamo: { scan: <T>(args: { tableName: string }) => Promise<T[]> };
    }): Promise<IUserDao> {
      return (await di.dynamo.scan<IUserDao>({ tableName: userTableNames.prod.users }))[0];
    }

    async function offlineWatch(
      phone: MockReducer<IState, IAction, IEnv>,
      env: IEnv
    ): Promise<MockReducer<IState, IAction, IEnv>> {
      const watch = MockReducer.clone(phone, "watch-ABC", env);
      await watch.run([
        SyncTestUtils_mockDispatch((ds) => updateState(ds, [lb<IState>().p("nosync").record(true)], "watch offline")),
      ]);
      return watch;
    }

    function setRepsActions(reps: number): IAction[] {
      return [
        {
          type: "UpdateProgress",
          lensRecordings: [lb<IHistoryRecord>().p("entries").i(0).p("sets").i(0).p("completedReps").record(reps)],
          desc: `Set completed reps to ${reps}`,
        },
      ];
    }

    it("uploads a workout the watch finished while it could not reach the server", async () => {
      const { mockReducer: phone, di, env } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
      const watch = await offlineWatch(phone, env);
      await SyncTestUtils_logWorkout(watch, basicBeginnerProgram, [
        [5, 5, 5],
        [5, 5, 5],
        [5, 5, 5],
      ]);
      const watchRecordId = watch.state.storage.history[0].id;
      expect(phone.state.storage.history.map((r) => r.id)).to.not.include(watchRecordId);

      await phone.run([Thunk_handleWatchStorageMerge(JSON.stringify(watch.state.storage))]);
      await phone.run([Thunk_sync2()]);

      expect(
        (await di.dynamo.scan<IHistoryRecord>({ tableName: userTableNames.prod.historyRecords })).map((r) => r.id)
      ).to.include(watchRecordId);
    });

    it("uploads a set the watch completed while it could not reach the server", async () => {
      const { mockReducer: phone, di, env } = await SyncTestUtils_initTheApp("web_123");
      await SyncTestUtils_startWorkout(phone);
      const watch = await offlineWatch(phone, env);
      await watch.run(setRepsActions(4));

      await phone.run([Thunk_handleWatchStorageMerge(JSON.stringify(watch.state.storage))]);
      await phone.run([Thunk_sync2()]);

      expect((await serverUser(di)).storage.progress?.[0]?.entries[0].sets[0].completedReps).to.equal(4);
    });

    it("keeps the server's newer set when the phone uploads an older watch copy", async () => {
      const { mockReducer: phone, di, env } = await SyncTestUtils_initTheApp("web_123");
      await SyncTestUtils_startWorkout(phone);
      const watch = MockReducer.clone(phone, "watch-ABC", env);
      await watch.run(setRepsActions(3));
      const olderWatchStorage = JSON.stringify(watch.state.storage);
      await watch.run(setRepsActions(4));
      await watch.run([Thunk_sync2({ force: true })]);
      expect((await serverUser(di)).storage.progress?.[0]?.entries[0].sets[0].completedReps).to.equal(4);

      await phone.run([Thunk_handleWatchStorageMerge(olderWatchStorage)]);
      await phone.run([Thunk_sync2()]);

      expect((await serverUser(di)).storage.progress?.[0]?.entries[0].sets[0].completedReps).to.equal(4);
      expect(phone.state.storage.progress?.[0]?.entries[0].sets[0].completedReps).to.equal(4);
    });

    it("keeps a phone change uploadable when a watch merge arrives with no baseline", async () => {
      const { mockReducer: a, di } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
      await a.run([
        SyncTestUtils_mockDispatch((ds) =>
          updateState(
            ds,
            [lb<IState>().p("nosync").record(true), lb<IState>().p("lastSynced").record(undefined)],
            "offline, no baseline"
          )
        ),
        {
          type: "UpdateSettings",
          lensRecording: lb<ISettings>().p("isPublicProfile").record(true),
          desc: "phone change while offline",
        },
      ]);
      const watchStorage = ObjectUtils_clone(a.state.storage);
      watchStorage.settings.volume = 0.25;
      watchStorage._versions = {
        ...watchStorage._versions,
        settings: { ...(watchStorage._versions?.settings as object), volume: 9_000_000 },
      };
      await a.run([Thunk_handleWatchStorageMerge(JSON.stringify(watchStorage))]);
      expect(a.state.storage.settings.volume).to.equal(0.25);
      expect(a.state.lastSynced).to.equal(undefined);

      await a.run([
        SyncTestUtils_mockDispatch((ds) => updateState(ds, [lb<IState>().p("nosync").record(false)], "online")),
      ]);
      await a.run([Thunk_sync2({ force: true })]);
      const user = await serverUser(di);
      expect(user.storage.settings.isPublicProfile).to.equal(true);
      expect(user.storage.settings.volume).to.equal(0.25);
      expect(a.state.lastSynced?.tempUserId).to.equal(a.state.storage.tempUserId);
    });

    it("uploads a record a wrong baseline hides once the baseline is a day old", async () => {
      const { mockReducer: a, di, log } = await SyncTestUtils_initTheAppAndRecordWorkout("web_123");
      const template = a.state.storage.history[0];
      const id = template.id + 1000;
      const hidden = { ...template, id, startTime: id, endTime: id + 100, date: new Date(id).toISOString() };
      await a.run([
        SyncTestUtils_mockDispatch((ds) =>
          updateState(
            ds,
            [
              lb<IState>().p("nosync").record(true),
              lb<IState>()
                .p("storage")
                .p("history")
                .recordModify((h) => [hidden, ...h]),
            ],
            "add offline"
          )
        ),
      ]);
      await a.run([
        SyncTestUtils_mockDispatch((ds) =>
          updateState(
            ds,
            [
              lb<IState>().pi("lastSynced").p("versions").record(ObjectUtils_clone(a.state.storage._versions)),
              lb<IState>().p("nosync").record(false),
            ],
            "wrong baseline, online"
          )
        ),
      ]);

      await a.run([
        { type: "UpdateSettings", lensRecording: lb<ISettings>().p("isPublicProfile").record(true), desc: "settings" },
      ]);
      await a.run([Thunk_sync2({ force: true })]);
      expect((await serverUser(di)).storage.settings.isPublicProfile).to.equal(true);
      expect(
        (await di.dynamo.scan<IHistoryRecord>({ tableName: userTableNames.prod.historyRecords })).map((r) => r.id)
      ).to.not.include(id);

      clock += SyncBaseline_MAX_AGE_MS;
      const fetchesBefore = log.logs.filter((l) => l === "Fetch: Merging update").length;
      await a.run([Thunk_sync2({ force: true })]);
      expect(log.logs.filter((l) => l === "Fetch: Merging update").length).to.be.greaterThan(fetchesBefore);
      expect(
        (await di.dynamo.scan<IHistoryRecord>({ tableName: userTableNames.prod.historyRecords })).map((r) => r.id)
      ).to.include(id);
      expect(a.state.storage.history.map((r) => r.id)).to.include(id);
    });
  });
});
