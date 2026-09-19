/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import JWT from "jsonwebtoken";
import { APIGatewayProxyEvent } from "aws-lambda";
import { getRawHandler, IHandler } from "../lambda";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { userTableNames } from "../lambda/dao/userDao";
import { eventsTableNames } from "../lambda/dao/eventDao";
import { freeUsersTableNames } from "../lambda/dao/freeUserDao";
import { LftS3Buckets } from "../lambda/dao/buckets";
import { Storage_fillVersions, Storage_getDefault } from "../src/models/storage";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { getLatestMigrationVersion } from "../src/migrations/migrations";
import { IHistoryRecord, IProgram, IStorage } from "../src/types";
import { ICollectionVersions } from "../src/models/versionTracker";

const STORED_WORKOUTS = 25;
const HISTORY_LIMIT = 20;
const STALE_ORIGINAL_ID = 1;

function syncEvent(userId: string, body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: { Cookie: `session=${JWT.sign({ userId }, "cookieSecret")}` },
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/api/sync2",
    pathParameters: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {} as any,
    resource: "",
  };
}

describe("/api/sync2 dirty branch", () => {
  let di: IMockDI;
  let handler: IHandler;
  let userId: string;
  let storage: IStorage;

  beforeEach(() => {
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = { configure: () => undefined };
    storage = { ...Storage_getDefault(), originalId: 999, currentProgramId: "current" };
    userId = storage.tempUserId;
    di = buildMockDi(new MockLogUtil(), async () => new Response());
    handler = getRawHandler(() => di);
  });

  async function seed(args: { workouts: number; version?: string }): Promise<void> {
    const { history: _history, programs: _programs, stats: _stats, ...partial } = storage;
    await di.dynamo.put({
      tableName: userTableNames.prod.users,
      item: {
        id: userId,
        email: "test@example.com",
        createdAt: 1,
        storage: { ...partial, version: args.version ?? partial.version },
      },
    });
    await di.dynamo.put({
      tableName: freeUsersTableNames.prod.freeUsers,
      item: { id: userId, key: "test-sub-key", isClaimed: true, expires: Date.now() + 1e9 },
    });
    await di.dynamo.put({
      tableName: userTableNames.prod.programs,
      item: { ...basicBeginnerProgram, id: "current", userId },
    });
    for (let id = 1; id <= args.workouts; id += 1) {
      await di.dynamo.put({ tableName: userTableNames.prod.historyRecords, item: { id, userId, entries: [] } });
    }
  }

  async function pull(body: Record<string, unknown>): Promise<any> {
    const result = await handler(
      syncEvent(userId, { deviceId: "ios_b", historylimit: HISTORY_LIMIT, timestamp: 5, ...body }),
      {}
    );
    return JSON.parse(result.body);
  }

  function emptyUpdate(): Record<string, unknown> {
    return { version: getLatestMigrationVersion(), originalId: STALE_ORIGINAL_ID };
  }

  async function snapshots(): Promise<IStorage[]> {
    const bucket = LftS3Buckets.storages;
    const keys = await di.s3.listObjects({ bucket, prefix: `storages/${userId}/` });
    const objects = await Promise.all(keys.map((key) => di.s3.getObject({ bucket, key })));
    return objects.map((o) => JSON.parse(o!.toString()));
  }

  function mergeSnapshotEvents(): unknown[] {
    const events = Object.values(di.dynamo.data[eventsTableNames.prod.events] || {}) as { type?: string }[];
    return events.filter((e) => e.type === "mergesnapshot");
  }

  it("an empty pull reads only the newest records and leaves no snapshot", async () => {
    await seed({ workouts: STORED_WORKOUTS });
    const query = sinon.spy(di.dynamo, "query");
    const json = await pull({ storageUpdate: emptyUpdate() });
    const historyQueries = query.getCalls().filter((c) => c.args[0].tableName === userTableNames.prod.historyRecords);
    expect(historyQueries.map((c) => c.args[0].limit)).to.eql([HISTORY_LIMIT]);
    expect(json.type).to.equal("dirty");
    const newestIds = Array.from({ length: HISTORY_LIMIT }, (_, i) => STORED_WORKOUTS - i);
    expect(json.storage.history.map((r: { id: number }) => r.id)).to.eql(newestIds);
    expect(await snapshots()).to.eql([]);
    expect(mergeSnapshotEvents()).to.eql([]);
  });

  it("an empty pull from a watch returns the current program and no history or stats", async () => {
    await seed({ workouts: STORED_WORKOUTS });
    const json = await pull({ storageUpdate: emptyUpdate(), isWatch: true });
    expect(json.type).to.equal("dirty");
    expect(json.storage.history).to.eql([]);
    expect(json.storage.stats).to.eql({ weight: {}, length: {}, percentage: {} });
    expect(json.storage.programs.map((p: { id: string }) => p.id)).to.eql(["current"]);
    expect(await snapshots()).to.eql([]);
  });

  it("a pull that carries a change still snapshots the whole history", async () => {
    await seed({ workouts: STORED_WORKOUTS });
    const json = await pull({
      storageUpdate: {
        ...emptyUpdate(),
        storage: { settings: { volume: 0.25 } },
        versions: { settings: { volume: Date.now() } },
      },
    });
    expect(json.type).to.equal("dirty");
    expect(json.storage.settings.volume).to.equal(0.25);
    expect(json.storage.history.length).to.equal(HISTORY_LIMIT);
    const stored = await snapshots();
    expect(stored.length).to.equal(1);
    expect(stored[0].history.length).to.equal(STORED_WORKOUTS);
    expect(mergeSnapshotEvents().length).to.equal(1);
  });

  it("/api/history?ids returns only the caller's own records", async () => {
    await seed({ workouts: 3 });
    await di.dynamo.put({ tableName: userTableNames.prod.historyRecords, item: { id: 7, userId: "someone-else" } });
    const result = await handler(
      {
        ...syncEvent(userId, {}),
        httpMethod: "GET",
        path: "/api/history",
        body: null,
        queryStringParameters: { ids: "3,7,1" },
      },
      {}
    );
    expect(result.statusCode).to.equal(200);
    expect(
      JSON.parse(result.body)
        .history.map((r: { id: number }) => r.id)
        .sort()
    ).to.eql([1, 3]);
  });

  it("/api/history?ids rejects an admin userid with a wrong key", async () => {
    await seed({ workouts: 1 });
    const result = await handler(
      {
        ...syncEvent(userId, {}),
        httpMethod: "GET",
        path: "/api/history",
        body: null,
        queryStringParameters: { ids: "1", userid: "someone-else", key: "wrong" },
      },
      {}
    );
    expect(result.statusCode).to.equal(401);
  });

  it("an empty pull that triggers a migration still snapshots", async () => {
    await seed({ workouts: 0, version: "20260903120000" });
    const json = await pull({ storageUpdate: emptyUpdate() });
    expect(json.type).to.equal("dirty");
    expect(json.storage.version).to.equal(getLatestMigrationVersion());
    expect((await snapshots()).length).to.equal(1);
    expect(mergeSnapshotEvents().length).to.equal(1);
  });

  describe("a merge that changes nothing", () => {
    const RECORD_ID = 1;
    let record: IHistoryRecord;
    let program: IProgram;
    let versioned: IStorage;

    function versionOf(collection: "history" | "programs", id: string | number): unknown {
      return (versioned._versions?.[collection] as ICollectionVersions).items?.[id];
    }

    async function seedVersioned(): Promise<void> {
      record = {
        vtype: "history_record",
        id: RECORD_ID,
        date: new Date(RECORD_ID).toISOString(),
        programId: "current",
        programName: "Program",
        day: 1,
        dayName: "Day",
        entries: [],
        startTime: RECORD_ID,
        endTime: RECORD_ID + 1000,
      };
      const { shortDescription: _short, ...withoutShortDescription } = basicBeginnerProgram;
      program = { ...withoutShortDescription, id: "current", clonedAt: 42 };
      versioned = Storage_fillVersions(
        { ...storage, history: [record], programs: [program], currentProgramId: "current" },
        "ios_a"
      );
      const { history: _h, programs: _p, stats: _s, ...partial } = versioned;
      await di.dynamo.put({
        tableName: userTableNames.prod.users,
        item: { id: userId, email: "test@example.com", createdAt: 1, storage: partial },
      });
      await di.dynamo.put({
        tableName: freeUsersTableNames.prod.freeUsers,
        item: { id: userId, key: "test-sub-key", isClaimed: true, expires: Date.now() + 1e9 },
      });
      await di.dynamo.put({ tableName: userTableNames.prod.programs, item: { ...program, userId } });
      await di.dynamo.put({ tableName: userTableNames.prod.historyRecords, item: { ...record, userId } });
    }

    async function registerOtherDevice(): Promise<void> {
      const result = await handler(
        {
          ...syncEvent(userId, { deviceId: "and_other", platform: "android", token: "t2" }),
          path: "/api/pushtoken",
        },
        {}
      );
      expect(result.statusCode).to.equal(200);
    }

    function resendRecord(): Record<string, unknown> {
      return {
        ...emptyUpdate(),
        storage: { history: [record] },
        versions: { history: { items: { [RECORD_ID]: versionOf("history", RECORD_ID) } } },
      };
    }

    it("re-sending a stored record writes nothing, snapshots nothing and pushes nobody", async () => {
      await seedVersioned();
      await registerOtherDevice();
      const put = sinon.spy(di.dynamo, "put");
      const batchPut = sinon.spy(di.dynamo, "batchPut");
      const json = await pull({ storageUpdate: resendRecord() });
      expect(json.type).to.equal("dirty");
      expect(json.storage.originalId).to.equal(999);
      expect(put.getCalls().map((c) => c.args[0].tableName)).to.not.include(userTableNames.prod.users);
      expect(batchPut.getCalls().map((c) => c.args[0].items.length)).to.eql([]);
      expect(await snapshots()).to.eql([]);
      expect(mergeSnapshotEvents()).to.eql([]);
      expect(di.sns.published).to.eql([]);
    });

    it("re-sending a record whose row is missing puts it back", async () => {
      await seedVersioned();
      await di.dynamo.remove({ tableName: userTableNames.prod.historyRecords, key: { userId, id: RECORD_ID } });
      const batchPut = sinon.spy(di.dynamo, "batchPut");
      await pull({ storageUpdate: resendRecord() });
      const historyPuts = batchPut.getCalls().filter((c) => c.args[0].tableName === userTableNames.prod.historyRecords);
      expect(historyPuts.map((c) => c.args[0].items.map((i) => i.id))).to.eql([[RECORD_ID]]);
    });

    it("a program upload is written even when its versions are unchanged", async () => {
      await seedVersioned();
      const put = sinon.spy(di.dynamo, "put");
      const batchPut = sinon.spy(di.dynamo, "batchPut");
      const json = await pull({
        storageUpdate: {
          ...emptyUpdate(),
          storage: { programs: [{ ...program, shortDescription: "added later" }] },
          versions: { programs: { items: { [program.clonedAt!]: versionOf("programs", program.clonedAt!) } } },
        },
      });
      expect(json.type).to.equal("dirty");
      expect(put.getCalls().map((c) => c.args[0].tableName)).to.include(userTableNames.prod.users);
      const programPuts = batchPut.getCalls().filter((c) => c.args[0].tableName === userTableNames.prod.programs);
      expect(programPuts.length).to.equal(1);
      const stored = di.dynamo.data[userTableNames.prod.programs] as Record<string, { shortDescription?: string }>;
      expect(Object.values(stored).map((p) => p.shortDescription)).to.eql(["added later"]);
    });

    it("a re-sent tombstone still deletes the surviving row", async () => {
      await seedVersioned();
      const versions = versioned._versions!;
      const history = versions.history as ICollectionVersions;
      const withTombstone = {
        ...versions,
        history: { ...history, items: {}, deleted: { [RECORD_ID]: history.items?.[RECORD_ID] } },
      };
      const { history: _h, programs: _p, stats: _s, ...partial } = versioned;
      await di.dynamo.put({
        tableName: userTableNames.prod.users,
        item: {
          id: userId,
          email: "test@example.com",
          createdAt: 1,
          storage: { ...partial, _versions: withTombstone },
        },
      });
      const json = await pull({
        storageUpdate: {
          ...emptyUpdate(),
          storage: { history: [] },
          versions: { history: { items: {}, deleted: { [RECORD_ID]: history.items?.[RECORD_ID] } } },
        },
      });
      expect(json.type).to.equal("dirty");
      const rows = await di.dynamo.query({
        tableName: userTableNames.prod.historyRecords,
        expression: "#userId = :userId",
        attrs: { "#userId": "userId" },
        values: { ":userId": userId },
      });
      expect(rows).to.eql([]);
    });

    it("a re-sent record still collapses two stored progress entries to one", async () => {
      await seedVersioned();
      const { history: _h, programs: _p, stats: _s, ...partial } = versioned;
      const progress = (startTime: number): Record<string, unknown> => ({
        ...record,
        vtype: "progress",
        id: 0,
        startTime,
        entries: [],
      });
      await di.dynamo.put({
        tableName: userTableNames.prod.users,
        item: {
          id: userId,
          email: "test@example.com",
          createdAt: 1,
          storage: { ...partial, progress: [progress(10), progress(20)] },
        },
      });
      const put = sinon.spy(di.dynamo, "put");
      const json = await pull({ storageUpdate: resendRecord() });
      expect(json.type).to.equal("dirty");
      expect(json.storage.progress.map((p: { startTime: number }) => p.startTime)).to.eql([20]);
      expect(put.getCalls().map((c) => c.args[0].tableName)).to.include(userTableNames.prod.users);
    });

    it("writes the user row only after the record writes, and pushes the other device", async () => {
      await seedVersioned();
      await registerOtherDevice();
      const order: string[] = [];
      sinon.stub(di.dynamo, "batchPut").callsFake(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push("batchPut");
      });
      const put = di.dynamo.put.bind(di.dynamo);
      sinon.stub(di.dynamo, "put").callsFake(async (args) => {
        if (args.tableName === userTableNames.prod.users) {
          order.push("userRow");
        }
        return put(args);
      });
      const changed = { ...record, notes: "edited" };
      await pull({
        storageUpdate: {
          ...emptyUpdate(),
          storage: { history: [changed] },
          versions: { history: { items: { [RECORD_ID]: Date.now() + 10_000 } } },
        },
      });
      expect(order.indexOf("batchPut")).to.be.lessThan(order.indexOf("userRow"));
      expect(di.sns.published.length).to.equal(1);
    });

    it("a failed record write leaves the row's versions behind, so the retry writes", async () => {
      await seedVersioned();
      const stub = sinon.stub(di.dynamo, "batchPut");
      stub.onFirstCall().rejects(new Error("ProvisionedThroughputExceededException"));
      stub.callThrough();
      const changed = { ...record, notes: "edited" };
      const update = {
        ...emptyUpdate(),
        storage: { history: [changed] },
        versions: { history: { items: { [RECORD_ID]: Date.now() + 10_000 } } },
      };
      const first = await handler(
        syncEvent(userId, { deviceId: "ios_b", historylimit: HISTORY_LIMIT, timestamp: 5, storageUpdate: update }),
        {}
      );
      expect(first.statusCode).to.not.equal(200);
      const rowBefore = (await di.dynamo.get<{ storage: IStorage }>({
        tableName: userTableNames.prod.users,
        key: { id: userId },
      }))!;
      expect((rowBefore.storage._versions?.history as ICollectionVersions).items?.[RECORD_ID]).to.eql(
        versionOf("history", RECORD_ID)
      );
      const json = await pull({ storageUpdate: update });
      expect(json.type).to.equal("dirty");
      const stored = di.dynamo.data[userTableNames.prod.historyRecords] as Record<string, { notes?: string }>;
      expect(Object.values(stored).map((r) => r.notes)).to.eql(["edited"]);
    });

    it("a program upload saves a revision, and a history re-send does not", async () => {
      await seedVersioned();
      await pull({ storageUpdate: resendRecord() });
      const bucket = LftS3Buckets.programs;
      expect((await di.s3.listObjects({ bucket, prefix: `programs/${userId}/` })).length).to.equal(0);
      await pull({
        storageUpdate: {
          ...emptyUpdate(),
          storage: { programs: [program] },
          versions: { programs: { items: { [program.clonedAt!]: versionOf("programs", program.clonedAt!) } } },
        },
      });
      expect((await di.s3.listObjects({ bucket, prefix: `programs/${userId}/` })).length).to.equal(1);
    });
  });
});
